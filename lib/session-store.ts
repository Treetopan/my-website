import "server-only";

/**
 * Grading sessions.
 *
 * Taking the answer key off the client stops anyone reading all 75 answers out
 * of the bundle. On its own though, a grading endpoint is just a slower way to
 * ask the same question: post a guess, see if it was right, repeat. Sessions
 * close that — each position in a session can be graded exactly once, and the
 * correct option comes back only with that one verdict.
 *
 * IMPORTANT: this lives in process memory. That is correct for `next dev` and
 * for a single long-lived Node server. On a platform that runs several
 * instances (Vercel's default), a session can land on an instance that has
 * never heard of it, and grading fails closed with 404. Before deploying that
 * way, move `sessions` behind a shared store — Redis, or a `sessions/{uid}`
 * node written with the Admin SDK.
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

const sessions = new Map<string, Session>();

/** Drop expired sessions, and the oldest ones if the map is being flooded. */
function sweep(now: number) {
  for (const [id, s] of sessions) {
    if (now - s.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }

  if (sessions.size > MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt,
    );
    for (const [id] of oldest.slice(0, sessions.size - MAX_SESSIONS)) {
      sessions.delete(id);
    }
  }
}

export function createSession(
  subunitId: string,
  order: string[],
  now: number,
): Session {
  sweep(now);

  const session: Session = {
    id: crypto.randomUUID(),
    subunitId,
    createdAt: now,
    order,
    graded: new Set(),
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string, now: number): Session | null {
  const s = sessions.get(id);
  if (!s) return null;

  if (now - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }
  return s;
}

/**
 * Minting sessions is the one thing left that a determined cheat can loop on,
 * so it is rate limited per caller. Generous enough that a real student
 * replaying a subunit never notices.
 */
const MINT_WINDOW_MS = 60_000;
const MINT_LIMIT = 30;

const mints = new Map<string, number[]>();

export function mintAllowed(key: string, now: number): boolean {
  const recent = (mints.get(key) ?? []).filter((t) => now - t < MINT_WINDOW_MS);

  if (recent.length >= MINT_LIMIT) {
    mints.set(key, recent);
    return false;
  }

  recent.push(now);
  mints.set(key, recent);

  // Opportunistic cleanup so this map cannot grow without bound.
  if (mints.size > 10_000) {
    for (const [k, times] of mints) {
      if (times.every((t) => now - t >= MINT_WINDOW_MS)) mints.delete(k);
    }
  }

  return true;
}
