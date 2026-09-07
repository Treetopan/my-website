import "server-only";

import {
  PASS,
  distance,
  frameOf,
  inversions,
  isBlank,
  lineThrough,
  normalise,
  proximity,
  readNumber,
  type Point,
  type Question,
  type Response,
  type Reveal,
} from "./questions";

/**
 * The answer to a question, and how close counts.
 *
 * This never leaves the server. The scoring curve in `questions.ts` is public —
 * knowing that a slider pays full marks within 2% tells you nothing — but the
 * target it measures from is the answer itself.
 */
export type Answer =
  | { kind: "choice"; index: number }
  | {
      kind: "fill";
      /** Every form of the answer that should be accepted, unnormalised. */
      accept: string[];
      /** The one to show on the reveal. */
      show: string;
      /** Numeric answers also match by value, within this. */
      tolerance?: number;
    }
  | { kind: "slider"; value: number; full: number; zero: number }
  | { kind: "point"; at: Point; full: number; zero: number }
  | {
      kind: "line";
      slope: number;
      intercept: number;
      /** Error is measured as vertical distance at the edges of the grid. */
      span: number;
      full: number;
      zero: number;
    }
  | {
      kind: "order";
      /** Item indices in the correct sequence. */
      order: number[];
      /** Error is the number of pairs the response puts the wrong way round. */
      full: number;
      zero: number;
    }
  | {
      kind: "matrix";
      /** One per cell of the result, row-major. Each graded like a `fill`. */
      cells: { accept: string[]; show: string }[];
      /** Numeric cells also match by value, within this. */
      tolerance?: number;
    };

export type Graded = { score: number; correct: boolean; reveal: Reveal };

/**
 * Grades one response.
 *
 * A blank response scores zero without being compared to anything — otherwise
 * a slider left at its default would collect partial credit for a question the
 * student never engaged with, and worse, "submit nothing repeatedly" would
 * become a way to probe where the target is.
 */
export function grade(answer: Answer, response: Response): Graded {
  const reveal = revealOf(answer);

  if (response.kind !== answer.kind) {
    return { score: 0, correct: false, reveal };
  }
  if (isBlank(response)) {
    return { score: 0, correct: false, reveal };
  }

  const score = scoreOf(answer, response);
  return { score, correct: score >= PASS, reveal };
}

function scoreOf(answer: Answer, response: Response): number {
  switch (answer.kind) {
    case "choice":
      return response.kind === "choice" && response.choice === answer.index
        ? 1
        : 0;

    case "fill":
      if (response.kind !== "fill") return 0;
      return matches(answer.accept, answer.tolerance, response.text) ? 1 : 0;

    case "slider": {
      if (response.kind !== "slider" || response.value === null) return 0;
      return proximity(response.value - answer.value, answer.full, answer.zero);
    }

    case "point": {
      if (response.kind !== "point" || !response.at) return 0;
      return proximity(distance(response.at, answer.at), answer.full, answer.zero);
    }

    case "line": {
      if (response.kind !== "line" || !response.through) return 0;
      const drawn = lineThrough(response.through[0], response.through[1]);
      // A vertical line is not a function, so it cannot be the answer and
      // cannot be scored against one.
      if (!drawn) return 0;

      // Measured as vertical distance at both edges of the grid rather than by
      // comparing slope and intercept directly. A small slope error and a small
      // intercept error are not equally wrong — the slope one grows with the
      // grid — and this weighs them the way the drawing actually looks.
      const at = (x: number) =>
        Math.abs(
          drawn.slope * x + drawn.intercept - (answer.slope * x + answer.intercept),
        );
      const error = Math.max(at(-answer.span), at(answer.span));
      return proximity(error, answer.full, answer.zero);
    }

    case "order": {
      if (response.kind !== "order" || !response.order) return 0;
      // A response of the wrong length is not a worse ordering, it is not an
      // ordering of this question at all.
      if (response.order.length !== answer.order.length) return 0;
      return proximity(
        inversions(response.order, answer.order),
        answer.full,
        answer.zero,
      );
    }

    case "matrix": {
      if (response.kind !== "matrix" || !response.cells) return 0;
      // A grid of the wrong size is not a worse answer to this question, it is
      // an answer to a different one — the same rule an ordering follows.
      if (response.cells.length !== answer.cells.length) return 0;

      const right = answer.cells.filter((cell, i) =>
        matches(cell.accept, answer.tolerance, response.cells![i]),
      ).length;

      // The one score in the game that is a count rather than a distance. It
      // lands on the same 0–1 scale, so `PASS` reads as three of four.
      return right / answer.cells.length;
    }
  }
}

/**
 * Whether a typed answer matches one of the forms on file.
 *
 * Shared by `fill` and by every cell of a `matrix`, which is the point: a
 * matrix entry is a typed answer, and a student who writes 1/2 where the key
 * says 0.5 has got the entry right in both places or in neither.
 */
