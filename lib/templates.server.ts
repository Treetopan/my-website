import "server-only";

import type { Question } from "./curriculum";
import {
  GENERATED,
  instanceId,
  parseInstanceId,
  type InstanceRef,
} from "./templates";

/**
 * Question generators.
 *
 * A bank question is a fixed prompt with its answer filed away in
 * `answers.server.ts`. A generated question is a small program: it rolls its
 * own numbers, works out the answer from them, and builds distractors around
 * it. Nothing is stored — the same seed always rebuilds the same question, so
 * grading re-runs the generator instead of consulting a key.
 *
 * This module must never reach the browser. `server-only` makes that a build
 * error rather than a matter of discipline, and it is not paranoia: a generator
 * that computes the answer is a stronger leak than the answer key itself, since
 * it solves not just the questions asked so far but every one it could ever
 * produce.
 *
 * The distractors are the part worth being careful with. Random noise around
 * the answer teaches a student to spot the odd one out rather than to do the
 * arithmetic, so each generator's wrong options are the specific mistakes the
 * topic invites — the sign slip, the rule applied backwards, the step left out.
 *
 * `npm run check:templates` hammers every generator over thousands of seeds.
 * Run it after touching this file: the failures that matter here are narrow
 * parameter combinations that collapse two options into one, and they are
 * invisible until the one seed that triggers them comes up mid-game.
 */

// ─── Seeded randomness ───────────────────────────────────

/**
 * mulberry32. Small, fast, and — the only property that actually matters here
 * — the same seed yields the same stream on every machine and every deploy, so
 * an instance id minted at kick-off still rebuilds the same question when it is
 * graded a minute later.
 */
