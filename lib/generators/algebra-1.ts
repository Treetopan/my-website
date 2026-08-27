import "server-only";

import {
  among,
  ask,
  frac,
  head,
  poly,
  fill,
  line,
  nearMisses,
  point,
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

  // ── 2.4 Literal equations ──
  "math/algebra-1/unit-2/2.4": [
    // Typed rather than chosen: four rearrangements of the same formula are
    // hard to tell apart at a glance, which tests reading rather than algebra.
    (r) => {
      const a = r.coefficient(9);
      const b = r.nonzero(-15, 15);
      const y = r.nonzero(-9, 9);
      const value = frac(y - b, a);
      return fill(
        `If y = ${head(a, "x")}${signed(b)}, what is x when y = ${y}?`,
        value,
        { hint: "a number or fraction" },
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

  // ── 3.1 Relations, domain and range ──
  "math/algebra-1/unit-3/3.1": [
    // Plotting a point is the one thing four options cannot ask. Either the
    // options give the quadrant away or the student reads rather than places.
    (r) => {
      const span = 8;
      const x = r.nonzero(-span, span);
      const y = r.nonzero(-span, span);
      return point(`Plot the point (${x}, ${y}).`, { span, x, y });
    },
    // Reflection, which is a question about where things go rather than what
    // they are called.
    (r) => {
      const span = 8;
      const x = r.nonzero(-span, span);
      const y = r.nonzero(-span, span);
      const axis = r.bool();
      return point(
        `Plot the reflection of (${x}, ${y}) across the ${axis ? "x" : "y"}-axis.`,
        { span, x: axis ? x : -x, y: axis ? -y : y },
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

  // ── 4.3 Graphing a line ──
  "math/algebra-1/unit-4/4.3": [
    // Drawing the line rather than picking its equation. Slope and intercept
    // stay small so the line crosses the visible grid at a readable angle.
    (r) => {
      const span = 8;
      const slope = r.nonzero(-3, 3);
      const intercept = r.int(-4, 4);
      return line(
        `Draw the line y = ${head(slope, "x")}${signed(intercept)}.`,
        { span, slope, intercept },
      );
    },
    // The same skill from two points, which is where slope stops being a
    // formula and becomes a direction.
    (r) => {
      const span = 8;
      const slope = r.nonzero(-3, 3);
      const intercept = r.int(-4, 4);
      const x1 = r.int(-3, 0);
      const x2 = r.int(1, 3);
      return line(
        `Draw the line through (${x1}, ${slope * x1 + intercept}) and (${x2}, ${slope * x2 + intercept}).`,
        { span, slope, intercept },
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
  // ── 1.2 Properties of operations ──
  "math/algebra-1/unit-1/1.2": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const c = r.int(2, 9);
      const names = [
        "Commutative property of addition",
        "Commutative property of multiplication",
        "Associative property of addition",
        "Distributive property",
        "Identity property of addition",
      ];
      const forms = [
        { text: `${a} + ${b} = ${b} + ${a}`, name: names[0] },
        { text: `${a} · ${b} = ${b} · ${a}`, name: names[1] },
        { text: `(${a} + ${b}) + ${c} = ${a} + (${b} + ${c})`, name: names[2] },
        { text: `${a}(${b} + ${c}) = ${a} · ${b} + ${a} · ${c}`, name: names[3] },
        { text: `${a} + 0 = ${a}`, name: names[4] },
      ];
      const shown = r.pick(forms);
      return among(`Which property is shown?   ${shown.text}`, shown.name, names, r);
    },
  ],

  // ── 1.3 Order of operations ──
  "math/algebra-1/unit-1/1.3": [
    // Multiplication before addition. The distractor is the left-to-right read.
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 9);
      const c = r.int(2, 8);
      const value = a + b * c;
      return ask(
        `Evaluate:   ${a} + ${b} · ${c}`,
        value,
        [(a + b) * c, a * b + c, a + b + c, ...nearMisses(value)],
        r,
      );
    },
    // Brackets, then the exponent, then the rest.
    (r) => {
      const a = r.int(2, 6);
      const b = r.int(1, 5);
      const c = r.int(2, 9);
      const value = (a + b) ** 2 - c;
      return ask(
        `Evaluate:   (${a} + ${b})^2 - ${c}`,
        value,
        [a ** 2 + b ** 2 - c, (a + b) ** 2 + c, (a + b - c) ** 2, ...nearMisses(value)],
        r,
      );
    },
  ],

  // ── 1.4 Terms, coefficients and like terms ──
  "math/algebra-1/unit-1/1.4": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const c = r.int(2, 9);
      const answer = head(a + c, "x") + signed(b, "y");
      return ask(
        `Simplify:   ${head(a, "x")}${signed(b, "y")}${signed(c, "x")}`,
        answer,
        [
          // Everything added, as though x and y were the same letter.
          head(a + b + c, "x"),
          head(a, "x") + signed(b + c, "y"),
          head(a * c, "x") + signed(b, "y"),
          head(a + c, "x") + signed(b, "x"),
          head(a + c, "xy") + signed(b, "y"),
        ],
        r,
      );
    },
  ],

  // ── 1.5 Translating words into algebra ──
  "math/algebra-1/unit-1/1.5": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      return ask(
        `Which expression is "${b} less than ${a} times a number n"?`,
        `${a}n - ${b}`,
        [`${b} - ${a}n`, `${a}(n - ${b})`, `${b}n - ${a}`, `${a}n + ${b}`, `${a} - ${b}n`],
        r,
      );
    },
  ],

  // ── 1.8 Simplifying square roots ──
  "math/algebra-1/unit-1/1.8": [
    (r) => {
      const outside = r.int(2, 7);
      const inside = r.pick([2, 3, 5, 6, 7, 10, 11, 13, 14, 15]);
      const n = outside * outside * inside;
      return ask(
        `Simplify:   √${n}`,
        radical(n),
        [
          `${outside * inside}`,
          `${outside + inside}`,
          `${inside}√${outside}`,
          `${outside}√${inside * 2}`,
          `${outside * 2}√${inside}`,
        ],
        r,
      );
    },
  ],

  // ── 2.3 Equations with fractions and decimals ──
  "math/algebra-1/unit-2/2.3": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.nonzero(-9, 9);
      const root = r.nonzero(-9, 9);
      const c = root + b;
      return fill(
        `Solve for x:   x/${a}${signed(b)} = ${c}`,
        a * root,
        { hint: "Clear the fraction first" },
      );
    },
  ],

  // ── 2.5 No solution, or infinitely many ──
  "math/algebra-1/unit-2/2.5": [
    (r) => {
      const a = r.int(2, 6);
      const b = r.int(2, 9);
      const c = r.int(2, 7);
      const kind = r.int(0, 2);

      // Same expression twice, the same expression plus a lie, or an honest
      // equation with one root — which is what the other two are measured
      // against.
      const left = `${a}(${head(c, "x")} + ${b})`;
      const right =
        kind === 0
          ? `${head(a * c, "x")} + ${a * b}`
          : kind === 1
            ? `${head(a * c, "x")} + ${a * b + r.int(1, 5)}`
            : `${head(a * c + r.int(1, 4), "x")} + ${a * b}`;

      const answers = [
        "Infinitely many solutions",
        "No solution",
        "Exactly one solution",
        "Exactly two solutions",
      ];
      return among(`How many solutions?   ${left} = ${right}`, answers[kind], answers, r);
    },
  ],

  // ── 2.6 Linear inequalities ──
  "math/algebra-1/unit-2/2.6": [
    // Dividing by a negative turns the sign round. Every distractor here is
    // that step going wrong in one of the ways it can.
    (r) => {
      const a = r.int(2, 9);
      const root = r.nonzero(-8, 8);
      const b = a * root;
      return ask(
        `Solve:   ${head(-a, "x")}${signed(b)} < 0`,
        `x > ${root}`,
        [`x < ${root}`, `x > ${-root}`, `x < ${-root}`, `x > ${b}`, `x < ${b - a}`],
        r,
      );
    },
  ],

  // ── 2.7 Compound inequalities ──
  "math/algebra-1/unit-2/2.7": [
    (r) => {
      const b = r.int(2, 9);
      const low = r.int(-6, 2);
      const high = low + r.int(2, 8);
      return ask(
        `Solve:   ${low} < x + ${b} < ${high}`,
        `${low - b} < x < ${high - b}`,
        [
          `${low + b} < x < ${high + b}`,
          `${low - b} < x < ${high + b}`,
          `${low} < x < ${high}`,
          `${b - low} < x < ${b + high}`,
          `${low - b} < x < ${high - b - 1}`,
        ],
        r,
      );
    },
  ],

  // ── 2.9 Absolute value inequalities ──
  "math/algebra-1/unit-2/2.9": [
    (r) => {
      const k = r.int(2, 12);
      const less = r.bool();
      const answer = less ? `-${k} < x < ${k}` : `x < -${k} or x > ${k}`;
      return ask(
        `Solve:   |x| ${less ? "<" : ">"} ${k}`,
        answer,
        [
          less ? `x < -${k} or x > ${k}` : `-${k} < x < ${k}`,
          `x ${less ? "<" : ">"} ${k}`,
          `x ${less ? "<" : ">"} -${k}`,
          `-${k} < x < ${k + 1}`,
          `x < -${k + 1} or x > ${k + 1}`,
        ],
        r,
      );
    },
  ],

  // ── 3.2 Functions and the vertical line test ──
  "math/algebra-1/unit-3/3.2": [
    (r) => {
      // One input used twice is the whole of what makes a relation not a
      // function, so the wrong answers differ from the right one only in that.
      const x = [r.int(-8, -5), r.int(-3, 0), r.int(3, 6)];
      const y = () => r.int(-9, 9);
      const set = (xs: number[]) =>
        `{(${xs[0]}, ${y()}), (${xs[1]}, ${y()}), (${xs[2]}, ${y()})}`;
      return ask(
        "Which relation is NOT a function?",
        set([x[0], x[0], x[2]]),
        [set(x), set([x[0], x[1], x[2] + 1]), set([x[0] - 1, x[1], x[2]]), set([x[0], x[1] + 1, x[2]])],
        r,
      );
    },
  ],

  // ── 3.4 Discrete and continuous domains ──
  "math/algebra-1/unit-3/3.4": [
    (r) => {
      const n = r.int(3, 12);
      const discrete = [
        `the number of chairs in ${n} rows`,
        `the number of tickets sold in ${n} hours`,
        `the number of buses needed for ${n} classes`,
      ];
      const continuous = [
        `the distance walked in ${n} minutes`,
        `the water in a tank after ${n} minutes`,
        `the temperature over ${n} hours`,
        `the height of a plant after ${n} weeks`,
      ];
      return ask(
        "Which of these has a discrete domain?",
        r.pick(discrete),
        continuous,
        r,
      );
    },
  ],

  // ── 3.5 Reading a graph: intercepts ──
  "math/algebra-1/unit-3/3.5": [
    (r) => {
      const m = r.nonzero(-4, 4);
      const root = r.int(-6, 6);
      const b = -m * root;
      return point(
        `Place the x-intercept of   y = ${head(m, "x")}${signed(b)}`,
        { span: 10, x: root, y: 0 },
      );
    },
  ],

  // ── 3.6 Piecewise functions ──
  "math/algebra-1/unit-3/3.6": [
    (r) => {
      const cut = r.int(-3, 3);
      const a = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      const below = r.bool();
      const at = below ? cut - r.int(1, 4) : cut + r.int(1, 4);
      const value = below ? a * at + b : c - at;
      return fill(
        `f(x) = ${head(a, "x")}${signed(b)} when x < ${cut}, and f(x) = ${c} - x when x ≥ ${cut}.   Find f(${at}).`,
        value,
        { hint: "Which piece is x in?" },
      );
    },
  ],

  // ── 3.7 Absolute value functions ──
  "math/algebra-1/unit-3/3.7": [
    (r) => {
      const a = r.int(2, 6);
      const b = r.int(2, 12);
      const c = r.nonzero(-9, 9);
      const at = r.int(-6, 6);
      const inner = a * at - b;
      const value = Math.abs(inner) + c;
      return ask(
        `f(x) = |${head(a, "x")} - ${b}|${signed(c)}.   Find f(${at}).`,
        value,
        [inner + c, Math.abs(inner + c), Math.abs(inner) - c, ...nearMisses(value)],
        r,
      );
    },
  ],

  // ── 3.8 Transformations of a graph ──
  "math/algebra-1/unit-3/3.8": [
    (r) => {
      const h = r.int(2, 8);
      const k = r.int(2, 8);
      const right = r.bool();
      const up = r.bool();
      const inside = right ? `x - ${h}` : `x + ${h}`;
      const shift = (across: boolean, along: boolean, a: number, b: number) =>
        `${across ? "right" : "left"} ${a}, ${along ? "up" : "down"} ${b}`;
      return ask(
        `How does the graph of   y = (${inside})^2 ${up ? "+" : "-"} ${k}   sit against y = x^2?`,
        shift(right, up, h, k),
        [
          shift(!right, up, h, k),
          shift(right, !up, h, k),
          shift(!right, !up, h, k),
          shift(right, up, k, h),
        ],
        r,
      );
    },
  ],

  // ── 4.4 Standard form and intercepts ──
  "math/algebra-1/unit-4/4.4": [
    (r) => {
      const a = r.int(2, 8);
      const b = r.int(2, 8);
      const x = r.nonzero(-6, 6);
      const c = a * x;
      // c is a multiple of a, so the x-intercept is whole; the y-intercept is
      // left as a fraction, which is where the interesting mistakes live.
      return ask(
        `Where does   ${head(a, "x")} + ${head(b, "y")} = ${c}   cross the x-axis?`,
        `(${x}, 0)`,
        [`(0, ${x})`, `(${frac(c, b)}, 0)`, `(0, ${frac(c, b)})`, `(${c}, 0)`, `(${-x}, 0)`],
        r,
      );
    },
  ],

  // ── 4.5 Converting between forms ──
  "math/algebra-1/unit-4/4.5": [
    (r) => {
      const m = r.coefficient(6);
      const b = r.nonzero(-9, 9);
      // y = mx + b becomes -mx + y = b, and then A is made positive.
      const flip = m > 0;
      const A = flip ? m : -m;
      const B = flip ? -1 : 1;
      const C = flip ? -b : b;
      const answer = `${head(A, "x")}${signed(B, "y")} = ${C}`;
      return ask(
        `Write   y = ${head(m, "x")}${signed(b)}   in standard form.`,
        answer,
        [
          `${head(m, "x")}${signed(1, "y")} = ${b}`,
          `${head(A, "x")}${signed(-B, "y")} = ${C}`,
          `${head(A, "x")}${signed(B, "y")} = ${-C}`,
          `${head(-A, "x")}${signed(B, "y")} = ${C}`,
        ],
        r,
      );
    },
  ],

  // ── 4.7 An equation from two points ──
  "math/algebra-1/unit-4/4.7": [
    (r) => {
      const m = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const x1 = r.int(-6, 0);
      const x2 = x1 + r.int(1, 6);
      const y1 = m * x1 + b;
      const y2 = m * x2 + b;
      return ask(
        `Which line passes through (${x1}, ${y1}) and (${x2}, ${y2})?`,
        `y = ${head(m, "x")}${signed(b)}`,
        [
          `y = ${head(m, "x")}${signed(-b)}`,
          `y = ${head(-m, "x")}${signed(b)}`,
          `y = ${head(b, "x")}${signed(m)}`,
          `y = ${head(m, "x")}${signed(y1)}`,
          `y = ${head(m + 1, "x")}${signed(b)}`,
        ],
        r,
      );
    },
  ],

  // ── 4.8 Inequalities in two variables ──
  "math/algebra-1/unit-4/4.8": [
    (r) => {
      const m = r.coefficient(4);
      const b = r.nonzero(-6, 6);
      const at = (x: number, above: number) => `(${x}, ${m * x + b + above})`;
      const xs = [r.int(-5, -3), r.int(-2, 0), r.int(1, 3), r.int(4, 6)];
      return ask(
        `Which point is a solution of   y > ${head(m, "x")}${signed(b)} ?`,
        at(xs[0], r.int(1, 4)),
        [at(xs[1], 0), at(xs[2], -r.int(1, 4)), at(xs[3], -r.int(1, 4)), at(xs[1], -r.int(5, 8))],
        r,
      );
    },
  ],

  // ── 4.9 Arithmetic sequences as linear functions ──
  "math/algebra-1/unit-4/4.9": [
    (r) => {
      const first = r.nonzero(-9, 9);
      const d = r.coefficient(6);
      const terms = [0, 1, 2, 3].map((n) => first + n * d);
      const c = first - d;
      return ask(
        `Which rule gives the sequence ${terms.join(", ")}, …?`,
        `a(n) = ${head(d, "n")}${signed(c)}`,
        [
          `a(n) = ${head(d, "n")}${signed(first)}`,
          `a(n) = ${head(first, "n")}${signed(d)}`,
          `a(n) = ${head(-d, "n")}${signed(c)}`,
          `a(n) = ${head(d, "n")}${signed(c + d)}`,
          `a(n) = ${head(d + 1, "n")}${signed(c)}`,
        ],
        r,
      );
    },
  ],

  // ── 5.1 Systems by graphing ──
  "math/algebra-1/unit-5/5.1": [
    // Placed rather than picked: the point of graphing a system is that the
    // solution is somewhere, and four coordinates in a list hand that over.
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-6, 6);
      const slopes = [-3, -2, -1, 1, 2, 3];
      const m1 = r.pick(slopes);
      const m2 = r.pick(slopes.filter((s) => s !== m1));
      return point(
        `Place the solution of   y = ${head(m1, "x")}${signed(y - m1 * x)}   and   y = ${head(m2, "x")}${signed(y - m2 * x)}`,
        { span: 10, x, y },
      );
    },
  ],

  // ── 5.2 Substitution ──
  "math/algebra-1/unit-5/5.2": [
    (r) => {
      const x = r.nonzero(-6, 6);
      const y = r.nonzero(-6, 6);
      const m = r.coefficient(4);
      const b = y - m * x;
      const a = r.int(2, 5);
      const c = a * x + y;
      return ask(
        `Solve:   y = ${head(m, "x")}${signed(b)}   and   ${head(a, "x")} + y = ${c}`,
        `(${x}, ${y})`,
        [`(${y}, ${x})`, `(${-x}, ${y})`, `(${x}, ${-y})`, `(${x + 1}, ${y})`, `(${x}, ${y + 1})`],
        r,
      );
    },
  ],

  // ── 5.4 Choosing a method ──
  "math/algebra-1/unit-5/5.4": [
    (r) => {
      const m = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const a = r.int(2, 6);
      const c = r.nonzero(-9, 20);
      return ask(
        `y = ${head(m, "x")}${signed(b)} and ${head(a, "x")} + y = ${c}. Which method is quickest here?`,
        "Substitution — one equation is already solved for y",
        [
          "Elimination — the coefficients already cancel",
          "Graphing — the intersection can be read off",
          "Matrices — the system needs to be inverted",
          "Guess and check — the numbers are small",
        ],
        r,
      );
    },
  ],

  // ── 5.5 Systems with no solution, or infinitely many ──
  "math/algebra-1/unit-5/5.5": [
    (r) => {
      const m = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const k = r.int(2, 4);
      const kind = r.int(0, 2);

      // Same line twice, parallel lines, or two lines that genuinely cross.
      const second =
        kind === 0
          ? `${head(k * m, "x")}${signed(-k, "y")} = ${-k * b}`
          : kind === 1
            ? `${head(k * m, "x")}${signed(-k, "y")} = ${-k * b + r.int(1, 6)}`
            : `${head(k * m + 1, "x")}${signed(-k, "y")} = ${-k * b}`;

      const answers = [
        "Infinitely many solutions",
        "No solution",
        "Exactly one solution",
        "Exactly two solutions",
      ];
      return among(
        `How many solutions?   y = ${head(m, "x")}${signed(b)}   and   ${second}`,
        answers[kind],
        answers,
        r,
      );
    },
  ],

  // ── 5.6 Break-even and mixture ──
  "math/algebra-1/unit-5/5.6": [
    (r) => {
      const perUnit = r.int(2, 9);
      const margin = r.pick([1, 2, 4, 5]);
      const n = r.int(5, 40);
      const fixed = margin * n;
      return fill(
        `A stall costs ${fixed} to set up plus ${perUnit} a bag, and sells bags at ${perUnit + margin} each. How many bags break even?`,
        n,
        { unit: "bags", hint: "Cost = revenue" },
      );
    },
  ],

  // ── 5.7 Systems of inequalities ──
  "math/algebra-1/unit-5/5.7": [
    (r) => {
      const a = r.int(1, 6);
      const total = a + r.int(4, 10);
      const x = r.int(1, 2);
      // Above the first line and inside the second, with room to spare either
      // way, so no roll puts the right answer on a boundary.
      const y = a + 1;
      return ask(
        `Which point satisfies both   y > ${a}   and   x + y < ${total} ?`,
        `(${x}, ${y})`,
        [`(${x}, ${a})`, `(${x}, ${a - 1})`, `(${total}, ${y})`, `(${x}, ${total})`, `(${x}, ${a - 2})`],
        r,
      );
    },
  ],

  // ── 5.8 Linear programming ──
  "math/algebra-1/unit-5/5.8": [
    (r) => {
      const a = r.int(2, 8);
      const b = r.int(2, 8);
      const corners: [number, number][] = [
        [0, 0],
        [r.int(3, 9), 0],
        [r.int(1, 5), r.int(3, 8)],
        [0, r.int(2, 9)],
      ];
      const values = corners.map(([x, y]) => a * x + b * y);
      const best = Math.max(...values);
      return fill(
        `Maximise P = ${a}x + ${b}y over the corner points ${corners.map(([x, y]) => `(${x}, ${y})`).join(", ")}.`,
        best,
        { hint: "Test every corner" },
      );
    },
  ],
  // ── 6.1 Classifying polynomials ──
  "math/algebra-1/unit-6/6.1": [
    (r) => {
      const degrees = ["Linear", "Quadratic", "Cubic"];
      const counts = ["monomial", "binomial", "trinomial"];
      const d = r.int(0, 2);
      const t = r.int(0, d === 0 ? 1 : 2);

      const coefficients: [number, number][] = [[r.coefficient(9), d + 1]];
      if (t >= 1) coefficients.push([r.coefficient(9), d]);
      if (t === 2) coefficients.push([r.nonzero(-9, 9), 0]);

      const answer = `${degrees[d]} ${counts[t]}`;
      const all = degrees.flatMap((deg) => counts.map((c) => `${deg} ${c}`));
      return among(`Classify:   ${poly(coefficients)}`, answer, all, r);
    },
  ],

  // ── 6.2 Adding and subtracting polynomials ──
  "math/algebra-1/unit-6/6.2": [
    (r) => {
      const a = [r.coefficient(7), r.coefficient(7), r.nonzero(-9, 9)];
      const b = [r.coefficient(7), r.coefficient(7), r.nonzero(-9, 9)];
      const take = r.bool();
      const s = take ? -1 : 1;
      const sum: [number, number][] = [
        [a[0] + s * b[0], 2],
        [a[1] + s * b[1], 1],
        [a[2] + s * b[2], 0],
      ];
      return ask(
        `Simplify:   (${poly([[a[0], 2], [a[1], 1], [a[2], 0]])}) ${take ? "-" : "+"} (${poly([[b[0], 2], [b[1], 1], [b[2], 0]])})`,
        poly(sum),
        [
          // Subtraction distributed over the first term only, which is the
          // mistake the bracket exists to invite.
          poly([[a[0] + s * b[0], 2], [a[1] - s * b[1], 1], [a[2] - s * b[2], 0]]),
          poly([[a[0] - s * b[0], 2], [a[1] + s * b[1], 1], [a[2] + s * b[2], 0]]),
          poly([[a[0] * b[0], 2], [a[1] + s * b[1], 1], [a[2] + s * b[2], 0]]),
          poly([[a[0] + s * b[0], 2], [a[1] + s * b[1], 1], [a[2] - s * b[2], 0]]),
          poly([[a[0] + s * b[0], 3], [a[1] + s * b[1], 1], [a[2] + s * b[2], 0]]),
        ],
        r,
      );
    },
  ],

  // ── 6.5 The greatest common factor ──
  "math/algebra-1/unit-6/6.5": [
    (r) => {
      const g = r.int(2, 9);
      const p = r.pick([2, 3, 5, 7]);
      const rolled = r.nonzero(-9, 9);
      const q = rolled % p === 0 ? rolled + 1 : rolled;
      return ask(
        `Factor:   ${poly([[g * p, 2], [g * q, 1]])}`,
        `${g}x(${head(p, "x")}${signed(q)})`,
        [
          `${g}(${head(p, "x")}${signed(q)})`,
          `${g}x(${head(p, "x")}${signed(q * g)})`,
          `x(${head(g * p, "x")}${signed(q)})`,
          `${g * p}x(x${signed(q)})`,
          `${g}x(${head(p, "x")}${signed(-q)})`,
        ],
        r,
      );
    },
  ],

  // ── 6.7 Trinomials with a leading coefficient ──
  "math/algebra-1/unit-6/6.7": [
    (r) => {
      const a = r.pick([2, 3, 5]);
      const rolled = r.nonzero(-6, 6);
      const p = rolled % a === 0 ? rolled + 1 : rolled;
      const q = r.nonzero(-6, 6);
      // (ax + p)(x + q), multiplied out.
      const terms: [number, number][] = [
        [a, 2],
        [a * q + p, 1],
        [p * q, 0],
      ];
      return ask(
        `Factor:   ${poly(terms)}`,
        `(${head(a, "x")}${signed(p)})(x${signed(q)})`,
        [
          `(${head(a, "x")}${signed(q)})(x${signed(p)})`,
          `(${head(a, "x")}${signed(-p)})(x${signed(-q)})`,
          `(x${signed(p)})(x${signed(a * q)})`,
          `(${head(a, "x")}${signed(p * q)})(x${signed(1)})`,
          `(${head(a, "x")}${signed(p + q)})(x${signed(q)})`,
        ],
        r,
      );
    },
  ],

  // ── 6.8 Factoring by grouping ──
  "math/algebra-1/unit-6/6.8": [
    (r) => {
      const a = r.nonzero(-6, 6);
      const b = r.int(2, 8);
      // x^3 + a x^2 + b x + ab  =  (x + a)(x^2 + b)
      const terms: [number, number][] = [
        [1, 3],
        [a, 2],
        [b, 1],
        [a * b, 0],
      ];
      return ask(
        `Factor by grouping:   ${poly(terms)}`,
        `(x${signed(a)})(x^2${signed(b)})`,
        [
          `(x${signed(b)})(x^2${signed(a)})`,
          `(x${signed(-a)})(x^2${signed(b)})`,
          `(x${signed(a)})(x^2${signed(-b)})`,
          `(x${signed(a)})(x${signed(b)})`,
          `(x^2${signed(a)})(x${signed(b)})`,
        ],
        r,
      );
    },
  ],

  // ── 6.9 Sums and differences of cubes ──
  "math/algebra-1/unit-6/6.9": [
    (r) => {
      const a = r.int(2, 5);
      const plus = r.bool();
      const cube = a ** 3;
      const answer = plus
        ? `(x + ${a})(x^2 - ${a}x + ${a * a})`
        : `(x - ${a})(x^2 + ${a}x + ${a * a})`;
      return ask(
        `Factor:   x^3 ${plus ? "+" : "-"} ${cube}`,
        answer,
        [
          plus
            ? `(x + ${a})(x^2 + ${a}x + ${a * a})`
            : `(x - ${a})(x^2 - ${a}x + ${a * a})`,
          plus
            ? `(x - ${a})(x^2 - ${a}x + ${a * a})`
            : `(x + ${a})(x^2 + ${a}x + ${a * a})`,
          plus
            ? `(x + ${a})(x^2 - ${a * a}x + ${a})`
            : `(x - ${a})(x^2 + ${a * a}x + ${a})`,
          `(x ${plus ? "+" : "-"} ${a})^3`,
        ],
        r,
      );
    },
  ],

  // ── 6.10 Factoring completely ──
  "math/algebra-1/unit-6/6.10": [
    (r) => {
      const g = r.int(2, 6);
      const a = r.int(2, 9);
      return ask(
        `Factor completely:   ${poly([[g, 2], [0, 1], [-g * a * a, 0]])}`,
        `${g}(x - ${a})(x + ${a})`,
        [
          `(x - ${a})(x + ${a})`,
          `${g}(x - ${a})^2`,
          `${g}(x^2 - ${a * a})`,
          `${g}(x - ${a * a})(x + ${a * a})`,
          `${g}(x - ${a})(x - ${a})`,
        ],
        r,
      );
    },
  ],

  // ── 7.1 Axis of symmetry and vertex ──
  "math/algebra-1/unit-7/7.1": [
    (r) => {
      const a = r.pick([1, 1, 2, 3]);
      const h = r.nonzero(-5, 5);
      const b = -2 * a * h;
      const c = r.nonzero(-9, 9);
      return ask(
        `What is the axis of symmetry of   y = ${poly([[a, 2], [b, 1], [c, 0]])} ?`,
        `x = ${h}`,
        [`x = ${-h}`, `x = ${b}`, `x = ${-b}`, `x = ${c}`, `x = ${frac(b, a)}`],
        r,
      );
    },
  ],

  // ── 7.2 Vertex form ──
  "math/algebra-1/unit-7/7.2": [
    // Placed rather than picked: the vertex is a position, and four
    // coordinates in a list turn a spatial question into a reading exercise.
    (r) => {
      const h = r.int(-6, 6);
      const k = r.int(-6, 6);
      const inside = h === 0 ? "x" : h > 0 ? `x - ${h}` : `x + ${-h}`;
      return point(
        `Place the vertex of   y = (${inside})^2${signed(k)}`,
        { span: 8, x: h, y: k },
      );
    },
  ],

  // ── 7.3 Intercept form ──
  "math/algebra-1/unit-7/7.3": [
    (r) => {
      const p = r.nonzero(-8, 8);
      const rolled = p + r.int(1, 6);
      const q = rolled === 0 ? 1 : rolled;
      return ask(
        `Where does   y = (x${signed(-p)})(x${signed(-q)})   cross the x-axis?`,
        `x = ${Math.min(p, q)} and x = ${Math.max(p, q)}`,
        [
          `x = ${Math.min(-p, -q)} and x = ${Math.max(-p, -q)}`,
          `x = ${p} and x = ${-q}`,
          `x = ${p * q}`,
          `x = ${p + q}`,
          `x = ${Math.min(p, q)} only`,
        ],
        r,
      );
    },
  ],

  // ── 7.4 Solving by graphing ──
  "math/algebra-1/unit-7/7.4": [
    (r) => {
      const p = r.int(-6, 6);
      const q = p + r.int(1, 6);
      return fill(
        `The graph of   y = ${poly([[1, 2], [-(p + q), 1], [p * q, 0]])}   crosses the x-axis twice. What is the larger root?`,
        q,
        { hint: "Where does y reach zero?" },
      );
    },
  ],

  // ── 7.5 The Zero Product Property ──
  "math/algebra-1/unit-7/7.5": [
    (r) => {
      const a = r.int(2, 5);
      const p = r.nonzero(-7, 7);
      const q = r.nonzero(-7, 7);
      // (ax - p)(x - q) = 0
      return ask(
        `Solve:   (${head(a, "x")}${signed(-p)})(x${signed(-q)}) = 0`,
        `x = ${frac(p, a)} or x = ${q}`,
        [
          `x = ${frac(-p, a)} or x = ${-q}`,
          `x = ${p} or x = ${q}`,
          `x = ${frac(a, p)} or x = ${q}`,
          `x = ${frac(p, a)} or x = ${-q}`,
          `x = ${p * q}`,
        ],
        r,
      );
    },
  ],

  // ── 7.6 Solving by square roots ──
  "math/algebra-1/unit-7/7.6": [
    (r) => {
      const h = r.nonzero(-7, 7);
      const root = r.int(2, 9);
      const k = root * root;
      return ask(
        `Solve:   (x${signed(-h)})^2 = ${k}`,
        `x = ${h - root} or x = ${h + root}`,
        [
          `x = ${-root} or x = ${root}`,
          `x = ${h - k} or x = ${h + k}`,
          `x = ${h + root}`,
          `x = ${root - h} or x = ${root + h}`,
          `x = ${h - root * 2} or x = ${h + root * 2}`,
        ],
        r,
      );
    },
  ],

  // ── 7.7 Completing the square ──
  "math/algebra-1/unit-7/7.7": [
    (r) => {
      const half = r.nonzero(-7, 7);
      const b = 2 * half;
      const c = r.nonzero(-9, 9);
      const inside = half > 0 ? `x + ${half}` : `x - ${-half}`;
      const k = c - half * half;
      return ask(
        `Write   ${poly([[1, 2], [b, 1], [c, 0]])}   in vertex form.`,
        `(${inside})^2${signed(k)}`,
        [
          `(${inside})^2${signed(c)}`,
          `(${half > 0 ? `x - ${half}` : `x + ${-half}`})^2${signed(k)}`,
          `(${inside})^2${signed(c + half * half)}`,
          `(x${signed(b)})^2${signed(k)}`,
          `(${inside})^2${signed(k - 1)}`,
        ],
        r,
      );
    },
  ],

  // ── 7.10 Complex solutions ──
  "math/algebra-1/unit-7/7.10": [
    (r) => {
      const root = r.int(2, 9);
      const k = root * root;
      return ask(
        `Solve:   x^2 + ${k} = 0`,
        `x = ±${root}i`,
        [`x = ±${root}`, `x = ±${k}i`, `x = ${root}i`, `x = ±√${k}`, `x = ±${root * 2}i`],
        r,
      );
    },
  ],

  // ── 7.11 Modelling with quadratics ──
  "math/algebra-1/unit-7/7.11": [
    (r) => {
      const seconds = r.int(2, 6);
      const speed = 16 * seconds;
      return fill(
        `A ball's height in feet is   h(t) = -16t^2 + ${speed}t.   After how many seconds does it land?`,
        seconds,
        { unit: "seconds", hint: "Height back to zero" },
      );
    },
  ],

  // ── 8.2 Exponential growth ──
  "math/algebra-1/unit-8/8.2": [
    (r) => {
      const a = r.int(2, 12);
      const b = r.pick([2, 3, 4, 5]);
      const t = r.int(2, 4);
      const value = a * b ** t;
      return fill(
        `A colony starts at ${a} and multiplies by ${b} each hour. How many after ${t} hours?`,
        value,
        { hint: "Multiply, do not add" },
      );
    },
  ],

  // ── 8.3 Exponential decay ──
  "math/algebra-1/unit-8/8.3": [
    (r) => {
      const halvings = r.int(2, 5);
      const b = r.pick([2, 4]);
      const start = b ** halvings * r.int(1, 9);
      const value = start / b ** halvings;
      return fill(
        `A sample of ${start} mg is divided by ${b} every hour. How much is left after ${halvings} hours?`,
        value,
        { unit: "mg", hint: "Divide once an hour" },
      );
    },
  ],

  // ── 8.4 Graphing exponentials ──
  "math/algebra-1/unit-8/8.4": [
    (r) => {
      const a = r.int(2, 6);
      const b = r.pick([2, 3, 4]);
      const c = r.nonzero(-8, 8);
      return ask(
        `What is the horizontal asymptote of   y = ${a} · ${b}^x${signed(c)} ?`,
        `y = ${c}`,
        [`y = ${-c}`, "y = 0", `y = ${a}`, `y = ${a + c}`, `x = ${c}`],
        r,
      );
    },
  ],

  // ── 8.5 Comparing rates of growth ──
  "math/algebra-1/unit-8/8.5": [
    (r) => {
      const m = r.int(20, 90);
      const a = r.int(2, 9);
      const b = r.pick([2, 3]);
      return ask(
        `Which of these is largest once x is big enough?`,
        `y = ${b}^x`,
        [`y = ${m}x`, `y = ${a}x^2`, `y = ${m}x + ${a}`, `y = ${a}x^3`],
        r,
      );
    },
  ],

  // ── 8.6 Recursive and explicit rules ──
  "math/algebra-1/unit-8/8.6": [
    (r) => {
      const first = r.nonzero(-9, 9);
      const d = r.coefficient(6);
      return ask(
        `a(1) = ${first} and a(n) = a(n - 1)${signed(d)}. Which explicit rule is the same sequence?`,
        `a(n) = ${head(d, "n")}${signed(first - d)}`,
        [
          `a(n) = ${head(d, "n")}${signed(first)}`,
          `a(n) = ${head(first, "n")}${signed(d)}`,
          `a(n) = ${head(d, "n")}${signed(first + d)}`,
          `a(n) = ${head(-d, "n")}${signed(first - d)}`,
          `a(n) = ${head(d + 1, "n")}${signed(first - d)}`,
        ],
        r,
      );
    },
  ],

  // ── 8.7 Compound interest ──
  "math/algebra-1/unit-8/8.7": [
    (r) => {
      const principal = r.int(1, 20) * 100;
      const rate = r.pick([5, 10, 20, 25]);
      const years = r.int(2, 3);
      const value = principal * (1 + rate / 100) ** years;
      // Two decimals at most: money, and the sweep refuses anything longer.
      return fill(
        `$${principal} grows at ${rate}% a year, compounded yearly. What is it worth after ${years} years?`,
        Number(value.toFixed(2)),
        { unit: "dollars", hint: "Multiply by the growth factor each year" },
      );
    },
  ],

  // ── 9.2 Operations with radicals ──
  "math/algebra-1/unit-9/9.2": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const k = r.pick([2, 3, 5, 6, 7, 10, 11]);
      return ask(
        `Simplify:   ${a}√${k} + ${b}√${k}`,
        `${a + b}√${k}`,
        [
          `${a + b}√${k * 2}`,
          `${a * b}√${k}`,
          `${a + b}√${k + k}`,
          `${a}√${k * b}`,
          `${a + b + k}`,
        ],
        r,
      );
    },
  ],

  // ── 9.3 Radical equations ──
  "math/algebra-1/unit-9/9.3": [
    (r) => {
      const b = r.int(2, 9);
      const a = r.int(1, 20);
      const x = b * b - a;
      return fill(
        `Solve:   √(x + ${a}) = ${b}`,
        x,
        { hint: "Square both sides, then check it back" },
      );
    },
  ],

  // ── 9.4 Simplifying rational expressions ──
  "math/algebra-1/unit-9/9.4": [
    (r) => {
      const a = r.int(2, 9);
      return ask(
        `Simplify:   (x^2 - ${a * a}) / (x - ${a})`,
        `x + ${a}`,
        [`x - ${a}`, `x + ${a * a}`, `x^2 + ${a}`, `${a}x`, `x - ${a * a}`],
        r,
      );
    },
  ],

  // ── 9.5 Multiplying rational expressions ──
  "math/algebra-1/unit-9/9.5": [
    (r) => {
      const pool = [-7, -5, -3, -2, 2, 3, 5, 7];
      const a = r.pick(pool);
      const b = r.pick(pool.filter((v) => v !== a));
      const c = r.pick(pool.filter((v) => v !== a && v !== b));
      return ask(
        `Simplify:   (x${signed(a)})/(x${signed(b)}) · (x${signed(b)})/(x${signed(c)})`,
        `(x${signed(a)})/(x${signed(c)})`,
        [
          `(x${signed(c)})/(x${signed(a)})`,
          `(x${signed(a)})/(x${signed(b)})`,
          `(x${signed(b)})/(x${signed(c)})`,
          `(x${signed(a + c)})/(x${signed(b)})`,
          `(x${signed(a)})(x${signed(c)})`,
        ],
        r,
      );
    },
  ],

  // ── 9.6 Adding rational expressions ──
  "math/algebra-1/unit-9/9.6": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return ask(
        `Simplify:   ${a}/x + ${b}/x`,
        `${a + b}/x`,
        [
          `${a + b}/(2x)`,
          `${a * b}/x`,
          `${a + b}/x^2`,
          `${a * b}/x^2`,
          `${a + b}`,
        ],
        r,
      );
    },
  ],

  // ── 9.7 Rational equations ──
  "math/algebra-1/unit-9/9.7": [
    (r) => {
      const x = r.nonzero(-9, 9);
      const b = r.nonzero(-6, 6);
      const a = b * x;
      return fill(
        `Solve:   ${a}/x = ${b}`,
        x,
        { hint: "Multiply through by x" },
      );
    },
  ],

  // ── 9.8 Direct and inverse variation ──
  "math/algebra-1/unit-9/9.8": [
    (r) => {
      const k = r.int(2, 9);
      const x1 = r.int(2, 9);
      const x2 = r.int(2, 9);
      const direct = r.bool();
      return fill(
        direct
          ? `y varies directly with x, and y = ${k * x1} when x = ${x1}. What is y when x = ${x2}?`
          : `y varies inversely with x, and y = ${k * x2} when x = 1. What is y when x = ${x2}?`,
        k,
        { hint: direct ? "Find the constant first" : "xy stays the same" },
      );
    },
  ],

  // ── 10.2 The five-number summary ──
  "math/algebra-1/unit-10/10.2": [
    (r) => {
      const start = r.int(1, 20);
      const gaps = Array.from({ length: 6 }, () => r.int(1, 6));
      const values: number[] = [start];
      for (const gap of gaps) values.push(values[values.length - 1] + gap);
      const q1 = values[1];
      const q3 = values[5];
      const median = values[3];
      return ask(
        `For ${values.join(", ")}, what is the interquartile range?`,
        q3 - q1,
        [
          median,
          values[6] - values[0],
          q3 + q1,
          values[6] - median,
          ...nearMisses(q3 - q1),
        ],
        r,
      );
    },
  ],

  // ── 10.3 Shapes of distributions ──
  "math/algebra-1/unit-10/10.3": [
    (r) => {
      const mean = r.int(20, 60);
      const gap = r.int(3, 12);
      const right = r.bool();
      const median = right ? mean - gap : mean + gap;
      return among(
        `A distribution has mean ${mean} and median ${median}. What shape is it?`,
        right ? "Skewed right" : "Skewed left",
        ["Skewed right", "Skewed left", "Symmetric", "Uniform"],
        r,
      );
    },
  ],

  // ── 10.4 Scatter plots and correlation ──
  "math/algebra-1/unit-10/10.4": [
    (r) => {
      const strong = r.bool();
      const negative = r.bool();
      const size = strong ? r.int(85, 97) : r.int(20, 45);
      const value = `${negative ? "-" : ""}0.${size}`;
      const answer = `${strong ? "Strong" : "Weak"} ${negative ? "negative" : "positive"}`;
      return among(
        `A scatter plot has correlation coefficient r = ${value}. How would you describe it?`,
        answer,
        [
          "Strong negative",
          "Strong positive",
          "Weak negative",
          "Weak positive",
        ],
        r,
      );
    },
  ],

  // ── 10.5 Lines of best fit and residuals ──
  "math/algebra-1/unit-10/10.5": [
    (r) => {
      const m = r.int(2, 9);
      const b = r.int(1, 20);
      const x = r.int(2, 9);
      const predicted = m * x + b;
      const residual = r.nonzero(-9, 9);
      return fill(
        `The line of best fit is   y = ${head(m, "x")} + ${b}.   The actual value at x = ${x} is ${predicted + residual}. What is the residual?`,
        residual,
        { hint: "Actual minus predicted" },
      );
    },
  ],

  // ── 10.6 Two-way frequency tables ──
  "math/algebra-1/unit-10/10.6": [
    (r) => {
      const a = r.int(5, 30);
      const b = r.int(5, 30);
      const c = r.int(5, 30);
      const d = r.int(5, 30);
      const total = a + b + c + d;
      return ask(
        `Of ${total} students, ${a} walk and cycle, ${b} walk only, ${c} cycle only and ${d} do neither. How many walk?`,
        a + b,
        [a, a + c, b + d, total - a, ...nearMisses(a + b)],
        r,
      );
    },
  ],

  // ── 10.7 Correlation and causation ──
  "math/algebra-1/unit-10/10.7": [
    (r) => {
      const n = r.int(30, 90);
      return ask(
        `Ice cream sales and sunburns both rise together across ${n} days. What does that show?`,
        "They are correlated, and something else may cause both",
        [
          "Ice cream causes sunburn",
          "Sunburn causes ice cream sales",
          "One must cause the other",
          "There is no relationship at all",
        ],
        r,
      );
    },
  ],
};
