/**
 * What a question can be, and what counts as answering one.
 *
 * Multiple choice is one kind among several rather than the shape everything
 * has to fit. Four options is a fine way to ask which theorem applies, and a
 * poor way to ask where a point goes — the options either give the answer away
 * or turn a spatial question into a reading exercise. So a question declares
 * its kind, and the games render and grade whichever it is.
 *
 * Several of the kinds are graded by proximity rather than by matching.
 * Dropping a point one unit off the mark is not the same mistake as putting it
 * in the wrong quadrant, and a proof with one pair of steps swapped is not the
 * same mistake as a proof in random order. A scale that cannot tell those
 * apart is throwing away the most useful thing it knows.
 *
 * This module holds the shapes and the scoring curve, both of which are public.
 * What stays server-side is only ever the target value — see `grading.server`.
 */

export type Point = { x: number; y: number };

export type QuestionKind =
  | "choice"
  | "fill"
  | "slider"
  | "point"
  | "line"
  | "order";

// ─── Figures ─────────────────────────────────────────────

/**
 * A curve, as the points it passes through rather than as a formula.
 *
 * Sampling on the server and shipping the samples is the whole trick: the
 * browser never has to know what f is, only where it goes, so there is no
 * expression parser on the client and — more to the point — no formula in the
 * payload for a question whose answer *is* the formula. A gap in the curve is
 * a second `Curve`, which is how a pole or a jump gets drawn as a break rather
 * than as a near-vertical line joining two branches that never met.
 */
export type Curve = {
  /** Grid units, joined in order. */
  points: Point[];
  /**
   * `primary` is the function the question is about, `second` the one it is
   * being compared to, `guide` an asymptote or a construction line.
   */
  tone?: "primary" | "second" | "guide";
  dashed?: boolean;
  /** Drawn at the curve's right-hand end, e.g. "f" or "f'". */
  label?: string;
};

/** A dot on the figure. Open where the curve approaches a point it never takes. */
export type Mark = {
  at: Point;
  open?: boolean;
  label?: string;
};

/**
 * A picture that comes with the question.
 *
 * On `point` and `line` questions the figure and the answer share one grid —
 * the curve you are reading and the place you are putting the answer are the
 * same picture, which is the only arrangement under which "where is the
 * inflection point" is a question about the graph. On the other kinds it is
 * drawn above the input as a plain figure.
 *
 * The grid is square on purpose: x and y run -span to +span on the same scale,
 * so a distance on a `point` question means one thing rather than two. A
 * generator whose function will not fit picks a smaller one.
 */
export type Figure = {
  span: number;
  curves: Curve[];
  marks?: Mark[];
  /** Axis names, where the axes are not x and y — "t" and "v", say. */
  xLabel?: string;
  yLabel?: string;
  /** Read out when the figure carries information the prompt does not. */
  caption?: string;
};

type Identity = {
  id: string;
  prompt: string;
  /** The concept this tests, for the post-game summary. */
  topic: string;
  /**
   * A picture to read the question off. Optional on every kind: a graph is
   * worth drawing when the question is about the graph, and clutter when it
   * is not.
   */
  figure?: Figure;
};

/** Pick one of four. */
export type ChoiceQuestion = Identity & {
  kind: "choice";
  options: string[];
};

/** Type the answer. Graded exactly, so the accepted forms have to be generous. */
export type FillQuestion = Identity & {
  kind: "fill";
  /** Shown after the input, e.g. "°" or "units". Never part of the answer. */
  unit?: string;
  /** Placeholder text, for saying what form the answer should take. */
  hint?: string;
};

/** Drag to a value on a line. Graded by how close. */
export type SliderQuestion = Identity & {
  kind: "slider";
  min: number;
  max: number;
  step: number;
  unit?: string;
};

/** Place a point on a coordinate grid. Graded by distance. */
export type PointQuestion = Identity & {
  kind: "point";
  /** The grid runs from -span to +span on both axes. */
  span: number;
};

/** Drag two handles to draw a line. Graded by how far the line is out. */
export type LineQuestion = Identity & {
  kind: "line";
  span: number;
};

