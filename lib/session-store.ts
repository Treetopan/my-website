import "server-only";

import { adminDb } from "./firebase-admin";

/**
 * Grading sessions.
 *
 * Taking the answer key off the client stops anyone reading all the answers
 * out of the bundle. On its own though, a grading endpoint is just a slower
 * way to ask the same question: post a guess, see if it was right, repeat.
 * Sessions close that — each position in a session can be graded exactly once,
 * and the correct answer comes back only with that one verdict.
 *
 * That guarantee is the reason this cannot be stateless. Whatever you hand the
 * client, the client can replay; "graded exactly once" has to be recorded
 * somewhere the server trusts and every instance can see. So sessions live in
 * the Realtime Database, written with the Admin SDK, under a node the rules
 * deny to everybody — the Admin SDK bypasses rules, so nothing else can reach
 * it. See `sessions` in `database.rules.json`.
 *
 * With no service account configured this falls back to process memory, which
 * is correct for `next dev` and for a single long-lived Node server, and wrong
 * anywhere that runs several instances: a session minted on one instance is
 * unknown to the next, and grading fails closed with 404. The fallback says so
 * loudly at startup rather than failing mysteriously under load.
 */

/**
 * A verdict as it went to the client: the whole response body, kept verbatim.
 *
 * Verbatim is the point. Re-serving one is a copy of an answer already given,
 * never a second derivation of it — so a repeat request cannot re-run a
 * generator, cannot re-roll a bot's answer, and cannot disagree with the
 * verdict the first request got.
 *
 * Field for field rather than byte for byte: the database returns an object's
 * keys in its own order, so a re-served verdict can serialise differently from
 * the one that was sent first. Every value is the same and clients read by
 * key, so this matters only to anybody comparing two responses as strings.
 */
export type StoredVerdict = Record<string, unknown>;

/**
 * What asking for a position produced.
 *
 * `claimed` is the right to grade it, and exactly one caller ever gets it.
 * Everybody else gets `verdict` — the answer the winner recorded, or null
 * while the winner is still working it out.
 */
export type Claim =
  | { claimed: true }
  | { claimed: false; verdict: StoredVerdict | null };

export type Session = {
  id: string;
  /** Every subunit the session may serve from. A game mixes a few of them. */
  subunitIds: string[];
  createdAt: number;
  /**
   * The question order, fixed by the server when the session opens. Grading
   * is by POSITION in this list rather than by question id, which is what
   * lets a turn-based game legitimately come round to the same question
   * again without handing anyone a second free look at the answer.
   */
  order: string[];
  /**
   * Positions already spoken for, and what came of them. A position maps to
   * its verdict once one exists, and to null in the window between the claim
   * being won and the grading finishing.
   */
  graded: Map<number, StoredVerdict | null>;
};

const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_SESSIONS = 5_000;

const WINDOW_MS = 60_000;

/**
 * Two budgets on the same limiter, because the two endpoints are asked for at
 * very different rates and must not share a counter — a burst of answering
 * cannot be allowed to lock a class out of starting a game.
 *
 * Both are sized for a room rather than for a person, and that is the whole
 * story. The key is the caller's IP; a school is one IP; so thirty students
 * on the same wifi are one caller here. The numbers that read as generous for
 * an individual are the numbers that lock out the back half of a class the
 * first time they all press play together — which is exactly what 30 sessions
 * a minute did.
 *
 * These are ceilings on abuse, not on use. Set them where a plausible room
 * never reaches them and a script still does:
 *
 *   · 300 sessions/min — a class of thirty starting, restarting and picking
 *     new subunits for a whole period, without any of them waiting.
 *   · 2000 answers/min — the same class answering flat out, plus duels, where
 *     one request grades a whole table.
 *
 * The real fix is not a bigger number. It is keying on the authenticated uid
 * instead of the IP, so the limit applies per student and a school stops being
 * one caller. That needs `/api/answer` to verify an ID token, which it does
 * not do today — grading is gated by holding a live session and by the
 * one-claim-per-position rule, neither of which says who you are. Deliberately
 * not done now, and written down here so it is not argued out again: the IP
 * key is a stopgap with a known failure mode, and the failure mode is a
 * classroom.
 *
 * Every refusal is logged — see `refused` — because both numbers are guesses
 * about a room and the only way to learn one is wrong is to watch it fire.
 */
