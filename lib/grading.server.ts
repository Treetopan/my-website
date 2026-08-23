import "server-only";

import {
  PASS,
  distance,
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

    case "fill": {
      if (response.kind !== "fill") return 0;
      const given = normalise(response.text);
      if (answer.accept.some((form) => normalise(form) === given)) return 1;

      // Numeric equivalence catches the forms the accept list did not think of
      // — 0.5 against 1/2, or 6.0 against 6.
      const asNumber = readNumber(response.text);
      if (asNumber === null) return 0;

      const tolerance = answer.tolerance ?? 0;
      return answer.accept.some((form) => {
        const target = readNumber(form);
        return target !== null && Math.abs(target - asNumber) <= tolerance;
      })
        ? 1
        : 0;
    }

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
  }
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
  }
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

  /**
   * A signed offset for a miss: past the point where the score reaches zero.
   *
   * Aiming a miss "somewhere around the answer" sounds more lifelike and is
   * wrong — it lands on full marks often enough that a bot set to 70% passes
   * closer to 80%, which quietly makes every bot harder than it says on the
   * tin. A miss on a proximity question scores nothing, exactly as a wrong
   * option does.
   */
  const past = (zero: number) =>
    (Math.random() < 0.5 ? -1 : 1) * zero * (1.2 + Math.random());

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
      const drift = right ? near(answer.full) : past(answer.zero);
      const value =
        question.kind === "slider"
          ? clampToStep(answer.value + drift, question)
          : answer.value + drift;
      return { kind: "slider", value };
    }

    case "point": {
      const span = question.kind === "point" ? question.span : 8;
      // Offset along a random direction rather than per-axis, so a miss is the
      // stated distance away whichever way it goes.
      const angle = Math.random() * Math.PI * 2;
      const reach = right ? Math.abs(near(answer.full)) : Math.abs(past(answer.zero));
      const clamp = (n: number) =>
        Math.max(-span, Math.min(span, Math.round(n)));

      return {
        kind: "point",
        at: {
          x: clamp(answer.at.x + Math.cos(angle) * reach),
          y: clamp(answer.at.y + Math.sin(angle) * reach),
        },
      };
    }

    case "line": {
      const shift = right ? near(answer.full) : past(answer.zero);
      const span = answer.span;
      const at = (x: number) =>
        Math.round(answer.slope * x + answer.intercept + shift);
      return {
        kind: "line",
        through: [
          { x: -span, y: at(-span) },
          { x: span, y: at(span) },
        ],
      };
    }
  }
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