/**
 * Put the steps in the right order. Graded on how much of the sequence is
 * right rather than on whether all of it is.
 *
 * This kind exists because a proof is a sequence and nothing else is. Asked as
 * four options, "which reason justifies this step" is a vocabulary question
 * with three throwaway answers beside it. Asked as an ordering, the same
 * material becomes what the subunit is actually about: that the given comes
 * first, that a fact cannot be used before it has been established, that the
 * conclusion is last. Constructions are sequences too, and so is the shape of
 * an indirect proof.
 *
 * Graded by proximity, for the reason the spatial kinds are: a proof with one
 * adjacent pair swapped and a proof in random order are not the same mistake,
 * and a scale that cannot tell them apart throws away the most useful thing it
 * knows.
 */
export type OrderQuestion = Identity & {
  kind: "order";
  /**
   * The steps, already scrambled by the generator. A step's index in this list
   * is its name — a response is a permutation of these indices, so no text
   * ever has to travel back.
   */
  items: string[];
};

export type Question =
  | ChoiceQuestion
  | FillQuestion
  | SliderQuestion
  | PointQuestion
  | LineQuestion
  | OrderQuestion;

// ─── Answering ───────────────────────────────────────────

/**
 * What the student submits. Every kind has an empty form, because the clock
 * running out still has to submit something — a turn that produces no response
 * at all would be indistinguishable from one that never happened, and the
 * one-grading-per-position rule depends on telling those apart.
 */
export type Response =
  | { kind: "choice"; choice: number | null }
  | { kind: "fill"; text: string }
  | { kind: "slider"; value: number | null }
  | { kind: "point"; at: Point | null }
  | { kind: "line"; through: [Point, Point] | null }
  | { kind: "order"; order: number[] | null };

/** The correct answer, sent back only with a verdict. */
export type Reveal =
  | { kind: "choice"; index: number }
  | { kind: "fill"; text: string }
  | { kind: "slider"; value: number }
  | { kind: "point"; at: Point }
  | { kind: "line"; slope: number; intercept: number }
  | { kind: "order"; order: number[] };

export type Verdict = {
  /** 0 to 1. Only the proximity kinds ever land between the two. */
  score: number;
  /** Whether this counts as right — for streaks, elimination and the tally. */
  correct: boolean;
  /** The correct answer. Arrives only after grading. */
  reveal: Reveal;
  /** What was submitted. For a bot turn the server chooses this. */
  response: Response;
};

/**
 * The score at which an answer counts as correct.
 *
 * Exact kinds only ever score 0 or 1, so this is really a decision about the
 * proximity kinds: how close is close enough to be "right" rather than "nearly".
 * Set where a visibly-close answer counts — a point within about a unit, a
 * slider within a few percent — because a student who put it very nearly in the
 * right place has demonstrated the thing being tested, and telling them they
 * were wrong teaches them nothing they can act on.
 */
export const PASS = 0.6;

/**
 * Turns an error into a score.
 *
 * Full marks out to `full`, nothing beyond `zero`, and a straight line between.
 * Linear rather than something smoother because the falloff is shown to the
 * student as a percentage, and a curve makes "why did that score 40%?"
 * unanswerable.
 */
export function proximity(error: number, full: number, zero: number): number {
  const size = Math.abs(error);
  if (size <= full) return 1;
  if (size >= zero) return 0;
  return (zero - size) / (zero - full);
}

/** Distance between two points, for grading a placement. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The line through two points, or null when they share an x. */
export function lineThrough(
  a: Point,
  b: Point,
): { slope: number; intercept: number } | null {
  if (a.x === b.x) return null;
  const slope = (b.y - a.y) / (b.x - a.x);
  return { slope, intercept: a.y - slope * a.x };
}

/** An empty response of the right kind, for a question not yet answered. */
export function emptyResponse(kind: QuestionKind): Response {
  switch (kind) {
    case "choice":
      return { kind: "choice", choice: null };
    case "fill":
      return { kind: "fill", text: "" };
    case "slider":
      return { kind: "slider", value: null };
    case "point":
      return { kind: "point", at: null };
    case "line":
      return { kind: "line", through: null };
    case "order":
      return { kind: "order", order: null };
  }
}

/**
 * Reads a response back out of untrusted data, or null if it is not one.
 *
 * Used on everything that crosses a boundary: the request body at the grading
 * endpoint, and a turn read back out of the Realtime Database. The database is
 * the reason `undefined` and `null` are treated alike — RTDB drops keys whose
 * value is null, so `{kind: "choice", choice: null}` comes back as
 * `{kind: "choice"}`, and a missing field that stayed `undefined` would read as
 * an answer rather than as a timeout.
 */
