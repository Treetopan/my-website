/**
 * What went wrong, said back to the student.
 *
 * Two halves make up the feedback on a missed question, and they are split by
 * where the cheapest place to work them out is:
 *
 *   1. The *diagnosis* — how this particular answer missed. That is a function
 *      of the reveal and the response, both of which the client already holds
 *      the moment a question is graded, so it is computed here, on the client,
 *      and costs nothing to send, store or broadcast. This file.
 *
 *   2. The *method* — the rule the question was testing. That is a property of
 *      the topic rather than of the attempt, so it lives once, server-side, in
 *      `coaching.server.ts`, and rides back on the verdict only when the answer
 *      was wrong.
 *
 * Nothing here is persisted. A missed question is explained from what is
 * already on the screen plus one short string, and then it is gone — the same
 * bargain generated questions already make, where the seed is the storage.
 *
 * Nothing here can leak an answer either: it only ever runs on a reveal the
 * server has already sent.
 */

import type { Question } from "./curriculum";
import {
  distance,
  inversions,
  lineThrough,
  readNumber,
  type Response,
  type Reveal,
} from "./questions";

/** Rounded for display: two decimals is finer than any grid the games draw. */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "3 too far right", "2 too low" — a signed error said as a direction. */
function drift(error: number, more: string, less: string): string | null {
  const size = round(Math.abs(error));
  if (size === 0) return null;
  return `${size} too ${error > 0 ? more : less}`;
}

function list(parts: (string | null)[]): string {
  const live = parts.filter((p): p is string => !!p);
  return live.join(" and ");
}

/**
 * One sentence naming how the answer missed, or null when there is nothing to
 * say that the reveal has not already said.
 *
 * Null is the honest result more often than it looks. On a multiple-choice
 * question the right option and the picked one are both already lit up on the
 * screen; restating them as prose is noise. The diagnosis earns its place only
 * where the shape of the error is not visible — a sign, a reciprocal, a factor
 * of ten, a point in the wrong quadrant.
 */
export function diagnose(
  question: Question,
  reveal: Reveal,
  response: Response,
): string | null {
  if (response.kind !== reveal.kind) return null;

  switch (reveal.kind) {
    case "choice":
      // The options are on the screen, marked. Anything said here is a repeat.
      return null;

    case "fill": {
      if (response.kind !== "fill") return null;
      const given = readNumber(response.text);
      const target = readNumber(reveal.text);
      if (given === null || target === null) {
        // Not a number on one side or the other — an expression, a form. The
        // two are shown side by side already, and guessing at how an algebraic
        // answer went wrong is exactly the sort of confident nonsense that
        // makes feedback worth less than none.
        return null;
      }
      return numeric(given, target);
    }

    case "slider": {
      if (response.kind !== "slider" || response.value === null) return null;
      const off = drift(response.value - reveal.value, "high", "low");
      return off ? `You were ${off}.` : null;
    }

    case "point": {
      if (response.kind !== "point" || !response.at) return null;
      const gap = round(distance(response.at, reveal.at));
      if (gap === 0) return null;

      const where = list([
        drift(response.at.x - reveal.at.x, "far right", "far left"),
        drift(response.at.y - reveal.at.y, "high", "low"),
      ]);

      const quadrant =
        Math.sign(response.at.x) !== Math.sign(reveal.at.x) ||
        Math.sign(response.at.y) !== Math.sign(reveal.at.y);

      const lead = `You placed it ${gap} away — ${where}.`;
      return quadrant && gap > 1 ? `${lead} That is a different quadrant.` : lead;
    }

    case "line": {
      if (response.kind !== "line" || !response.through) return null;
      const drawn = lineThrough(response.through[0], response.through[1]);
      if (!drawn) return "A vertical line is not a function, so it cannot be graded.";

      const slopeOff = round(drawn.slope - reveal.slope);
      const shiftOff = round(drawn.intercept - reveal.intercept);

      if (slopeOff === 0 && shiftOff === 0) return null;
      if (slopeOff === 0) {
        return `The slope was right — the line just sits ${Math.abs(shiftOff)} too ${
          shiftOff > 0 ? "high" : "low"
        }.`;
      }
      if (shiftOff === 0) {
        return `It crosses in the right place — the slope is ${Math.abs(slopeOff)} too ${
          slopeOff > 0 ? "steep" : "shallow"
        }.`;
      }
      if (Math.sign(drawn.slope) !== Math.sign(reveal.slope)) {
        return "The line slopes the wrong way.";
      }
      return `Slope ${Math.abs(slopeOff)} out, intercept ${Math.abs(shiftOff)} out.`;
    }

    case "order": {
      if (response.kind !== "order" || !response.order) return null;
      if (response.order.length !== reveal.order.length) return null;
      return ordering(response.order, reveal.order);
    }
  }
}

