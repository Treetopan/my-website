import "server-only";

import type { Curve, Figure, Mark, Point } from "../questions";

/**
 * The shared kit every question generator is built from.
 *
 * Split out of `templates.server.ts` so the per-course generator files can
 * import it without importing each other, and so the awkward parts of
 * rendering maths as text — a coefficient of 1, a negative in the middle of an
 * expression, a radical that half-simplifies — are solved once rather than
 * once per generator.
 */

// ─── Seeded randomness ───────────────────────────────────

export type Rng = {
  /** Inclusive on both ends. */
  int(min: number, max: number): number;
  /** Inclusive, but never zero — the usual source of degenerate questions. */
  nonzero(min: number, max: number): number;
  /** Inclusive and never zero, and never ±1 either. */
  coefficient(max: number): number;
  pick<T>(items: readonly T[]): T;
  sign(): number;
  bool(): boolean;
};

/**
 * mulberry32. Small, fast, and — the only property that actually matters here
 * — the same seed yields the same stream on every machine and every deploy, so
 * an instance id minted at kick-off still rebuilds the same question when it is
 * graded a minute later.
 */
export function rng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));

  return {
    int,
    nonzero(min, max) {
      let v = 0;
      while (v === 0) v = int(min, max);
      return v;
    },
    coefficient(max) {
      return (next() < 0.5 ? -1 : 1) * int(2, max);
    },
    pick(items) {
      return items[int(0, items.length - 1)];
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    bool() {
      return next() < 0.5;
    },
  };
}

// ─── Assembling a question ───────────────────────────────

/**
 * What a generator returns: the question and its answer, still joined. The
 * caller splits them — the question goes to the browser, the answer stays here.
 *
 * `ask` and `among` build the multiple-choice kind and are unchanged, so every
 * generator written before the other kinds existed still works as it did.
 */
export type Built =
  | {
      kind: "choice";
      prompt: string;
      options: string[];
      answer: number;
      figure?: Figure;
    }
  | {
      kind: "fill";
      prompt: string;
      unit?: string;
      hint?: string;
      accept: string[];
      show: string;
      tolerance?: number;
      figure?: Figure;
    }
  | {
      kind: "slider";
      prompt: string;
      min: number;
      max: number;
      step: number;
      unit?: string;
      value: number;
      full: number;
      zero: number;
      figure?: Figure;
    }
  | {
      kind: "point";
      prompt: string;
      span: number;
      at: { x: number; y: number };
      full: number;
      zero: number;
      figure?: Figure;
    }
  | {
      kind: "line";
      prompt: string;
      span: number;
      slope: number;
      intercept: number;
      full: number;
      zero: number;
      figure?: Figure;
    };

/**
 * Assembles one question from its answer and the mistakes it invites.
 *
 * Distractors are offered in preference order and filtered rather than
 * required, because a generator that has to guarantee four distinct values
 * across its whole parameter range ends up avoiding the interesting cases.
 * Supply five or six; the first three that survive are used.
 */
export function ask(
  prompt: string,
  correct: number | string,
  distractors: (number | string)[],
  r: Rng,
  figure?: Figure,
): Built {
  const right = String(correct);
  const wrong: string[] = [];

  for (const d of distractors) {
    const text = String(d);
    if (text !== right && !wrong.includes(text)) wrong.push(text);
    if (wrong.length === 3) break;
  }

  if (wrong.length < 3) {
    // An authoring bug, not a runtime condition. `npm run check:templates`
    // exists to make sure this never reaches a student.
    throw new Error(`Only ${wrong.length} usable distractors for: ${prompt}`);
  }

  const options = [right, ...wrong];
  for (let i = options.length - 1; i > 0; i--) {
    const j = r.int(0, i);
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    kind: "choice",
    prompt,
    options,
    answer: options.indexOf(right),
    figure,
  };
}

// ─── The other kinds ─────────────────────────────────────

/**
 * Type the answer.
 *
 * Reach for this where four options would give the game away — anything whose
 * answer is a single number the student should be able to produce rather than
 * recognise. `accept` takes every form worth allowing; equivalent numbers match
 * on value anyway, so it only needs the genuinely different spellings.
 */