export type Rng = {
  /** Inclusive on both ends. */
  int(min: number, max: number): number;
  /** Inclusive, but never zero — the usual source of degenerate questions. */
  nonzero(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  sign(): number;
};

function rng(seed: number): Rng {
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
    pick(items) {
      return items[int(0, items.length - 1)];
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
  };
}

// ─── Authoring helpers ───────────────────────────────────

type Built = { prompt: string; options: string[]; answer: number };

/**
 * Assembles one question from its answer and the mistakes it invites.
 *
 * Distractors are offered in preference order and filtered rather than
 * required, because a generator that has to guarantee four distinct values
 * across its whole parameter range ends up avoiding the interesting cases.
 * Supply five or six; the first three that survive are used.
 */
function ask(
  prompt: string,
  correct: number | string,
  distractors: (number | string)[],
  r: Rng,
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

  return { prompt, options, answer: options.indexOf(right) };
}

/**
 * A term with its sign in front, for building expressions left to right:
 * `signed(5, "x")` is ` + 5x`, `signed(-1, "x")` is ` - x`, and a zero
 * coefficient drops out of the expression entirely.
 */
function signed(coefficient: number, variable = ""): string {
  if (coefficient === 0) return "";
  const sign = coefficient < 0 ? " - " : " + ";
  const size = Math.abs(coefficient);
  return sign + (size === 1 && variable ? variable : `${size}${variable}`);
}

/** The same, as the leading term: no space, and a bare minus for a sign. */
function head(coefficient: number, variable = ""): string {
  if (coefficient === 1 && variable) return variable;
  if (coefficient === -1 && variable) return `-${variable}`;
  return `${coefficient}${variable}`;
}

/**
 * A fraction in lowest terms. Whole numbers lose the slash, and a zero
 * denominator becomes "undefined" — which is the right answer often enough in
 * slope questions to be worth saying properly rather than guarding against.
 */
function frac(numerator: number, denominator: number): string {
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

function gcd(a: number, b: number): number {
  return b === 0 ? a || 1 : gcd(b, a % b);
}

// ─── The generators ──────────────────────────────────────

type Generator = (r: Rng) => Built;

/**
 * Keyed by subunit, in the same order as `GENERATED` in `templates.ts`. The
 * assertion at the bottom of this file enforces that, because a generator's
 * index is baked into every instance id it has ever minted.
 */
const GENERATORS: Record<string, Generator[]> = {
  // ── Algebra 1 · 1.6 Exponent rules ──
  "math/algebra-1/unit-1/1.6": [
    // Product rule: add the exponents. The classic error multiplies them.
    (r) => {
      const v = r.pick(["x", "y", "a", "n"]);
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return ask(
        `Simplify: ${v}^${a} · ${v}^${b}`,
        `${v}^${a + b}`,
        [
          `${v}^${a * b}`,
          `${v}^${Math.abs(a - b)}`,
          `2${v}^${a + b}`,
          `${v}^${a}`,
          `${v}^${b}`,
        ],
        r,
      );
    },
    // Quotient rule: subtract. Kept with a > b so the answer stays positive.
    (r) => {
      const v = r.pick(["x", "y", "m", "k"]);
      const b = r.int(2, 6);
      const a = b + r.int(2, 7);
      return ask(
        `Simplify: ${v}^${a} ÷ ${v}^${b}`,
        `${v}^${a - b}`,
        [
          `${v}^${a + b}`,
          `${v}^${a * b}`,
          `${v}^${b - a}`,
          `${v}^${a}`,
          `${v}^${Math.round(a / b)}`,
        ],
        r,
      );
    },
    // Power of a power: multiply. The error adds, borrowing the product rule.
    (r) => {
      const v = r.pick(["x", "y", "p", "t"]);
      const a = r.int(2, 7);
      const b = r.int(2, 6);
      return ask(
        `Simplify: (${v}^${a})^${b}`,
        `${v}^${a * b}`,
        [
          `${v}^${a + b}`,
          `${v}^${a}`,
          `${v}^${b}`,
          `${b}${v}^${a}`,
          `${v}^${Math.abs(a - b)}`,
        ],
        r,
      );
    },
    // Negative exponents, evaluated numerically so the reciprocal is concrete.
    (r) => {
      const base = r.pick([2, 3, 4, 5]);
      const n = r.int(2, 3);
      const value = base ** n;
      return ask(
        `Evaluate: ${base}^-${n}`,
        `1/${value}`,
        [`-${value}`, `-1/${value}`, `${value}`, `1/${base * n}`, `${base * n}`],
        r,
      );
    },
  ],

  // ── Algebra 1 · 2.1 One- and two-step equations ──
  "math/algebra-1/unit-2/2.1": [
    // One step. Both shapes appear so the operation is never predictable.
    (r) => {
      if (r.sign() > 0) {
        const b = r.nonzero(-12, 12);
        const x = r.nonzero(-12, 12);
        const c = x + b;
        return ask(
          `Solve for x:  x${signed(b)} = ${c}`,
          x,
          // Added instead of subtracting, the sign flip, and ignoring b.
          [c + b, b - c, c, -c - b, c - 2 * b, b],
          r,
        );
      }
      const a = r.nonzero(-9, 9);
      const x = r.nonzero(-9, 9);
      const c = a * x;
      return ask(
        `Solve for x:  ${head(a, "x")} = ${c}`,
        x,
        // Multiplied instead of dividing, and the two off-by-an-operation slips.
        [c * a, -x, c - a, c + a, a - c, c],
        r,
      );
    },
    // Two steps: ax + b = c, built from a whole-number solution. The
    // coefficient stays clear of ±1, which would make this a one-step
    // equation wearing a disguise.
    (r) => {
      const a = r.sign() * r.int(2, 8);
      const b = r.nonzero(-15, 15);
      const x = r.nonzero(-10, 10);
      const c = a * x + b;
      return ask(
        `Solve for x:  ${head(a, "x")}${signed(b)} = ${c}`,
        x,
        [
          frac(c + b, a), // added b instead of subtracting it
          frac(c - a * b, a), // divided before subtracting
          -x, // sign slip on the division
          c - b, // never divided at all
          frac(c, a), // dropped b entirely
        ],
        r,
      );
    },
    // A negative coefficient specifically, because dividing by it is the step
    // students skip. The answer is deliberately allowed to be fractional.
    (r) => {
      const a = -r.int(2, 9);
      const b = r.nonzero(-14, 14);
      // c === b would make x zero, which every wrong route also arrives at.
      let c = r.nonzero(-20, 20);
      while (c === b) c = r.nonzero(-20, 20);
      return ask(
        `Solve for x:  ${head(a, "x")}${signed(b)} = ${c}`,
        frac(c - b, a),
        [
          frac(c - b, -a), // forgot the sign of the coefficient
          frac(c + b, a), // added b instead of subtracting
          frac(c, a), // dropped b
          c - b, // never divided
          (c - b) * a, // multiplied by the coefficient instead of dividing
          frac(b - c, -a),
        ],
        r,
      );
    },
  ],

  // ── Algebra 1 · 2.2 Multi-step, variables on both sides ──
  "math/algebra-1/unit-2/2.2": [
    // ax + b = cx + d, built backwards from a whole-number solution.
    (r) => {
      const x = r.nonzero(-9, 9);
      const a = r.nonzero(-9, 9);
      let c = r.nonzero(-9, 9);
      while (a === c) c = r.nonzero(-9, 9);
      const b = r.nonzero(-12, 12);
      const d = (a - c) * x + b;
      return ask(
        `Solve for x:  ${head(a, "x")}${signed(b)} = ${head(c, "x")}${signed(d)}`,
        x,
        [
          -x, // subtracted the coefficients the wrong way round
          frac(d + b, a - c), // moved b to the wrong side
          frac(d - b, a + c), // added the coefficients instead
          frac(d, a - c), // dropped the constants
          frac(d + b, c - a),
        ],
        r,
      );
    },
    // a(x + b) = c. The distractor that ignores the distribution is the point,
    // so the multiplier has to actually multiply — ±1 is no test of anything.
    (r) => {
      const a = r.sign() * r.int(2, 7);
      const b = r.nonzero(-9, 9);
      const x = r.nonzero(-9, 9);
      const c = a * (x + b);
      return ask(
        `Solve for x:  ${head(a)}(x${signed(b)}) = ${c}`,
        x,
        [
          c / a + b, // added b back instead of subtracting it
          c - a * b, // divided nothing
          frac(c, a * b), // divided by both
          -x,
          frac(c - b, a), // distributed to the first term only
        ],
        r,
      );
    },
  ],

  // ── Algebra 1 · 4.1 Rate of change and slope ──
  "math/algebra-1/unit-4/4.1": [
    // Slope through two points, left as a fraction when it does not reduce.
    (r) => {
      const x1 = r.int(-8, 8);
      let x2 = r.int(-8, 8);
      while (x2 === x1) x2 = r.int(-8, 8);
      const y1 = r.int(-9, 9);
      const y2 = r.int(-9, 9);
      const dx = x2 - x1;
      const dy = y2 - y1;
      return ask(
        `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
        frac(dy, dx),
        [
          frac(dx, dy), // run over rise
          frac(-dy, dx), // sign slip
          frac(y1 + y2, x1 + x2), // added instead of subtracting
          dx, // read off the run alone
          -dx,
          frac(dy * 2, dx),
          frac(dy, dx * 2),
          frac(dx, dy * 2),
        ],
        r,
      );
    },
    // Reading the sign off a description rather than computing anything.
    (r) => {
      const shapes = [
        { text: "rises from left to right", answer: "Positive" },
        { text: "falls from left to right", answer: "Negative" },
        { text: "is a horizontal line", answer: "Zero" },
        { text: "is a vertical line", answer: "Undefined" },
      ];
      const shape = r.pick(shapes);
      return ask(
        `A line ${shape.text}. Its slope is`,
        shape.answer,
        ["Positive", "Negative", "Zero", "Undefined"].filter(
          (o) => o !== shape.answer,
        ),
        r,
      );
    },
  ],

  // ── Algebra 1 · 4.2 Slope-intercept form ──
  "math/algebra-1/unit-4/4.2": [
    // Reading m and b straight off y = mx + b.
    (r) => {
      const m = r.nonzero(-9, 9);
      const b = r.nonzero(-12, 12);
      const wantSlope = r.sign() > 0;
      return ask(
        `For y = ${head(m, "x")}${signed(b)}, what is the ${wantSlope ? "slope" : "y-intercept"}?`,
        wantSlope ? m : b,
        wantSlope
          ? [b, -m, frac(1, m), m + b, m - b, m * b] // the intercept, and sign/reciprocal slips
          : [m, -b, frac(b, m), m + b, b - m, m * b],
        r,
      );
    },
    // Evaluating the function, which is where the intercept stops being a
    // label to memorise and starts being a number that does something.
    (r) => {
      const m = r.nonzero(-8, 8);
      const b = r.nonzero(-10, 10);
      const x = r.nonzero(-7, 7);
      return ask(
        `If y = ${head(m, "x")}${signed(b)}, what is y when x = ${x}?`,
        m * x + b,
        [
          m * x - b, // sign slip on the intercept
          m + x + b, // added the coefficient instead of multiplying
          m * (x + b), // multiplied through the intercept too
          -(m * x + b),
          m * x, // dropped the intercept
          b - m * x, // subtracted the wrong way round
        ],
        r,
      );
    },
  ],

  // ── Algebra 1 · 6.4 Special products ──
  "math/algebra-1/unit-6/6.4": [
    // Difference of squares. Whether a middle term shows up in the answer is
    // exactly the tell for whether the pattern was recognised.
    (r) => {
      const a = r.int(2, 12);
      const v = r.pick(["x", "y", "m"]);
      return ask(
        `Multiply: (${v} + ${a})(${v} - ${a})`,
        `${v}^2${signed(-a * a)}`,
        [
          `${v}^2${signed(a * a)}`, // sign of the constant
          `${v}^2${signed(-2 * a, v)}${signed(-a * a)}`, // spurious middle term
          `${v}^2${signed(2 * a, v)}${signed(-a * a)}`,
          `${v}^2${signed(-2 * a)}`, // doubled instead of squared
          `${v}^2${signed(-a * a, v)}`,
        ],
        r,
      );
    },
    // Perfect square trinomial. Forgetting the middle term is the whole point.
    (r) => {
      const a = r.int(2, 11);
      const s = r.sign();
      const v = r.pick(["x", "y", "n"]);
      const mid = 2 * a * s;
      return ask(
        `Expand: (${v}${signed(a * s)})^2`,
        `${v}^2${signed(mid, v)}${signed(a * a)}`,
        [
          `${v}^2${signed(a * a)}`, // squared both terms and stopped
          `${v}^2${signed(-mid, v)}${signed(a * a)}`, // sign of the middle term
          `${v}^2${signed(mid, v)}${signed(-a * a)}`, // sign of the constant
          `${v}^2${signed(a * s, v)}${signed(a * a)}`, // forgot to double
          `${v}^2${signed(mid, v)}${signed(2 * a)}`, // doubled instead of squared
        ],
        r,
      );
    },
  ],

  // ── Algebra 1 · 7.8 The quadratic formula ──
  "math/algebra-1/unit-7/7.8": [
    // Built backwards from two integer roots so the formula lands cleanly and
    // the question is about executing it, not about surds.
    (r) => {
      const p = r.nonzero(-7, 7);
      let q = r.nonzero(-7, 7);
      while (q === p) q = r.nonzero(-7, 7);
      const b = -(p + q);
      const c = p * q;
      const larger = Math.max(p, q);
      const smaller = Math.min(p, q);
      return ask(
        `Solve using the quadratic formula:  x^2${signed(b, "x")}${signed(c)} = 0.  What is the larger root?`,
        larger,
        [
          smaller, // reported the wrong root
          -larger, // sign slip in the numerator
          -smaller,
          larger + 1,
          larger - 1,
        ],
        r,
      );
    },
  ],

  // ── Algebra 1 · 7.9 The discriminant ──
  "math/algebra-1/unit-7/7.9": [
    // Computing b^2 - 4ac. The sign of c is what trips this up.
    (r) => {
      const a = r.nonzero(-5, 5);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      return ask(
        `What is the discriminant of ${head(a, "x^2")}${signed(b, "x")}${signed(c)}?`,
        b * b - 4 * a * c,
        [
          b * b + 4 * a * c, // sign slip on the 4ac term
          b * b - 4 * a - c, // multiplied only part of 4ac
          2 * b - 4 * a * c, // doubled b instead of squaring it
          -(b * b) - 4 * a * c,
          b * b - a * c, // dropped the 4
        ],
        r,
      );
    },
    // Reading the sign of a discriminant back into the shape of the roots.
    (r) => {
      const kind = r.int(0, 2);
      const d = kind === 0 ? r.int(1, 60) : kind === 1 ? 0 : -r.int(1, 60);
      const answer =
        d > 0
          ? "Two distinct real roots"
          : d === 0
            ? "One repeated real root"
            : "Two complex roots";
      return ask(
        `A quadratic has discriminant ${d}. What does that tell you about its roots?`,
        answer,
        [
          "Two distinct real roots",
          "One repeated real root",
          "Two complex roots",
          "No roots of any kind",
        ].filter((o) => o !== answer),
        r,
      );
    },
  ],
};

// ─── Minting and grading ─────────────────────────────────

/** A generated question plus the answer, which stays on this side of the wire. */
type Resolved = { question: Question; answer: number };

function build(ref: InstanceRef): Resolved | null {
  const generator = GENERATORS[ref.subunitId]?.[ref.generator];
  if (!generator) return null;

  const built = generator(rng(ref.seed));
  return {
    question: {
      id: instanceId(ref.subunitId, ref.generator, ref.seed),
      prompt: built.prompt,
      options: built.options,
      topic: GENERATED[ref.subunitId][ref.generator],
    },
    answer: built.answer,
  };
}

/**
 * Rebuilds the question an instance id names, and works out its answer again.
 *
 * This is why generated questions need no storage: grading is a re-derivation,
 * not a lookup. A session that has been sitting for an hour grades exactly as
 * it would have at kick-off.
 */
export function resolveInstance(id: string): Resolved | null {
  const ref = parseInstanceId(id);
  return ref ? build(ref) : null;
}

/**
 * Mints `want` fresh questions for a subunit.
 *
 * Generators are dealt round-robin from a random offset so a short game still
 * samples across the topics rather than leaning on one generator, and every
 * instance gets its own seed — two students on the same subunit, or the same
 * student twice, never see the same numbers.
 */
export function mintInstances(subunitId: string, want: number): Question[] {
  const generators = GENERATORS[subunitId];
  if (!generators?.length) return [];

  const offset = Math.floor(Math.random() * generators.length);
  const out: Question[] = [];

  for (let i = 0; i < want; i++) {
    const generator = (offset + i) % generators.length;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const made = build({ subunitId, generator, seed });
    if (made) out.push(made.question);
  }

  return out;
}

export function hasGenerators(subunitId: string): boolean {
  return (GENERATORS[subunitId]?.length ?? 0) > 0;
}

/** Exposed for `npm run check:templates`, which has to reach every generator. */
export function generatorsFor(subunitId: string): number {
  return GENERATORS[subunitId]?.length ?? 0;
}

// ─── Drift guard ─────────────────────────────────────────

/**
 * The public manifest and the generators are two halves of one thing, split
 * only so the answers stay server-side. If they disagree, instance ids point
 * at the wrong generator and questions get graded against another topic's
 * answer — so disagree loudly, at load, rather than quietly at play.
 */
for (const [subunitId, topics] of Object.entries(GENERATED)) {
  const generators = GENERATORS[subunitId];
  if (!generators) {
    throw new Error(
      `templates: ${subunitId} is listed in GENERATED but has no generators.`,
    );
  }
  if (generators.length !== topics.length) {
    throw new Error(
      `templates: ${subunitId} lists ${topics.length} topics but has ${generators.length} generators.`,
    );
  }
}

for (const subunitId of Object.keys(GENERATORS)) {
  if (!GENERATED[subunitId]) {
    throw new Error(
      `templates: ${subunitId} has generators but is missing from GENERATED.`,
    );
  }
}