export function parseResponse(value: unknown): Response | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;

  const blank = (v: unknown) => v === null || v === undefined;

  switch (r.kind) {
    case "choice":
      return blank(r.choice)
        ? { kind: "choice", choice: null }
        : Number.isInteger(r.choice)
          ? { kind: "choice", choice: r.choice as number }
          : null;

    case "fill":
      if (blank(r.text)) return { kind: "fill", text: "" };
      return typeof r.text === "string" && r.text.length <= 100
        ? { kind: "fill", text: r.text }
        : null;

    case "slider":
      return blank(r.value)
        ? { kind: "slider", value: null }
        : Number.isFinite(r.value)
          ? { kind: "slider", value: r.value as number }
          : null;

    case "point": {
      if (blank(r.at)) return { kind: "point", at: null };
      const at = parsePoint(r.at);
      return at ? { kind: "point", at } : null;
    }

    case "line": {
      if (blank(r.through)) return { kind: "line", through: null };
      if (!Array.isArray(r.through) || r.through.length !== 2) return null;
      const a = parsePoint(r.through[0]);
      const b = parsePoint(r.through[1]);
      return a && b ? { kind: "line", through: [a, b] } : null;
    }

    case "order": {
      if (blank(r.order)) return { kind: "order", order: null };
      const order = parsePermutation(r.order);
      return order ? { kind: "order", order } : null;
    }

    default:
      return null;
  }
}

/**
 * Reads an ordering back out of untrusted data.
 *
 * A permutation and not merely a list of numbers: a repeated index would let a
 * response claim one step twice and leave another unplaced, which is neither a
 * valid answer nor something the scorer could make sense of. The length cap is
 * generous against any sequence worth asking about and mean against anything
 * meant to make the grader do work.
 */
function parsePermutation(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) return null;

  const seen = new Set<number>();
  for (const n of value) {
    if (!Number.isInteger(n) || (n as number) < 0 || (n as number) >= value.length) {
      return null;
    }
    if (seen.has(n as number)) return null;
    seen.add(n as number);
  }
  return value as number[];
}

function parsePoint(value: unknown): Point | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  return Number.isFinite(p.x) && Number.isFinite(p.y)
    ? { x: p.x as number, y: p.y as number }
    : null;
}

/**
 * The same for a reveal, which also travels through the database on its way
 * from the host to the rest of the table.
 */
export function parseReveal(value: unknown): Reveal | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;

  switch (r.kind) {
    case "choice":
      return Number.isInteger(r.index)
        ? { kind: "choice", index: r.index as number }
        : null;
    case "fill":
      return typeof r.text === "string" ? { kind: "fill", text: r.text } : null;
    case "slider":
      return Number.isFinite(r.value)
        ? { kind: "slider", value: r.value as number }
        : null;
    case "point": {
      const at = parsePoint(r.at);
      return at ? { kind: "point", at } : null;
    }
    case "order": {
      const order = parsePermutation(r.order);
      return order ? { kind: "order", order } : null;
    }
    case "line":
      return Number.isFinite(r.slope) && Number.isFinite(r.intercept)
        ? {
            kind: "line",
            slope: r.slope as number,
            intercept: r.intercept as number,
          }
        : null;
    default:
      return null;
  }
}

/** Whether anything was actually submitted, for telling a timeout from a guess. */
export function isBlank(response: Response): boolean {
  switch (response.kind) {
    case "choice":
      return response.choice === null;
    case "fill":
      return response.text.trim() === "";
    case "slider":
      return response.value === null;
    case "point":
      return response.at === null;
    case "line":
      return response.through === null;
    case "order":
      // An ordering starts scrambled on the screen, so there is always an
      // arrangement to look at. The draft stays null until the student moves
      // something, which is what tells an untouched question from an answered
      // one — and the scramble is never the answer, so nothing is lost.
      return response.order === null;
  }
}

// ─── Reading answers back ────────────────────────────────