export function fill(
  prompt: string,
  answer: number | string,
  options: {
    accept?: (number | string)[];
    unit?: string;
    hint?: string;
    /** Numeric answers within this count. Default: exact. */
    tolerance?: number;
    figure?: Figure;
  } = {},
): Built {
  const show = String(answer);
  return {
    kind: "fill",
    prompt,
    unit: options.unit,
    hint: options.hint,
    accept: [show, ...(options.accept ?? []).map(String)],
    show,
    tolerance: options.tolerance,
    figure: options.figure,
  };
}

/**
 * Drag to a value, graded by how close.
 *
 * For questions about magnitude, where being nearly right is genuinely most of
 * the way there — an angle, a probability, a rate. `full` is the error that
 * still scores everything, `zero` the error that scores nothing; by default
 * they are a step and a tenth of the range, which makes the scale feel like it
 * is measuring rather than snapping.
 */
export function slider(
  prompt: string,
  spec: {
    min: number;
    max: number;
    step: number;
    value: number;
    unit?: string;
    full?: number;
    zero?: number;
    figure?: Figure;
  },
): Built {
  const range = spec.max - spec.min;
  return {
    kind: "slider",
    prompt,
    min: spec.min,
    max: spec.max,
    step: spec.step,
    unit: spec.unit,
    value: spec.value,
    full: spec.full ?? spec.step,
    zero: spec.zero ?? range / 10,
    figure: spec.figure,
  };
}

/**
 * Place a point on a grid, graded by distance.
 *
 * The one kind that asks a spatial question spatially. Reading a coordinate off
 * a list of four is a different skill from knowing where it goes.
 */
export function point(
  prompt: string,
  spec: {
    span: number;
    x: number;
    y: number;
    full?: number;
    zero?: number;
    figure?: Figure;
  },
): Built {
  return {
    kind: "point",
    prompt,
    span: spec.span,
    at: { x: spec.x, y: spec.y },
    // Exact by default: the grid snaps to whole units, so anything off is off
    // by at least one, and a near miss is a real miss.
    full: spec.full ?? 0.25,
    zero: spec.zero ?? 4,
    figure: spec.figure,
  };
}

/**
 * Draw a line by dragging two handles, graded on how far the drawn line sits
 * from the intended one at the edges of the grid.
 */
export function line(
  prompt: string,
  spec: {
    span: number;
    slope: number;
    intercept: number;
    full?: number;
    zero?: number;
    figure?: Figure;
  },
): Built {
  return {
    kind: "line",
    prompt,
    span: spec.span,
    slope: spec.slope,
    intercept: spec.intercept,
    full: spec.full ?? 0.25,
    zero: spec.zero ?? spec.span,
    figure: spec.figure,
  };
}

/**
 * Generic arithmetic slips, for the tail of a numeric generator's distractor
 * list.
 *
 * The topic-specific mistakes always come first and are what the question is
 * really testing. But every one of them is computed from the same parameters as
 * the answer, so particular rolls collapse several into a single value and the
 * generator runs out of options. These do not collapse: the first two differ
 * from the answer by construction, whatever it is. They read as the slip a
 * student makes when they had the method right and the arithmetic wrong, which
 * is a fair thing to have on the board.
 */
export function nearMisses(value: number): number[] {
  return [value + 1, value - 1, -value, 2 * value, value + 10, value - 10];
}

/**
 * Picks the correct option from a fixed set of choices — for questions whose
 * answer is a statement rather than a value.
 */
export function among(
  prompt: string,
  correct: string,
  all: readonly string[],
  r: Rng,
  figure?: Figure,
): Built {
  return ask(prompt, correct, all.filter((o) => o !== correct), r, figure);
}

// ─── Drawing the function ────────────────────────────────

/**
 * How many samples a plotted curve is cut into.
 *
 * High enough that a cubic reads as a curve rather than as a chain of chords,
 * low enough that ten questions' worth of figures still fit comfortably in a
 * room: every one of these points is written to the database at kick-off and
 * read by every player at the table.
 */
const SAMPLES = 88;