function matches(
  accept: string[],
  tolerance: number | undefined,
  text: string,
): boolean {
  const given = normalise(text);
  if (accept.some((form) => normalise(form) === given)) return true;

  // Numeric equivalence catches the forms the accept list did not think of —
  // 0.5 against 1/2, or 6.0 against 6.
  const asNumber = readNumber(text);
  if (asNumber === null) return false;

  const slack = tolerance ?? 0;
  return accept.some((form) => {
    const target = readNumber(form);
    return target !== null && Math.abs(target - asNumber) <= slack;
  });
}

function revealOf(answer: Answer): Reveal {
  switch (answer.kind) {
    case "choice":
      return { kind: "choice", index: answer.index };
    case "fill":
      return { kind: "fill", text: answer.show };
    case "slider":
      return { kind: "slider", value: answer.value };
    case "point":
      return { kind: "point", at: answer.at };
    case "line":
      return { kind: "line", slope: answer.slope, intercept: answer.intercept };
    case "order":
      return { kind: "order", order: answer.order };
    case "matrix":
      return { kind: "matrix", cells: answer.cells.map((c) => c.show) };
  }
}

/**
 * Rolls a miss that lands near the answer and still counts as a miss.
 *
 * A miss used to be thrown one-and-a-bit to two-and-a-bit times past the
 * radius where the score reaches zero, so every bot miss scored exactly
 * nothing. That kept a 70% bot at 70% — which was the point, and is a real
 * constraint — but it also made the bot the one thing on the screen that never
 * *nearly* got it. In a duel that is the whole mechanic gone: "the closer
 * answer takes the gap" needs two answers at two different distances, and a
 * player who is either exactly right or off the map never supplies one.
 *
 * So a miss now aims for the band between the error that would have passed and
 * the error that is worth nothing. It cannot pass — that is what keeps a bot's
 * stated accuracy honest — but it scores something, which is what a person's
 * miss does.
 *
 * It is a loop rather than a formula because none of these kinds land where
 * they were aimed: a point snaps to whole units and is held inside the window,
 * a slider snaps to its step, a line has both endpoints rounded. Any of those
 * can pull an intended miss close enough to pass, so the throw is measured
 * after the fact, retried from a fresh direction when it lands too close, and
 * the furthest of the attempts is taken if none of them clear the bar — which
 * is what a window too small to hold a near miss falls back to.
 */
function missing<T>(
  full: number,
  zero: number,
  /** Builds a candidate from a distance. The caller picks the direction. */
  attempt: (size: number) => T,
  /** How far the candidate actually landed, once the kind has had its way. */
  errorOf: (made: T) => number,
): T {
  /** The error at which a proximity score falls to exactly the pass mark. */
  const edge = zero - PASS * (zero - full);

  let best: T | null = null;
  let furthest = -1;

  for (let tries = 0; tries < 14; tries++) {
    const size =
      tries < 10
        ? // Inside the band: short of scoring nothing, past scoring a pass.
          edge + (zero - edge) * (0.08 + Math.random() * 0.92)
        : // The old long throw, for a window with no room for a near miss.
          zero * (1.2 + Math.random());

    const made = attempt(size);
    const error = errorOf(made);
    if (proximity(error, full, zero) < PASS) return made;
    if (error > furthest) {
      furthest = error;
      best = made;
    }
  }

  return best as T;
}

/**
 * Plays a bot's turn.
 *
 * Rolled here rather than on the host's machine, because producing a plausible
 * wrong answer means knowing the right one. A bot that misses aims near the
 * answer rather than anywhere at all — on the proximity kinds that is what
 * makes it read as a player rather than as noise, and it also means the bot
 * collects partial credit the same way a person would.
 */