const MINT_LIMIT = 300;
const GRADE_LIMIT = 2000;

// ─── The two backings ────────────────────────────────────

/**
 * What a store has to do. Deliberately small: claiming a position is one
 * operation rather than a read followed by a write, because between those two
 * a second request for the same position can slip through and be graded twice
 * — which is the whole thing sessions exist to prevent.
 */
type Store = {
  create(session: Session): Promise<void>;
  get(id: string, now: number): Promise<Session | null>;
  /**
   * Takes the right to grade a position, or reports what is already there.
   * One operation rather than a read then a write, because between those two
   * a second request for the same position slips through and is graded twice.
   */
  claim(id: string, position: number): Promise<Claim>;
  /** Records the verdict against a claim this caller won. */
  remember(id: string, position: number, verdict: StoredVerdict): Promise<void>;
  /** Hands back a claim that produced no verdict, so it is not burnt. */
  release(id: string, position: number): Promise<void>;
  /** The verdict stored for a position, or null while there is none. */
  recall(id: string, position: number): Promise<StoredVerdict | null>;
  /** Whether `key` is still under `limit` calls in the current window. */
  allow(key: string, now: number, limit: number): Promise<boolean>;
};

// ── In-process ──

const sessions = new Map<string, Session>();
const mints = new Map<string, number[]>();

const memoryStore: Store = {
  async create(session) {
    for (const [id, s] of sessions) {
      if (session.createdAt - s.createdAt > SESSION_TTL_MS) sessions.delete(id);
    }
    if (sessions.size > MAX_SESSIONS) {
      const oldest = [...sessions.entries()].sort(
        (a, b) => a[1].createdAt - b[1].createdAt,
      );
      for (const [id] of oldest.slice(0, sessions.size - MAX_SESSIONS)) {
        sessions.delete(id);
      }
    }
    sessions.set(session.id, session);
  },

  async get(id, now) {
    const s = sessions.get(id);
    if (!s) return null;
    if (now - s.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
      return null;
    }
    return s;
  },

  async claim(id, position) {
    const s = sessions.get(id);
    // No session is not a claim to give. The route has already fetched it and
    // answered 404, so this only happens if it expired in between.
    if (!s) return { claimed: false, verdict: null };

    if (s.graded.has(position)) {
      return { claimed: false, verdict: s.graded.get(position) ?? null };
    }

    // Single-threaded, so between the check and the set nothing else runs.
    s.graded.set(position, null);
    return { claimed: true };
  },

  async remember(id, position, verdict) {
    sessions.get(id)?.graded.set(position, verdict);
  },

  async release(id, position) {
    sessions.get(id)?.graded.delete(position);
  },

  async recall(id, position) {
    return sessions.get(id)?.graded.get(position) ?? null;
  },

  async allow(key, now, limit) {
    const recent = (mints.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= limit) {
      mints.set(key, recent);
      return false;
    }
    recent.push(now);
    mints.set(key, recent);

    if (mints.size > 10_000) {
      for (const [k, times] of mints) {
        if (times.every((t) => now - t >= WINDOW_MS)) mints.delete(k);
      }
    }
    return true;
  },
};

// ── Realtime Database ──

/** What a session looks like on the wire. Sets do not survive JSON. */
type StoredSession = {
  subunitIds: string[];
  createdAt: number;
  order: string[];
  /**
   * Position → the claim. `true` while the caller who won it is still
   * grading, and the verdict itself once there is one — the same node, so
   * taking the claim and reading what came of it are the one operation.
   *
   * An object rather than an array so a claim can be written on its own
   * without read-modify-write over the whole list.
   */
  graded?: Record<string, true | StoredVerdict>;
};