/** Two decimals is finer than a pixel at this scale, and half the bytes. */
function tidy(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Samples y = f(x) across the grid, in pieces.
 *
 * Anything the box cannot hold is dropped rather than clamped, because a
 * clamped sample draws a flat stretch along the top of the grid that the
 * function does not have. The polyline then breaks wherever samples were
 * dropped, and wherever two neighbours sit further apart than the grid is
 * tall — that second rule is what stops 1/(x - 2) from being drawn with a
 * near-vertical line stitching its two branches together, which is the exact
 * misreading the questions about infinite limits are trying to correct.
 */
export function plot(
  f: (x: number) => number,
  spec: {
    span: number;
    /** Defaults to the whole grid. Narrow it for a piecewise definition. */
    from?: number;
    to?: number;
    tone?: Curve["tone"];
    dashed?: boolean;
    label?: string;
    steps?: number;
  },
): Curve[] {
  const from = spec.from ?? -spec.span;
  const to = spec.to ?? spec.span;
  const steps = spec.steps ?? SAMPLES;
  const limit = spec.span * 1.5;

  const pieces: Curve[] = [];
  let run: Point[] = [];
  let previous: number | null = null;

  const cut = () => {
    if (run.length > 1) {
      pieces.push({
        points: run,
        tone: spec.tone ?? "primary",
        dashed: spec.dashed,
      });
    }
    run = [];
  };

  for (let i = 0; i <= steps; i++) {
    const x = from + ((to - from) * i) / steps;
    const y = f(x);

    if (!Number.isFinite(y) || Math.abs(y) > limit) {
      cut();
      previous = null;
      continue;
    }
    if (previous !== null && Math.abs(y - previous) > spec.span) cut();

    run.push({ x: tidy(x), y: tidy(y) });
    previous = y;
  }
  cut();

  // A label belongs on one piece only, and on the rightmost one: that is where
  // there is room for it, and where the eye leaves the curve.
  const last = pieces[pieces.length - 1];
  if (last && spec.label) last.label = spec.label;

  return pieces;
}

/** A curve built by hand: a piecewise definition, a chord, a secant. */
export function stroke(
  points: Point[],
  options: { tone?: Curve["tone"]; dashed?: boolean; label?: string } = {},
): Curve {
  return {
    points: points.map((p) => ({ x: tidy(p.x), y: tidy(p.y) })),
    tone: options.tone ?? "primary",
    dashed: options.dashed,
    label: options.label,
  };
}

/** A vertical line: what no function can be, and what every pole has. */
export function vertical(x: number, span: number, label?: string): Curve {
  return stroke(
    [
      { x, y: -span },
      { x, y: span },
    ],
    { tone: "guide", dashed: true, label },
  );
}

/**
 * A slope field: a short dash of the right slope at each lattice point.
 *
 * Drawn at a fixed length rather than over a fixed run, so a slope of 8 and a
 * slope of 1/8 are told apart by their angle rather than by how far they
 * reach — which is the only thing a slope field is for.
 */
export function slopeField(
  slopeAt: (x: number, y: number) => number,
  spec: { span: number; step?: number; reach?: number },
): Curve[] {
  const step = spec.step ?? 1;
  const reach = spec.reach ?? 0.34;
  const out: Curve[] = [];

  for (let x = -spec.span + step; x <= spec.span - step / 2; x += step) {
    for (let y = -spec.span + step; y <= spec.span - step / 2; y += step) {
      const m = slopeAt(x, y);
      if (!Number.isFinite(m)) continue;
      const scale = reach / Math.hypot(1, m);
      out.push(
        stroke(
          [
            { x: x - scale, y: y - m * scale },
            { x: x + scale, y: y + m * scale },
          ],
          { tone: "guide" },
        ),
      );
    }
  }
  return out;
}

/** A dot on the figure. Open where the curve approaches a point it never takes. */
export function dot(
  x: number,
  y: number,
  options: { open?: boolean; label?: string } = {},
): Mark {
  return {
    at: { x: tidy(x), y: tidy(y) },
    open: options.open,
    label: options.label,
  };
}

/**
 * Assembles a figure.
 *
 * Little more than a typed literal, but going through a function means a
 * generator that forgets `span` fails at the call site rather than drawing its
 * curve at some other scale than the grid underneath it.
 */
export function graph(spec: {
  span: number;
  curves: (Curve | Curve[])[];
  marks?: Mark[];
  xLabel?: string;
  yLabel?: string;
  caption?: string;
}): Figure {
  return {
    span: spec.span,
    curves: spec.curves.flat(),
    marks: spec.marks,
    xLabel: spec.xLabel,
    yLabel: spec.yLabel,
    caption: spec.caption,
  };
}

// ─── Rendering maths as text ─────────────────────────────

/**
 * A term with its sign in front, for building expressions left to right:
 * `signed(5, "x")` is ` + 5x`, `signed(-1, "x")` is ` - x`, and a zero
 * coefficient drops out of the expression entirely.
 */
export function signed(coefficient: number, variable = ""): string {
  if (coefficient === 0) return "";
  const sign = coefficient < 0 ? " - " : " + ";
  const size = Math.abs(coefficient);
  return sign + (size === 1 && variable ? variable : `${size}${variable}`);
}

/** The same, as the leading term: no spaces, and a bare minus for a sign. */
export function head(coefficient: number, variable = ""): string {
  if (coefficient === 1 && variable) return variable;
  if (coefficient === -1 && variable) return `-${variable}`;
  return `${coefficient}${variable}`;
}

/** `x^3`, and the two exponents that do not want writing out: `x` and `1`. */
export function power(variable: string, exponent: number): string {
  if (exponent === 0) return "1";
  if (exponent === 1) return variable;
  return `${variable}^${exponent}`;
}

/**
 * A polynomial from `[coefficient, exponent]` pairs, highest term first. Zero
 * coefficients drop out, and an empty polynomial is "0" rather than "".
 */
export function poly(terms: [number, number][], variable = "x"): string {
  const live = terms.filter(([c]) => c !== 0);
  if (!live.length) return "0";

  return live
    .map(([c, e], i) => {
      const body = e === 0 ? "" : power(variable, e);
      return i === 0 ? head(c, body) : signed(c, body);
    })
    .join("");
}

/**
 * A fraction in lowest terms. Whole numbers lose the slash, and a zero
 * denominator becomes "undefined" — which is the right answer often enough in
 * slope and asymptote questions to be worth saying properly.
 */
export function frac(numerator: number, denominator: number): string {
  if (denominator === 0) return "undefined";

  const g = gcd(Math.abs(numerator), Math.abs(denominator));
  let n = numerator / g;
  let d = denominator / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return d === 1 ? String(n) : `${n}/${d}`;
}

export function gcd(a: number, b: number): number {
  return b === 0 ? a || 1 : gcd(b, a % b);
}

/**
 * A multiple of π in lowest terms: `π/3`, `2π/3`, `π`, `-π/2`, `0`. Radian
 * answers are wrong-looking as decimals, and students are marked on the exact
 * form, so they are built as text throughout.
 */
export function piFrac(numerator: number, denominator: number): string {
  if (numerator === 0) return "0";
  if (denominator === 0) return "undefined";

  const g = gcd(Math.abs(numerator), Math.abs(denominator));
  let n = numerator / g;
  let d = denominator / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }

  const top = n === 1 ? "π" : n === -1 ? "-π" : `${n}π`;
  return d === 1 ? top : `${top}/${d}`;
}

/**
 * `√n` with the largest square pulled out: 12 becomes `2√3`, 16 becomes `4`,
 * and 7 stays `√7`. Radical answers are only worth asking about in simplified
 * form, which means the generator has to be able to produce it.
 */
export function radical(n: number, coefficient = 1): string {
  if (n < 0) return "undefined";
  if (n === 0) return "0";

  let outside = coefficient;
  let inside = n;
  for (let f = Math.floor(Math.sqrt(inside)); f >= 2; f--) {
    if (inside % (f * f) === 0) {
      outside *= f;
      inside /= f * f;
      break;
    }
  }

  if (inside === 1) return String(outside);
  if (outside === 1) return `√${inside}`;
  if (outside === -1) return `-√${inside}`;
  return `${outside}√${inside}`;
}

/** Whether n is a perfect square — for keeping answers whole when they must be. */
export function isSquare(n: number): boolean {
  return n >= 0 && Number.isInteger(Math.sqrt(n));
}