/**
 * Normalises a typed answer so that equivalent spellings match.
 *
 * Fill-in questions are marked by comparing strings, which means every way a
 * student might reasonably write the same number has to compare equal. This
 * strips the cosmetic differences; the generator supplies the genuinely
 * different forms (`0.5` and `1/2`) in its accepted list.
 */
export function normalise(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^\+/, "")
    // Unicode minus, en dash and em dash all read as a minus sign here.
    .replace(/[−–—]/g, "-")
    .replace(/[,$]/g, "")
    .replace(/°/g, "")
    // A trailing ".0" or ".50" is the same number written differently.
    .replace(/^(-?\d+)\.0+$/, "$1")
    .replace(/^(-?\d*\.\d*?[1-9])0+$/, "$1")
    .replace(/^(-?)\./, "$10.");
}

/** Reads a number out of a typed answer, including `a/b`. Null if it isn't one. */
export function readNumber(text: string): number | null {
  const clean = normalise(text);

  const fraction = clean.match(/^(-?\d+)\/(-?\d+)$/);
  if (fraction) {
    const bottom = Number(fraction[2]);
    if (bottom === 0) return null;
    return Number(fraction[1]) / bottom;
  }

  if (!/^-?\d*\.?\d+$/.test(clean)) return null;
  const value = Number(clean);
  return Number.isFinite(value) ? value : null;
}

/** How a reveal reads in the summary, where there is no grid to draw. */
export function describeReveal(reveal: Reveal, question: Question): string {
  switch (reveal.kind) {
    case "choice":
      return question.kind === "choice"
        ? (question.options[reveal.index] ?? "—")
        : "—";
    case "fill":
      return reveal.text;
    case "slider":
      return String(reveal.value);
    case "point":
      return `(${reveal.at.x}, ${reveal.at.y})`;
    case "line": {
      const { slope, intercept } = reveal;
      const sign = intercept < 0 ? "−" : "+";
      return `y = ${slope}x ${sign} ${Math.abs(intercept)}`;
    }
    case "order":
      return question.kind === "order" ? sequence(reveal.order, question) : "—";
  }
}

/** An ordering written out as the steps it names, in the order it puts them. */
function sequence(
  order: number[],
  question: Extract<Question, { kind: "order" }>,
): string {
  return order.map((i) => question.items[i] ?? "?").join(" → ");
}

/** The same, for what the student submitted. */
export function describeResponse(response: Response, question: Question): string {
  switch (response.kind) {
    case "choice":
      return response.choice === null
        ? "No answer"
        : question.kind === "choice"
          ? (question.options[response.choice] ?? "—")
          : "—";
    case "fill":
      return response.text.trim() || "No answer";
    case "slider":
      return response.value === null ? "No answer" : String(response.value);
    case "point":
      return response.at ? `(${response.at.x}, ${response.at.y})` : "No answer";
    case "line": {
      if (!response.through) return "No answer";
      const line = lineThrough(response.through[0], response.through[1]);
      if (!line) return "A vertical line";
      const sign = line.intercept < 0 ? "−" : "+";
      return `y = ${round(line.slope)}x ${sign} ${Math.abs(round(line.intercept))}`;
    }
    case "order":
      if (!response.order) return "No answer";
      return question.kind === "order"
        ? sequence(response.order, question)
        : "—";
  }
}

/**
 * How far one ordering is from another, counted in pairs that disagree.
 *
 * Kendall distance rather than "how many are in the right slot", because
 * sliding one step from the front to the back leaves nothing in its original
 * slot and is one mistake, not n of them. Counting pairs measures the thing a
 * proof is actually made of: what has to come before what.
 *
 * Public because both sides need it — the server to grade, the client to say
 * how close you were without being told the answer twice.
 */
export function inversions(given: number[], correct: number[]): number {
  const rank = new Map<number, number>();
  correct.forEach((item, at) => rank.set(item, at));

  let out = 0;
  for (let i = 0; i < given.length; i++) {
    for (let j = i + 1; j < given.length; j++) {
      const a = rank.get(given[i]);
      const b = rank.get(given[j]);
      // An index the answer does not contain cannot be out of order with
      // anything; a response carrying one is rejected before it gets here.
      if (a === undefined || b === undefined) continue;
      if (a > b) out++;
    }
  }
  return out;
}

/** How many pairs there are to get wrong. The denominator for the above. */
export function pairCount(n: number): number {
  return (n * (n - 1)) / 2;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
