import { DIFFICULTY, type Difficulty } from "@/lib/curriculum";

/**
 * Progression replaces the leaderboard: you compete with your own record
 * rather than a ranked list. Two mechanics only — a level fed by XP, and a
 * daily streak fed by showing up.
 */

export type Progress = {
  xp: number;
  /** ISO date (UTC) of the last day a session was completed. */
  lastPlayedDate: string | null;
  streak: number;
  longestStreak: number;
  played: number;
  won: number;
};

export const EMPTY_PROGRESS: Progress = {
  xp: 0,
  lastPlayedDate: null,
  streak: 0,
  longestStreak: 0,
  played: 0,
  won: 0,
};

// ─── Levels ──────────────────────────────────────────────
// Level L requires 100·L XP to clear, so cumulative XP to *reach* level L is
// 50·L·(L−1). The curve stays gentle early and stretches later, which keeps a
// first session feeling like it moved something.

export function levelFor(xp: number): number {
  let level = 1;
  while (xpToReach(level + 1) <= xp) level++;
  return level;
}

export function xpToReach(level: number): number {
  return 50 * level * (level - 1);
}

/** Where the player sits inside their current level, for the progress bar. */
export function levelProgress(xp: number) {
  const level = levelFor(xp);
  const floor = xpToReach(level);
  const ceiling = xpToReach(level + 1);
  const into = xp - floor;
  const span = ceiling - floor;

  return {
    level,
    into,
    span,
    remaining: span - into,
    fraction: span === 0 ? 0 : into / span,
  };
}

// ─── XP earned in a session ──────────────────────────────

export type AnswerRecord = {
  difficulty: Difficulty;
  correct: boolean;
  /**
   * How much of the answer was right, 0–1. Exact questions are 0 or 1; the
   * proximity kinds — a slider, a placed point, a drawn line — land between.
   */
  score: number;
  /**
   * How quickly it was answered, 0–1. The table measures the clock still
   * remaining; the race, which has no clock, measures how far inside par.
   */
  speed: number;
};

/**
 * An answer pays the subunit's base XP scaled by how right it was, plus up to
 * half again for speed. Wrong answers pay nothing — but they never subtract,
 * because a student who guesses on a hard subunit should still be better off
 * than one who quits.
 *
 * Part marks are paid on the same curve rather than only on a pass, so a point
 * placed one unit out earns most of the XP and a point placed in the wrong
 * quadrant earns almost none. Paying only on the pass would make the two
 * identical, which is exactly the distinction proximity grading exists to draw.
 * The speed bonus still rides on the scaled amount, so being fast and nearly
 * right cannot out-earn being right.
 */
export function xpForAnswer({ difficulty, score, speed }: AnswerRecord): number {
  const earned = Math.max(0, Math.min(1, score));
  if (earned === 0) return 0;

  const base = DIFFICULTY[difficulty].xp * earned;
  const bonus = base * 0.5 * Math.max(0, Math.min(1, speed));
  return Math.round(base + bonus);
}

export function xpForSession(answers: AnswerRecord[], won: boolean): number {
  const earned = answers.reduce((sum, a) => sum + xpForAnswer(a), 0);
  // Winning is worth a flat bonus rather than a multiplier, so a win on an
  // easy subunit can't out-earn real work on a hard one.
  return earned + (won ? 50 : 0);
}

// ─── Daily streak ────────────────────────────────────────

/** UTC date key, so a streak can't be gamed by changing timezone. */
export function dateKey(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/** Whole days from one date key to another. Negative if `b` is the earlier. */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Applies a completed session to a player's progress. Same day is a no-op for
 * the streak; the next day extends it; any longer gap starts over at one.
 */
export function applySession(
  prev: Progress,
  opts: { xp: number; won: boolean; at: Date },
): Progress {
  const today = dateKey(opts.at);
  const last = prev.lastPlayedDate;

  let streak: number;
  if (!last) streak = 1;
  else {
    const gap = daysBetween(last, today);
    if (gap === 0) streak = Math.max(1, prev.streak);
    else if (gap === 1) streak = prev.streak + 1;
    else streak = 1;
  }

  return {
    xp: prev.xp + opts.xp,
    lastPlayedDate: today,
    streak,
    longestStreak: Math.max(prev.longestStreak, streak),
    played: prev.played + 1,
    won: prev.won + (opts.won ? 1 : 0),
  };
}

/**
 * A streak is only *live* today or yesterday — after that it is history, and
 * the UI should say so rather than showing a number the player has lost.
 */
export function streakIsLive(prev: Progress, at: Date): boolean {
  if (!prev.lastPlayedDate) return false;
  return daysBetween(prev.lastPlayedDate, dateKey(at)) <= 1;
}
