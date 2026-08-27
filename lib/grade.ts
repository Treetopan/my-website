"use client";

/**
 * Client side of server grading. The browser never holds the answer key — it
 * asks about one position at a time, and gets back a verdict plus the correct
 * answer for that position only.
 */

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

export class GradeError extends Error {}

export async function openSession(
  subunitId: string,
  length?: number,
  options: {
    /**
     * Ask only for questions answered on a grid or a scale. A duel is settled
     * on which answer was closer, so it can only be played on those.
     */
    spatial?: boolean;
  } = {},
): Promise<OpenedSession> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subunitId, length, spatial: options.spatial }),
  });

  if (!res.ok) throw new GradeError(await reason(res, "Could not start the game."));
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
  const res = await fetch("/api/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new GradeError(await reason(res, "Could not grade that."));
  return (await res.json()) as T;
}

async function reason(res: Response_, fallback: string) {
  const body = await res.json().catch(() => null);
  return (body?.error as string | undefined) ?? fallback;
}

/** The DOM Response, shadowed here by the answer-shaped one from questions.ts. */
type Response_ = globalThis.Response;
