import { DIFFICULTY, difficultyOfQuestion } from "./curriculum";
import type { Question, QuestionKind } from "./questions";

/**
 * How long a question is worth, in milliseconds.
 *
 * Two costs, added, because they are two different things and only one of them
 * was ever priced. A subunit's difficulty is a claim about how long the
 * question takes to *think* about — that is what the library advertises and
 * what the racer prices idling against. It says nothing about how long the
 * answer takes to *enter*, and those come apart badly at the edges:
 *
 *   an integral        hard to think about, one expression to type
 *   a 2×2 matrix       medium to think about, four boxes and three tabs
 *
 * A clock built on difficulty alone gives both the same 22 or 30 seconds, and
 * the matrix is the one that runs out — which is the whole reason this exists.
 * So the budget is the topic's par plus a cost for the shape of the answer.
 */

/**
 * What entering an answer of each kind costs, before anything is thought
 * about. Not a guess at the reasoning — that is already in the par — but at
 * the mechanical business of getting the answer into the page.
 *
 * `choice` is zero: the answers are on the screen and picking one is a click.
 * `slider` is cheap because there is no target to hit exactly, only a place to
 * drag to. `fill` and `point` are a value to produce and check. `line` is two
 * handles, each placed.
 *
 * The two that scale are the two that can grow: an ordering is a drag per
 * item, and a matrix is a tab-and-type per cell. The per-cell number is about
 * the typing rather than the arithmetic, which is already priced in the par —
 * measured against the real generators, where 58% of matrix questions ask for
 * four cells, 28% for two and 14% for three.
 */
const FIXED: Record<QuestionKind, number> = {
  choice: 0,
  slider: 2_000,
  fill: 3_000,
  point: 3_000,
  line: 5_000,
  order: 0,
  matrix: 3_000,
};

/** Per item beyond the first, for an ordering. */
const PER_ITEM = 1_500;

/** Per cell of a result matrix, for the tab-and-type it costs. */
const PER_CELL = 2_500;

export function inputMs(question: Question): number {
  const fixed = FIXED[question.kind];

  if (question.kind === "order") {
    return fixed + PER_ITEM * Math.max(0, question.items.length - 1);
  }
  if (question.kind === "matrix") {
    return fixed + PER_CELL * question.rows * question.cols;
  }
  return fixed;
}

/** The topic's own par: what the library advertises for this subunit. */
export function parMs(question: Question): number {
  return DIFFICULTY[difficultyOfQuestion(question.id)].seconds * 1000;
}

/** Par plus input cost, before any pressure is applied. */
export function budgetMs(question: Question): number {
  return parMs(question) + inputMs(question);
}

/**
 * The floor and ceiling on a turn, whatever the budget works out to.
 *
 * The ceiling is what makes a long turn other people's problem rather than
 * only the answerer's: at a table, everybody waits. The floor stops the
 * ratchet from turning a question into a reflex test.
 *
 * Both are guard rails rather than working parts. Nothing in the curriculum
 * reaches the ceiling at full pressure — the largest budget is a hard topic
 * with a four-cell matrix, at 43s — so the ceiling only ever bites if the
 * costs above are raised later, which is exactly when a guard rail should.
 */
export const TURN_FLOOR_MS = 8_000;
export const TURN_CEILING_MS = 45_000;

/**
 * How much of the budget a turn actually gets, as the round wears on.
 *
 * Last One Standing gets its tension from the clock closing in, and a budget
 * that only ever reflected the question would lose that. So the ratchet stays
 * — as a multiplier rather than the flat two seconds a lap it used to take,
 * because two seconds off a 35-second matrix and two off a 15-second recall
 * question are not the same squeeze.
 */
const PRESSURE_STEP = 0.08;
const PRESSURE_FLOOR = 0.55;

export function pressureFor(lap: number): number {
  return Math.max(PRESSURE_FLOOR, 1 - PRESSURE_STEP * Math.max(0, lap));
}

/** What one turn on this question is worth, this many laps in. */
export function turnMs(question: Question, lap: number): number {
  const wanted = budgetMs(question) * pressureFor(lap);
  return Math.round(
    Math.min(TURN_CEILING_MS, Math.max(TURN_FLOOR_MS, wanted)),
  );
}

/**
 * How long the reveal holds before the table moves on.
 *
 * Scaled off the same budget rather than off the length of the explanation,
 * even though the explanation is the thing being read. Two reasons: the
 * coaching is longest exactly where the budget is largest, so the two track
 * each other anyway; and measuring the text would make the reveal jitter from
 * question to question inside one subunit, which reads as the game being
 * inconsistent rather than as it being considerate.
 *
 * The floor is the number that matters. It used to be a flat 1900ms for every
 * question in the game, which is not long enough to find your own answer on
 * the screen, see which cells went red and read a sentence under them.
 */
const REVEAL_SHARE = 0.12;
export const REVEAL_FLOOR_MS = 2_500;
export const REVEAL_CEILING_MS = 5_000;

export function revealMs(question: Question): number {
  return Math.round(
    Math.min(
      REVEAL_CEILING_MS,
      Math.max(REVEAL_FLOOR_MS, budgetMs(question) * REVEAL_SHARE),
    ),
  );
}

/** "35 seconds" — the budget said the way it is announced to a player. */
export function saySeconds(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}
