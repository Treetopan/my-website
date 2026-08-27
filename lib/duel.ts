import type { RoomPlayer } from "@/lib/rtdb";

/**
 * The rule of the mirror duel, kept out of the component because it is the
 * game rather than a detail of the screen.
 *
 * Everybody answers the same question at the same time, and nobody sees
 * anything until everybody has committed. Two lines settle the round:
 *
 *   You score what your answer was worth.
 *   The closest answer also takes the gap between it and the next best.
 *
 * That is the whole thing, and it is deliberately built on the score the
 * grader already produces. Proximity grading means "wrong" is not one thing —
 * a point placed a unit out and a point placed in the wrong quadrant are
 * different answers — and the duel turns that difference into the stake. Being
 * within a unit stops being good enough the moment the other player was within
 * a half.
 *
 * Why the gap rather than a fixed prize for winning the round: a fixed prize
 * pays the same for scraping it and for winning by a mile, which is the thing
 * that makes a race feel arbitrary. The gap is what you actually took off
 * them, so the payout is the margin, and a dead heat pays nobody — you cannot
 * profit from a round you did not win outright.
 *
 * There is no speed term here on purpose. The clock stops you sitting on a
 * question forever, and pace still earns XP the way it does everywhere else,
 * but the duel itself is decided on precision alone. Otherwise the fastest
 * sloppy answer beats the careful right one, which is the habit the whole
 * proximity model exists to break.
 */

export type Standing = { uid: string; score: number };

export type Settlement = {
  /** Who was strictly closest, or null when nobody was. */
  closestUid: string | null;
  /** How far clear of the next best they finished. Zero on a dead heat. */
  gap: number;
};

/**
 * Works out who took the round and by how much.
 *
 * Two cases pay nobody, and they are different: a dead heat, where two
 * answers were exactly as good as each other, and a round where the best
 * answer was worth nothing at all. Neither should hand out a gap — the first
 * because nobody was closer, the second because "least wrong" is not a thing
 * worth points.
 */
export function settle(standings: Standing[]): Settlement {
  // A duel of one is not a duel: there is nobody to be closer than, so there
  // is no gap to take. This happens in a room somebody walked out of.
  if (standings.length < 2) return { closestUid: null, gap: 0 };

  const [best, next] = [...standings].sort((a, b) => b.score - a.score);

  if (best.score <= 0) return { closestUid: null, gap: 0 };
  if (best.score <= next.score) return { closestUid: null, gap: 0 };

  // Rounded, because the gap is a subtraction of two floats and 0.9 - 0.7 is
  // famously 0.20000000000000007. It is written to the database and shown to
  // both players, and four places is finer than the grader can tell apart.
  return { closestUid: best.uid, gap: tidy(best.score - next.score) };
}

function tidy(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * What one answer is worth in points: what it earned on its own, plus the gap
 * if it took one. Scaled by the subunit's XP so a duel on a hard subunit moves
 * the board further than a duel on an easy one, exactly as elsewhere.
 */
export function pointsFor(score: number, gap: number, perQuestion: number): number {
  return Math.round(perQuestion * (Math.max(0, score) + Math.max(0, gap)));
}

/**
 * Who won the duel, or null if the two of them finished level.
 *
 * A drawn duel has no winner rather than two, because the win bonus is a
 * bonus for beating somebody.
 */
export function champion(players: Record<string, RoomPlayer>): string | null {
  const ranked = Object.entries(players).sort((a, b) => b[1].score - a[1].score);
  if (ranked.length === 0) return null;
  if (ranked.length > 1 && ranked[0][1].score === ranked[1][1].score) return null;
  return ranked[0][0];
}

/** Everyone who has locked an answer in on the question showing now. */
export function lockedIn(committed: Record<string, true> | null | undefined) {
  return new Set(Object.keys(committed ?? {}));
}