function rtdbStore(db: NonNullable<ReturnType<typeof adminDb>>): Store {
  const sessionRef = (id: string) => db.ref(`sessions/${id}`);

  return {
    async create(session) {
      const stored: StoredSession = {
        subunitIds: session.subunitIds,
        createdAt: session.createdAt,
        order: session.order,
      };
      await sessionRef(session.id).set(stored);
    },

    async get(id, now) {
      const snapshot = await sessionRef(id).get();
      const stored = snapshot.val() as StoredSession | null;
      if (!stored) return null;

      if (now - stored.createdAt > SESSION_TTL_MS) {
        await sessionRef(id).remove();
        return null;
      }

      return {
        id,
        subunitIds: stored.subunitIds ?? [],
        createdAt: stored.createdAt,
        order: stored.order ?? [],
        graded: new Map(
          Object.entries(stored.graded ?? {}).map(([at, held]) => [
            Number(at),
            held === true ? null : held,
          ]),
        ),
      };
    },

    async claim(id, position) {
      // A transaction on the single position, not on the session. Two requests
      // racing for the same position both read "not graded" if this is a read
      // then a write; the transaction makes exactly one of them win.
      //
      // Aborting leaves the current value in the snapshot, which is how a
      // loser learns what the winner did without a second read: `true` if the
      // winner is still grading, the verdict itself once it has finished.
      const result = await sessionRef(id)
        .child(`graded/${position}`)
        .transaction((current) => (current ? undefined : true));

      if (result.committed) return { claimed: true };
      return { claimed: false, verdict: verdictOf(result.snapshot.val()) };
    },

    async remember(id, position, verdict) {
      // Through JSON on the way in, because the database refuses `undefined`
      // and an optional field that was never set is exactly that. What is
      // stored is then what the client was sent, key for key.
      await sessionRef(id)
        .child(`graded/${position}`)
        .set(JSON.parse(JSON.stringify(verdict)));
    },

    async release(id, position) {
      await sessionRef(id).child(`graded/${position}`).remove();
    },

    async recall(id, position) {
      const snapshot = await sessionRef(id).child(`graded/${position}`).get();
      return verdictOf(snapshot.val());
    },

    async allow(key, now, limit) {
      // Bucketed by window so the counter expires on its own rather than
      // needing a sweep: last window's bucket is simply never read again.
      const bucket = Math.floor(now / WINDOW_MS);
      const ref = db.ref(`mints/${bucket}/${encodeKey(key)}`);

      const result = await ref.transaction((count: number | null) =>
        (count ?? 0) >= limit ? undefined : (count ?? 0) + 1,
      );

      if (result.committed) {
        // Old buckets are cleared opportunistically, cheaply, and only by the
        // request that happens to roll over into a new one.
        if (now % WINDOW_MS < 1000) {
          db.ref(`mints/${bucket - 2}`).remove().catch(() => {});
        }
        return true;
      }
      return false;
    },
  };
}

/**
 * A stored position read back: the verdict if one was recorded, null if the
 * node holds only the bare claim or nothing at all.
 */
function verdictOf(value: unknown): StoredVerdict | null {
  if (!value || value === true || typeof value !== "object") return null;
  return value as StoredVerdict;
}

/** RTDB keys cannot contain . $ # [ ] / — an IP or header value might. The
 *  `grade:` prefix a grading counter carries survives this untouched. */
