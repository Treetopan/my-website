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
): Promise<OpenedSession> {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subunitId, length }),
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
  return post({ sessionId, position, response });
}

/** Asks the server to play a bot's turn at the given accuracy. */
export async function gradeBot(
  sessionId: string,
  position: number,
  accuracy: number,
): Promise<Verdict> {
  return post({ sessionId, position, bot: accuracy });
}

async function post(body: Record<string, unknown>): Promise<Verdict> {
  const res = await fetch("/api/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new GradeError(await reason(res, "Could not grade that."));
  return (await res.json()) as Verdict;
}

async function reason(res: Response_, fallback: string) {
  const body = await res.json().catch(() => null);
  return (body?.error as string | undefined) ?? fallback;
}

/** The DOM Response, shadowed here by the answer-shaped one from questions.ts. */
type Response_ = globalThis.Response;
