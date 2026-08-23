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

export type Session = {
  id: string;
  subunitId: string;
  createdAt: number;
  /**
   * The question order, fixed by the server when the session opens. Grading
   * is by POSITION in this list rather than by question id, which is what
   * lets a turn-based game legitimately come round to the same question
   * again without handing anyone a second free look at the answer.
   */
  order: string[];
  /** Positions already graded. A second attempt at one is refused. */
  graded: Set<number>;
};

const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_SESSIONS = 5_000;

const MINT_WINDOW_MS = 60_000;
const MINT_LIMIT = 30;

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
  /** Marks a position graded. False if it was already claimed. */
  claim(id: string, position: number): Promise<boolean>;
  mintAllowed(key: string, now: number): Promise<boolean>;
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
    if (!s || s.graded.has(position)) return false;
    s.graded.add(position);
    return true;
  },

  async mintAllowed(key, now) {
    const recent = (mints.get(key) ?? []).filter(
      (t) => now - t < MINT_WINDOW_MS,
    );
    if (recent.length >= MINT_LIMIT) {
      mints.set(key, recent);
      return false;
    }
    recent.push(now);
    mints.set(key, recent);

    if (mints.size > 10_000) {
      for (const [k, times] of mints) {
        if (times.every((t) => now - t >= MINT_WINDOW_MS)) mints.delete(k);
      }
    }
    return true;
  },
};

// ── Realtime Database ──

/** What a session looks like on the wire. Sets do not survive JSON. */
type StoredSession = {
  subunitId: string;
  createdAt: number;
  order: string[];
  /** Position → true. An object rather than an array so claims can be
   *  written independently without read-modify-write on the whole list. */
  graded?: Record<string, boolean>;
};

function rtdbStore(db: NonNullable<ReturnType<typeof adminDb>>): Store {
  const sessionRef = (id: string) => db.ref(`sessions/${id}`);

  return {
    async create(session) {
      const stored: StoredSession = {
        subunitId: session.subunitId,
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
        subunitId: stored.subunitId,
        createdAt: stored.createdAt,
        order: stored.order ?? [],
        graded: new Set(Object.keys(stored.graded ?? {}).map(Number)),
      };
    },

    async claim(id, position) {
      // A transaction on the single position, not on the session. Two requests
      // racing for the same position both read "not graded" if this is a read
      // then a write; the transaction makes exactly one of them win.
      const result = await sessionRef(id)
        .child(`graded/${position}`)
        .transaction((current) => (current ? undefined : true));

      return result.committed && result.snapshot.val() === true;
    },

    async mintAllowed(key, now) {
      // Bucketed by window so the counter expires on its own rather than
      // needing a sweep: last window's bucket is simply never read again.
      const bucket = Math.floor(now / MINT_WINDOW_MS);
      const ref = db.ref(`mints/${bucket}/${encodeKey(key)}`);

      const result = await ref.transaction((count: number | null) =>
        (count ?? 0) >= MINT_LIMIT ? undefined : (count ?? 0) + 1,
      );

      if (result.committed) {
        // Old buckets are cleared opportunistically, cheaply, and only by the
        // request that happens to roll over into a new one.
        if (now % MINT_WINDOW_MS < 1000) {
          db.ref(`mints/${bucket - 2}`).remove().catch(() => {});
        }
        return true;
      }
      return false;
    },
  };
}

/** RTDB keys cannot contain . $ # [ ] / — an IP or header value might. */
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
  subunitId: string,
  order: string[],
  now: number,
): Promise<Session> {
  const session: Session = {
    id: crypto.randomUUID(),
    subunitId,
    createdAt: now,
    order,
    graded: new Set(),
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
 * Claims a position for grading. False means it was already graded, and the
 * caller must refuse rather than grade it again — this is the single point
 * where the one-verdict-per-position guarantee is enforced.
 */
export async function claimPosition(
  id: string,
  position: number,
): Promise<boolean> {
  return backing().claim(id, position);
}

/**
 * Minting sessions is the one thing left that a determined cheat can loop on,
 * so it is rate limited per caller. Generous enough that a real student
 * replaying a subunit never notices.
 */
export async function mintAllowed(key: string, now: number): Promise<boolean> {
  return backing().mintAllowed(key, now);
}
