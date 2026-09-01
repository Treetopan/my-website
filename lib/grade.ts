"use client";

/**
 * Client side of server grading. The browser never holds the answer key — it
 * asks about one position at a time, and gets back a verdict plus the correct
 * answer for that position only.
 */

import { auth } from "@/lib/firebase";
import type { Question } from "@/lib/curriculum";
import type { Response, Reveal } from "@/lib/questions";

export type Verdict = {
  /** 0 to 1. Only the proximity kinds land between the two. */
  score: number;
  /** Whether it counts as right — for streaks, elimination and the tally. */
  correct: boolean;
  /** The correct answer. Only ever arrives after grading. */
  reveal: Reveal;
  /** What was submitted. For a bot turn the server chooses this. */
  response: Response;
  /** The score a proximity answer has to clear to count as right. */
  pass: number;
  /**
   * Why it was wrong, in a line or two. Present only on a miss, and only when
   * something is on file — the client pairs it with its own read of how the
   * answer missed, which it works out locally from the reveal.
   */
  steps?: string[];
};

export type OpenedSession = {
  sessionId: string;
  /** Question ids in play order, fixed by the server. */
  order: string[];
  /**
   * The questions themselves, in the same order. Generated questions are
   * invented server-side and exist nowhere in this bundle, so the text has to
   * travel with the order — only the answers stay behind.
   */
  questions: Question[];
};

/**
 * A grading request that did not come back with a verdict.
 *
 * It carries the status, because not every refusal means the same thing and
 * two of them must never end a session:
 *
 *   · **409 Already answered.** The position may only be claimed once, and the
 *     claim is atomic — so a 409 is proof that an *earlier* submission won it.
 *     Two taps on Answer, a retry over a slow connection, a second tab: one
 *     request gets the verdict and the other gets this. There is nothing wrong
 *     and nothing to report; the verdict for that position is already on its
 *     way to the screen, or already on it.
 *
 *   · **429 Too many at once.** The limiter turns the request away *before*
 *     the position is claimed, so nothing has been spent. The same answer can
 *     simply be sent again once the window rolls.
 *
 *   · **401 Not signed in.** The endpoints verify a Firebase ID token now, so
 *     a stale one is refused. Like a 429 this lands before the position is
 *     claimed and nothing is spent, which is what makes `send` below free to
 *     mint a fresh token and go again. A 401 that reaches a caller here has
 *     already survived that retry and means the player really is signed out.
 *
 * Everything else — a session that expired, a question with no answer on file,
 * a malformed request — is a session that genuinely cannot continue.
 */
export class GradeError extends Error {
  /** The HTTP status behind it, or 0 when the request never landed at all. */
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }

  /** The position was already graded, so an earlier submission of ours won. */
  get alreadyAnswered(): boolean {
    return this.status === 409;
  }

  /** Refused before anything was claimed, so sending it again is legitimate. */
  get retryable(): boolean {
    return this.status === 429;
  }

  /** No usable sign-in, after `send` already tried a fresh token. */
  get unauthenticated(): boolean {
    return this.status === 401;
  }
}

/**
 * The headers a game request carries: the body's type, and who is sending it.
 *
 * `getIdToken` returns the token already in hand and refreshes it by itself
 * when it is near expiry, so this is a field read almost every time and a
 * round trip to Firebase rarely. `force` demands a new one regardless.
 */
async function authorized(force = false): Promise<HeadersInit> {
  const user = auth.currentUser;

  // Every screen that plays sits behind `<RequireAuth>`, so this is not a
  // player mid-game; it is a caller reaching this module without an account.
  // Said here rather than after a round trip that would say the same thing.
  if (!user) throw new GradeError("Sign in to play.", 401);

  return {
    "content-type": "application/json",
    authorization: `Bearer ${await user.getIdToken(force)}`,
  };
}

/**
 * Posts to a game endpoint as the signed-in player, once — and again with a
 * freshly minted token if the first attempt was refused for want of one.
 *
 * The retry earns its place because a token lasts about an hour and so does a
 * session, so a long game can straddle the moment one goes stale; and because
 * a client whose clock runs slow will happily send a token the server has
 * already expired, the SDK seeing no reason to refresh it. Both end a game
 * that had nothing wrong with it. One forced refresh costs a round trip and
 * turns that into a game that carries on.
 *
 * Sending twice is safe because the token check sits ahead of the claim: a 401
 * spends no position and no budget, exactly as a 429 spends none. Every other
 * status is handed back as it came and retried by nobody — a 409 in particular,
 * which means an earlier attempt of ours already won that position.
 */
async function send(path: string, body: Record<string, unknown>) {
  const payload = JSON.stringify(body);

  const res = await fetch(path, {
    method: "POST",
    headers: await authorized(),
    body: payload,
  });
  if (res.status !== 401) return res;

  return fetch(path, {
    method: "POST",
    headers: await authorized(true),
    body: payload,
  });
}

export async function openSession(
  /** Every subunit the player picked. The server deals the game across them. */
  subunitIds: string[],
  length?: number,
  options: {
    /**
     * Ask only for questions answered on a grid or a scale. A duel is settled
     * on which answer was closer, so it can only be played on those.
     */
    spatial?: boolean;
  } = {},
): Promise<OpenedSession> {
  const res = await send("/api/session", {
    subunitIds,
    length,
    spatial: options.spatial,
  });

  if (!res.ok) {
    throw new GradeError(
      await reason(res, "Could not start the game."),
      res.status,
    );
  }
  return (await res.json()) as OpenedSession;
}

/**
 * Grades the question at `position`. A blank response is a timeout, and still
 * burns that position's single grading — the server will not answer twice.
 */
export async function grade(
  sessionId: string,
  position: number,
  response: Response,
): Promise<Verdict> {
  return post<Verdict>({ sessionId, position, response });
}

/** Asks the server to play a bot's turn at the given accuracy. */
export async function gradeBot(
  sessionId: string,
  position: number,
  accuracy: number,
): Promise<Verdict> {
  return post<Verdict>({ sessionId, position, bot: accuracy });
}

/** One seat at a mirrored question: a person's answer, or a bot to roll. */
export type Seat = { uid: string; response?: Response; bot?: number };

export type TableVerdict = {
  results: Record<
    string,
    { score: number; correct: boolean; response: Response }
  >;
  /** The right answer, said once for the whole table. */
  reveal: Reveal;
  pass: number;
  /** Said once for the whole table too, and only when somebody missed. */
  steps?: string[];
};

/**
 * Grades everybody's answer to the same question, in one request.
 *
 * One request rather than one per player, because the position may only be
 * graded once: the answer comes back with the verdict, and a second call
 * would be somebody asking about a question whose answer is already on the
 * screen. The host sends this after everybody has committed.
 */
export async function gradeTable(
  sessionId: string,
  position: number,
  table: Seat[],
): Promise<TableVerdict> {
  return post<TableVerdict>({ sessionId, position, table });
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const res = await send("/api/answer", body);

  if (!res.ok) {
    throw new GradeError(await reason(res, "Could not grade that."), res.status);
  }
  return (await res.json()) as T;
}

async function reason(res: Response_, fallback: string) {
  const body = await res.json().catch(() => null);
  return (body?.error as string | undefined) ?? fallback;
}

/** The DOM Response, shadowed here by the answer-shaped one from questions.ts. */
type Response_ = globalThis.Response;