/**
 * How one sequence missed another.
 *
 * The count of misplaced pairs is the score, so saying it back is the least
 * this can do. What is worth adding is *where* it went wrong, because the two
 * ends are the parts a student can check without having the rest right: a
 * proof begins at the given and finishes at the claim, a construction begins
 * with the compass and finishes with the straightedge, a hierarchy begins at
 * the most general. An ordering that gets both ends right and stumbles in the
 * middle is different news from one that starts in the wrong place.
 *
 * The wording stays neutral about what is being ordered. These questions are
 * mostly proofs and mostly say so in the prompt, but "the given" means nothing
 * when the sequence is four families of quadrilateral.
 */
function ordering(given: number[], correct: number[]): string | null {
  const wrong = inversions(given, correct);
  if (wrong === 0) return null;

  const backwards = given.every((item, at) => item === correct[correct.length - 1 - at]);
  if (backwards) return "That is the sequence exactly backwards.";

  const pairs = `${wrong} pair${wrong === 1 ? "" : "s"} ${
    wrong === 1 ? "is" : "are"
  } the wrong way round.`;

  const startedWrong = given[0] !== correct[0];
  const endedWrong = given[given.length - 1] !== correct[correct.length - 1];

  if (startedWrong && endedWrong) return `${pairs} Neither end is in its place.`;
  if (startedWrong) return `${pairs} It does not begin where it should.`;
  if (endedWrong) return `${pairs} It does not end where it should.`;
  return `${pairs} Both ends are right; the middle is where it slipped.`;
}

/**
 * How one number missed another.
 *
 * Ordered by how much the shape of the error tells the student. A sign slip, a
 * flipped fraction and a factor of ten are three different mistakes with three
 * different fixes, and each one is worth naming; "you were 0.9 under" is what
 * is left when none of them fit.
 */
function numeric(given: number, target: number): string | null {
  if (given === target) return null;

  if (target !== 0 && given === -target) {
    return "Right size, wrong sign — check where the minus went.";
  }
  if (target !== 0 && given !== 0 && Math.abs(given - 1 / target) < 1e-9) {
    return "That is the reciprocal of the answer — the fraction is upside down.";
  }

  if (target !== 0) {
    const ratio = given / target;
    for (const factor of [10, 100, 1000]) {
      if (Math.abs(ratio - factor) < 1e-9) return `Out by a factor of ${factor}.`;
      if (Math.abs(ratio - 1 / factor) < 1e-9) {
        return `Out by a factor of ${factor} the other way.`;
      }
    }
    if (Math.abs(ratio - 2) < 1e-9) return "Twice the answer — something was double-counted.";
    if (Math.abs(ratio - 0.5) < 1e-9) return "Half the answer — something was halved twice.";
    if (Math.abs(given - target * target) < 1e-9) return "That is the answer squared.";
    if (Math.abs(given * given - target) < 1e-9) return "That is the square root of the answer.";
  }

  const off = drift(given - target, "big", "small");
  return off ? `You were ${off}.` : null;
}