function encodeKey(key: string): string {
  return key.replace(/[.$#[\]/]/g, "-");
}

// ─── Choosing one ────────────────────────────────────────

let store: Store | undefined;

function backing(): Store {
  if (store) return store;

  const db = adminDb();
  if (db) {
    store = rtdbStore(db);
  } else {
    console.warn(
      "[sessions] No FIREBASE_SERVICE_ACCOUNT — sessions are in process memory. " +
        "Fine for local dev and a single server; on a multi-instance deploy a " +
        "session can land on an instance that has never heard of it and grading " +
        "will fail with 404.",
    );
    store = memoryStore;
  }
  return store;
}

/** Whether sessions are shared across instances. Surfaced for diagnostics. */
export function sessionsAreShared(): boolean {
  return adminDb() !== null;
}

// ─── The API the routes use ──────────────────────────────

export async function createSession(
  subunitIds: string[],
  order: string[],
  now: number,
): Promise<Session> {
  const session: Session = {
    id: crypto.randomUUID(),
    subunitIds,
    createdAt: now,
    order,
    graded: new Map(),
  };

  await backing().create(session);
  return session;
}

export async function getSession(
  id: string,
  now: number,
): Promise<Session | null> {
  return backing().get(id, now);
}

/**
 * Claims a position for grading.
 *
 * This is the single point where "graded exactly once" is enforced. Exactly
 * one caller is told `claimed`, and only that caller may go on to grade. A
 * caller told otherwise must never grade: it either serves the verdict handed
 * back with the refusal, or waits for one with `awaitVerdict`.
 */
export async function claimPosition(
  id: string,
  position: number,
): Promise<Claim> {
  return backing().claim(id, position);
}

/**
 * Records what a position was graded to, so the next request for it is a read.
 *
 * Written after the verdict has been built and before it is sent, which is the
 * order that matters: a request arriving in between finds the bare claim and
 * waits, rather than finding nothing and being turned away.
 */
export async function rememberVerdict(
  id: string,
  position: number,
  verdict: StoredVerdict,
): Promise<void> {
  return backing().remember(id, position, verdict);
}

/**
 * Hands a claim back, for a caller that won one and then found it had nothing
 * to grade. Without this, a question that cannot be resolved would silently
 * spend the player's single attempt at it on a data problem of ours.
 */
export async function releasePosition(
  id: string,
  position: number,
): Promise<void> {
  return backing().release(id, position);
}

/**
 * How long to wait for the caller holding a claim to record its verdict, and
 * how often to look.
 *
 * The gap being waited out is one grading — resolving a generator and scoring
 * an answer — plus the write that follows it. That is milliseconds, so the
 * first looks are close together and the rest back off; almost every wait ends
 * on the first or second. The tail is there for a peer on a cold instance, and
 * it is bounded because a request that hangs on this is worse than one that
 * gives a definite answer.
 */
const RECALL_WAITS_MS = [20, 40, 80, 150, 250, 400, 500, 500, 500, 500];

/**
 * The verdict for a position somebody else has claimed, waited for.
 *
 * Null means the holder never recorded one inside the budget — it died between
 * claiming and grading, or it is slower than we are prepared to hold a request
 * open for. The caller then answers 409, which is what this endpoint has
 * always said and what every client already knows how to take.
 */
export async function awaitVerdict(
  id: string,
  position: number,
): Promise<StoredVerdict | null> {
  const store = backing();

  for (const wait of RECALL_WAITS_MS) {
    await new Promise((done) => setTimeout(done, wait));
    const verdict = await store.recall(id, position);
    if (verdict) return verdict;
  }

  return null;
}

/**
 * Says so out loud when a limiter turns a request away.
 *
 * A student who hits one of these sees "wait a minute" and, in all likelihood,
 * stops playing rather than reporting it. The ceilings are guesses about how
 * busy a room gets, so a refusal is either a script — worth knowing about — or
 * a guess that was wrong, which is worth knowing about sooner. Names the limit
 * it broke and the key it was counted under, because with an IP key that key
 * is often a whole school and that is the tell.
 */
function refused(what: string, key: string, limit: number): void {
  console.warn(
    `[rate] refused ${what} for ${key}: over ${limit} per ${WINDOW_MS / 1000}s. ` +
      "Counted per IP, so this may be a whole school rather than one person — " +
      "if it is, raise the limit in session-store.ts rather than leaving them stuck.",
  );
}

/**
 * Minting sessions is the one thing left that a determined cheat can loop on,
 * so it is rate limited per caller. Sized so that a class all starting at once
 * never reaches it — see the constants above for why that is the bar.
 */
export async function mintAllowed(key: string, now: number): Promise<boolean> {
  const ok = await backing().allow(key, now, MINT_LIMIT);
  if (!ok) refused("a session", key, MINT_LIMIT);
  return ok;
}

/**
 * The same limiter over grading, on a counter of its own.
 *
 * Grading is already the narrow door — it needs a live session and each
 * position in one can be claimed exactly once, so there is no oracle to loop
 * on here the way there is on minting. This is about load rather than cheating:
 * an endpoint that resolves a generator and writes a transaction per call
 * should not be free to hammer, and a caller who is hammering it is not playing.
 */
export async function gradeAllowed(key: string, now: number): Promise<boolean> {
  const ok = await backing().allow(`grade:${key}`, now, GRADE_LIMIT);
  if (!ok) refused("a grading", key, GRADE_LIMIT);
  return ok;
}