export function botResponse(
  answer: Answer,
  question: Question,
  accuracy: number,
): Response {
  const right = Math.random() < accuracy;

  /** A signed offset for a hit: anywhere inside full credit. */
  const near = (full: number) => full * (Math.random() * 2 - 1);

  /** One direction or the other, for the kinds a miss can only go two ways. */
  const either = (size: number) => (Math.random() < 0.5 ? -size : size);

  switch (answer.kind) {
    case "choice": {
      const count = question.kind === "choice" ? question.options.length : 4;
      if (right) return { kind: "choice", choice: answer.index };
      const wrong = Array.from({ length: count }, (_, i) => i).filter(
        (i) => i !== answer.index,
      );
      return {
        kind: "choice",
        choice: wrong[Math.floor(Math.random() * wrong.length)] ?? null,
      };
    }

    case "fill":
      if (right) return { kind: "fill", text: answer.show };
      return { kind: "fill", text: nudgeText(answer.show) };

    case "slider": {
      const scale = question.kind === "slider" ? question : null;
      const put = (drift: number) =>
        scale ? clampToStep(answer.value + drift, scale) : answer.value + drift;

      if (right) return { kind: "slider", value: put(near(answer.full)) };

      return {
        kind: "slider",
        value: missing(
          answer.full,
          answer.zero,
          (size) => put(either(size)),
          (value) => Math.abs(value - answer.value),
        ),
      };
    }

    case "point": {
      // The bot answers on the grid the player can see, so its placement is
      // held inside the question's own window rather than a symmetric span —
      // on a first-quadrant question the old clamp could put it off the
      // picture, where nobody could have seen how close it was.
      const frame =
        question.kind === "point"
          ? frameOf(question.span, question.frame)
          : frameOf(8);

      const clamp = (n: number, low: number, high: number) =>
        Math.max(low, Math.min(high, Math.round(n)));

      // Along a random direction rather than per-axis, so a miss is the stated
      // distance away whichever way it goes.
      const place = (reach: number) => {
        const angle = Math.random() * Math.PI * 2;
        return {
          x: clamp(answer.at.x + Math.cos(angle) * reach, frame.minX, frame.maxX),
          y: clamp(answer.at.y + Math.sin(angle) * reach, frame.minY, frame.maxY),
        };
      };

      if (right) return { kind: "point", at: place(Math.abs(near(answer.full))) };

      return {
        kind: "point",
        at: missing(answer.full, answer.zero, place, (at) =>
          distance(at, answer.at),
        ),
      };
    }

    case "line": {
      const span = answer.span;
      const draw = (shift: number): [Point, Point] => {
        const at = (x: number) =>
          Math.round(answer.slope * x + answer.intercept + shift);
        return [
          { x: -span, y: at(-span) },
          { x: span, y: at(span) },
        ];
      };

      // The same measure the grader uses: how far the drawn line sits from the
      // intended one at the two edges of the grid.
      const apart = (through: [Point, Point]) => {
        const drawn = lineThrough(through[0], through[1]);
        if (!drawn) return Infinity;
        const at = (x: number) =>
          Math.abs(
            drawn.slope * x + drawn.intercept - (answer.slope * x + answer.intercept),
          );
        return Math.max(at(-span), at(span));
      };

      if (right) return { kind: "line", through: draw(near(answer.full)) };

      return {
        kind: "line",
        through: missing(
          answer.full,
          answer.zero,
          (size) => draw(either(size)),
          apart,
        ),
      };
    }

    case "order": {
      const out = [...answer.order];
      if (right) return { kind: "order", order: out };

      // A miss is a shuffle, not a reversal. Reversing maximises the error and
      // would score zero every time, but it is also the one wrong ordering a
      // person never produces — and in a duel the opponent sees your answer,
      // so a bot with a tell is a bot you can read.
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      // A shuffle can land close by luck. A miss has to actually miss, the way
      // it does on every other kind.
      if (inversions(out, answer.order) < answer.zero) out.reverse();
      return { kind: "order", order: out };
    }

    case "matrix": {
      const show = answer.cells.map((c) => c.show);
      if (right) return { kind: "matrix", cells: show };

      // `missing` is no use here: it aims for a band on the proximity curve,
      // and this score has no curve — it is a count of cells. The same intent
      // is met directly instead. A miss keeps as many cells as it can while
      // still scoring under the pass mark, and at least one, so the bot makes
      // the mistake a person makes rather than the one only a bot makes.
      //
      // On four cells that is one or two right (0.25 or 0.5, both misses); on
      // two it is exactly one. A one-cell result cannot be missed partially
      // and is asked as a `fill`, not as this.
      const total = show.length;
      let most = 0;
      for (let keep = total - 1; keep >= 1; keep--) {
        if (keep / total < PASS) {
          most = keep;
          break;
        }
      }

      const keep = most > 0 ? 1 + Math.floor(Math.random() * most) : 0;
      const kept = new Set<number>();
      while (kept.size < keep) kept.add(Math.floor(Math.random() * total));

      return {
        kind: "matrix",
        cells: show.map((cell, i) => (kept.has(i) ? cell : nudgeCell(cell))),
      };
    }
  }
}

/**
 * A wrong cell that still looks like an attempt.
 *
 * Kept tidier than `nudgeText` because a matrix shows every cell at once and
 * one entry reading 1.1666666666666667 beside three clean ones is obviously
 * the computer's answer rather than a player's. A whole number moves by a
 * small whole number; anything else flips its sign, which is the slip these
 * questions actually invite — the minus in an inverse, the minus in a
 * subtraction.
 */
function nudgeCell(show: string): string {
  const value = readNumber(show);
  if (value === null) return show === "0" ? "1" : "0";

  if (Number.isInteger(value)) {
    const off = 1 + Math.floor(Math.random() * 3);
    return String(value + (Math.random() < 0.5 ? off : -off));
  }

  return show.startsWith("-") ? show.slice(1) : `-${show}`;
}

/** A wrong answer that still looks like an attempt: the number, off by a bit. */
function nudgeText(show: string): string {
  const value = readNumber(show);
  if (value === null) return show === "0" ? "1" : "0";
  const off = Math.max(1, Math.round(Math.abs(value) * 0.2));
  return String(value + (Math.random() < 0.5 ? off : -off));
}

function clampToStep(
  value: number,
  question: Extract<Question, { kind: "slider" }>,
): number {
  const stepped = Math.round(value / question.step) * question.step;
  const bounded = Math.max(question.min, Math.min(question.max, stepped));
  // Steps like 0.1 leave float dust, which would show in the UI as 3.900000004.
  return Number(bounded.toFixed(6));
}
