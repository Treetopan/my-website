import "server-only";

import {
  among,
  ask,
  frac,
  head,
  poly,
  nearMisses,
  radical,
  signed,
  type Built,
  type Rng,
} from "./kit";

/**
 * Algebra 1 generators.
 *
 * Keyed by subunit, and in the same order as this subunit's entry in
 * `GENERATED` — a generator's index is baked into every instance id it has
 * minted, so append rather than insert.
 */
export const ALGEBRA_1: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.1 The real number system ──
  "math/algebra-1/unit-1/1.1": [
    (r) => {
      const kinds = [
        { value: () => `${r.int(2, 40)}`, answer: "Natural number" },
        { value: () => `-${r.int(2, 40)}`, answer: "Integer" },
        { value: () => `${r.nonzero(-9, 9)}/${r.int(2, 9)}`, answer: "Rational number" },
        { value: () => `√${r.pick([2, 3, 5, 7, 11, 13])}`, answer: "Irrational number" },
      ];
      const kind = r.pick(kinds);
      return among(
        `Which is the most specific classification of ${kind.value()}?`,
        kind.answer,
        ["Natural number", "Integer", "Rational number", "Irrational number"],
        r,
      );
    },
  ],

  // ── 1.6 Exponent rules ──
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

  // ── 1.7 Scientific notation ──
  "math/algebra-1/unit-1/1.7": [
    (r) => {
      const lead = r.int(1, 9);
      const decimal = r.int(1, 9);
      const exponent = r.int(2, 8);
      // Assembled as digits rather than computed, because 4.7 × 10^3 in
      // floating point is 4699.999999999999.
      const plain = `${lead}${decimal}${"0".repeat(exponent - 1)}`;
      const sci = (mantissa: string, e: number) => `${mantissa} × 10^${e}`;
      return ask(
        `Write ${plain} in scientific notation.`,
        sci(`${lead}.${decimal}`, exponent),
        [
          sci(`${lead}.${decimal}`, exponent + 1),
          sci(`${lead}.${decimal}`, exponent - 1),
          sci(`${lead}${decimal}`, exponent - 1), // mantissa left un-normalised
          sci(`0.${lead}${decimal}`, exponent + 1),
          sci(`${lead}.${decimal}`, -exponent),
        ],
        r,
      );
    },
  ],

  // ── 2.1 One- and two-step equations ──
  "math/algebra-1/unit-2/2.1": [
    // One step. Both shapes appear so the operation is never predictable.
    (r) => {
      if (r.bool()) {
        const b = r.nonzero(-12, 12);
        const x = r.nonzero(-12, 12);
        const c = x + b;
        return ask(
          `Solve for x:  x${signed(b)} = ${c}`,
          x,
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
        [c * a, -x, c - a, c + a, a - c, c],
        r,
      );
    },
    // Two steps: ax + b = c. The coefficient stays clear of ±1, which would
    // make this a one-step equation wearing a disguise.
    (r) => {
      const a = r.coefficient(8);
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

  // ── 2.2 Multi-step, variables on both sides ──
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
      const a = r.coefficient(7);
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

  // ── 2.8 Absolute value equations ──
  "math/algebra-1/unit-2/2.8": [
    (r) => {
      const b = r.nonzero(-9, 9);
      const c = r.int(2, 14);
      // |x + b| = c has two solutions; the question asks for their sum, which
      // is the thing students miss when they solve only the positive branch.
      const high = c - b;
      const low = -c - b;
      return ask(
        `Solve |x${signed(b)}| = ${c}. What is the sum of the solutions?`,
        high + low,
        [high, low, c, high - low, -b, 0, b],
        r,
      );
    },
  ],

  // ── 3.3 Function notation and evaluation ──
  "math/algebra-1/unit-3/3.3": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      const at = r.nonzero(-5, 5);
      const value = a * at * at + b * at + c;
      return ask(
        `If f(x) = ${poly([[a, 2], [b, 1], [c, 0]])}, what is f(${at})?`,
        value,
        [
          a * at * at - b * at + c, // sign slip on the linear term
          a * (at * at + b * at) + c,
          (a * at) ** 2 + b * at + c, // squared the whole first term
          a * at + b * at + c, // never squared
          ...nearMisses(value),
        ],
        r,
      );
    },
  ],

  // ── 4.1 Rate of change and slope ──
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
      return among(
        `A line ${shape.text}. Its slope is`,
        shape.answer,
        ["Positive", "Negative", "Zero", "Undefined"],
        r,
      );
    },
  ],

  // ── 4.2 Slope-intercept form ──
  "math/algebra-1/unit-4/4.2": [
    // Reading m and b straight off y = mx + b.
    (r) => {
      const m = r.nonzero(-9, 9);
      const b = r.nonzero(-12, 12);
      const wantSlope = r.bool();
      return ask(
        `For y = ${head(m, "x")}${signed(b)}, what is the ${wantSlope ? "slope" : "y-intercept"}?`,
        wantSlope ? m : b,
        wantSlope
          ? [b, -m, frac(1, m), m + b, m - b, m * b]
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

  // ── 4.6 Parallel and perpendicular lines ──
  "math/algebra-1/unit-4/4.6": [
    (r) => {
      const slope = r.nonzero(-9, 9);
      const parallel = r.bool();
      return ask(
        `A line has slope ${slope}. What is the slope of a line ${parallel ? "parallel" : "perpendicular"} to it?`,
        parallel ? String(slope) : frac(-1, slope),
        [
          parallel ? frac(-1, slope) : String(slope), // did the other one
          -slope,
          frac(1, slope), // reciprocal without the sign
          0,
          frac(slope, 2),
        ],
        r,
      );
    },
  ],

  // ── 5.3 Solving systems by elimination ──
  "math/algebra-1/unit-5/5.3": [
    (r) => {
      const x = r.nonzero(-7, 7);
      const y = r.nonzero(-7, 7);
      const a = r.nonzero(-6, 6);
      const b = r.nonzero(-6, 6);
      let c = r.nonzero(-6, 6);
      let d = r.nonzero(-6, 6);
      // A non-zero determinant is what makes the system have one solution.
      while (a * d - b * c === 0) {
        c = r.nonzero(-6, 6);
        d = r.nonzero(-6, 6);
      }
      const e = a * x + b * y;
      const f = c * x + d * y;
      return ask(
        `Solve the system:  ${head(a, "x")}${signed(b, "y")} = ${e}  and  ${head(c, "x")}${signed(d, "y")} = ${f}.  What is x?`,
        x,
        [y, -x, -y, x + y, x - y, 2 * x, x + 1],
        r,
      );
    },
  ],

  // ── 6.3 Multiplying polynomials ──
  "math/algebra-1/unit-6/6.3": [
    (r) => {
      const a = r.nonzero(-6, 6);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-6, 6);
      const d = r.nonzero(-9, 9);
      return ask(
        `Multiply: (${head(a, "x")}${signed(b)})(${head(c, "x")}${signed(d)})`,
        poly([[a * c, 2], [a * d + b * c, 1], [b * d, 0]]),
        [
          poly([[a * c, 2], [b * d, 0]]), // multiplied firsts and lasts only
          poly([[a * c, 2], [a * d - b * c, 1], [b * d, 0]]),
          poly([[a * c, 2], [a * d + b * c, 1], [-b * d, 0]]),
          poly([[a + c, 2], [a * d + b * c, 1], [b + d, 0]]),
          poly([[a * c, 2], [b + d, 1], [b * d, 0]]),
        ],
        r,
      );
    },
  ],

  // ── 6.4 Special products ──
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

  // ── 6.6 Factoring trinomials with leading coefficient 1 ──
  "math/algebra-1/unit-6/6.6": [
    (r) => {
      const p = r.nonzero(-9, 9);
      let q = r.nonzero(-9, 9);
      while (q === p) q = r.nonzero(-9, 9);
      const b = p + q;
      const c = p * q;
      const show = (m: number, n: number) =>
        `(x${signed(m)})(x${signed(n)})`;
      return ask(
        `Factor: ${poly([[1, 2], [b, 1], [c, 0]])}`,
        show(p, q),
        [
          show(-p, -q), // both signs flipped
          show(-p, q),
          show(p, -q),
          show(b, c),
          show(p + 1, q - 1),
        ],
        r,
      );
    },
  ],

  // ── 7.8 The quadratic formula ──
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
        `Solve using the quadratic formula:  ${poly([[1, 2], [b, 1], [c, 0]])} = 0.  What is the larger root?`,
        larger,
        [smaller, -larger, -smaller, larger + 1, larger - 1],
        r,
      );
    },
  ],

  // ── 7.9 The discriminant ──
  "math/algebra-1/unit-7/7.9": [
    // Computing b^2 - 4ac. The sign of c is what trips this up.
    (r) => {
      const a = r.nonzero(-5, 5);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      return ask(
        `What is the discriminant of ${poly([[a, 2], [b, 1], [c, 0]])}?`,
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
      return among(
        `A quadratic has discriminant ${d}. What does that tell you about its roots?`,
        answer,
        [
          "Two distinct real roots",
          "One repeated real root",
          "Two complex roots",
          "No roots of any kind",
        ],
        r,
      );
    },
  ],

  // ── 8.1 Geometric sequences ──
  "math/algebra-1/unit-8/8.1": [
    (r) => {
      const first = r.nonzero(-6, 6);
      const ratio = r.pick([-3, -2, 2, 3, 4]);
      const n = r.int(4, 7);
      const nth = first * ratio ** (n - 1);
      return ask(
        `A geometric sequence starts ${first}, ${first * ratio}, ${first * ratio ** 2}, … What is the ${n}th term?`,
        nth,
        [
          first * ratio ** n, // counted the first term as term zero
          first * ratio * (n - 1), // treated it as arithmetic
          first + ratio * (n - 1),
          -nth,
          first * ratio ** (n - 2),
        ],
        r,
      );
    },
  ],

  // ── 9.1 Simplifying radicals ──
  "math/algebra-1/unit-9/9.1": [
    (r) => {
      const square = r.pick([4, 9, 16, 25, 36, 49]);
      const rest = r.pick([2, 3, 5, 6, 7, 10, 11, 13, 15]);
      const n = square * rest;
      return ask(
        `Simplify: √${n}`,
        radical(n),
        [
          `√${n}`, // left it alone
          `${square}√${rest}`, // pulled the square out without rooting it
          radical(n * 2),
          `${Math.sqrt(square)}√${square * rest}`,
          `${Math.sqrt(square) * rest}`,
        ],
        r,
      );
    },
  ],

  // ── 10.1 Measures of centre and spread ──
  "math/algebra-1/unit-10/10.1": [
    (r) => {
      const n = 5;
      const values = Array.from({ length: n }, () => r.int(1, 30));
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((t, v) => t + v, 0);
      const wantMean = r.bool();
      const mean = frac(sum, n);
      const median = String(sorted[2]);
      return ask(
        `For the data set ${values.join(", ")}, what is the ${wantMean ? "mean" : "median"}?`,
        wantMean ? mean : median,
        wantMean
          ? [median, String(sorted[0]), String(sorted[4]), frac(sum, n - 1), String(sum)]
          : [mean, String(values[2]), String(sorted[0]), String(sorted[4]), ...nearMisses(sorted[2])],
        r,
      );
    },
  ],
};
