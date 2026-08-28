import "server-only";

import {
  among,
  ask,
  dot,
  frac,
  graph,
  head,
  isSquare,
  poly,
  fill,
  line,
  order,
  plot,
  point,
  radical,
  signed,
  slider,
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
    // Counting rather than classifying one value: the same knowledge, but you
    // have to apply it five times and a lucky guess gets you nowhere.
    (r) => {
      const pool = [
        { text: "3/4", irrational: false },
        { text: "√16", irrational: false },
        { text: "√7", irrational: true },
        { text: "-5", irrational: false },
        { text: "π", irrational: true },
        { text: "0.25", irrational: false },
        { text: "√2", irrational: true },
        { text: "√25", irrational: false },
        { text: "-2/3", irrational: false },
        { text: "√11", irrational: true },
      ];
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = r.int(0, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const shown = shuffled.slice(0, 5);
      return fill(
        `How many of these are irrational? ${shown.map((s) => s.text).join(", ")}`,
        shown.filter((s) => s.irrational).length,
        { hint: "a number from 0 to 5" },
      );
    },
    (r) =>
      order(
        "Put these sets in order, each one inside the next.",
        [
          "Natural numbers",
          "Whole numbers",
          "Integers",
          "Rational numbers",
          "Real numbers",
        ],
        r,
      ),
  ],

  // ── 1.6 Exponent rules ──
  "math/algebra-1/unit-1/1.6": [
    // Product rule: add the exponents. The classic error multiplies them.
    (r) => {
      const v = r.pick(["x", "y", "a", "n"]);
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return fill(
        `Simplify: ${v}^${a} · ${v}^${b}`,
        `${v}^${a + b}`,
        { hint: "a power of the same letter" },
      );
    },
    // Quotient rule: subtract. Kept with a > b so the answer stays positive.
    (r) => {
      const v = r.pick(["x", "y", "m", "k"]);
      const b = r.int(2, 6);
      const a = b + r.int(2, 7);
      return fill(
        `Simplify: ${v}^${a} ÷ ${v}^${b}`,
        `${v}^${a - b}`,
        { hint: "a power of the same letter" },
      );
    },
    // Power of a power: multiply. The error adds, borrowing the product rule.
    (r) => {
      const v = r.pick(["x", "y", "p", "t"]);
      const a = r.int(2, 7);
      const b = r.int(2, 6);
      return fill(
        `Simplify: (${v}^${a})^${b}`,
        `${v}^${a * b}`,
        { hint: "a power of the same letter" },
      );
    },
    // Negative exponents, evaluated numerically so the reciprocal is concrete.
    (r) => {
      const base = r.pick([2, 3, 4, 5]);
      const n = r.int(2, 3);
      const value = base ** n;
      return fill(
        `Evaluate: ${base}^-${n}`,
        `1/${value}`,
        { hint: "a fraction" },
      );
    },
    // The rule run backwards: the result is given and one exponent is missing.
    (r) => {
      const v = r.pick(["x", "y", "a", "n"]);
      const known = r.int(2, 8);
      const missing = r.int(2, 8);
      return fill(
        `${v}^${known} · ${v}^? = ${v}^${known + missing}. What replaces the ?`,
        missing,
        { hint: "a number" },
      );
    },
    (r) => {
      const v = r.pick(["x", "y", "m", "k"]);
      const a = r.int(2, 7);
      const b = r.int(2, 5);
      return slider(`Place the exponent of the simplified form of (${v}^${a})^${b}.`, {
        min: 0,
        max: 40,
        step: 1,
        value: a * b,
      });
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
    (r) => {
      const lead = r.int(1, 9);
      const decimal = r.int(1, 9);
      const exponent = r.int(2, 6);
      return fill(
        `Write ${lead}.${decimal} × 10^${exponent} as a plain number.`,
        `${lead}${decimal}${"0".repeat(exponent - 1)}`,
        { hint: "the digits, written out" },
      );
    },
    // Kept under ten so the mantissa never needs renormalising, which is a
    // different rule and belongs in its own question.
    (r) => {
      const a = r.int(2, 3);
      const b = r.int(2, 3);
      const m = r.int(2, 6);
      const n = r.int(2, 6);
      return fill(
        `(${a} × 10^${m})(${b} × 10^${n}) is written as ${a * b} × 10^k. What is k?`,
        m + n,
        { hint: "a number" },
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
        return fill(
          `Solve for x:  x${signed(b)} = ${c}`,
          x,
          { hint: "a number" },
        );
      }
      const a = r.nonzero(-9, 9);
      const x = r.nonzero(-9, 9);
      const c = a * x;
      return fill(
        `Solve for x:  ${head(a, "x")} = ${c}`,
        x,
        { hint: "a number" },
      );
    },
    // Two steps: ax + b = c. The coefficient stays clear of ±1, which would
    // make this a one-step equation wearing a disguise.
    (r) => {
      const a = r.coefficient(8);
      const b = r.nonzero(-15, 15);
      const x = r.nonzero(-10, 10);
      const c = a * x + b;
      return fill(
        `Solve for x:  ${head(a, "x")}${signed(b)} = ${c}`,
        x,
        { hint: "a number" },
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
      return fill(
        `Solve for x:  ${head(a, "x")}${signed(b)} = ${c}`,
        frac(c - b, a),
        { hint: "a number or fraction" },
      );
    },
    // The solution is given and the coefficient is missing, so the equation
    // has to be run backwards. Same equation, opposite direction of work.
    (r) => {
      const k = r.nonzero(-9, 9);
      const x = r.int(2, 9);
      const b = r.nonzero(-15, 15);
      return fill(
        `kx${signed(b)} = ${k * x + b} has solution x = ${x}. What is k?`,
        k,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 5);
      const x = r.int(0, 15);
      const b = r.nonzero(-12, 12);
      return slider(`Solve ${a}x${signed(b)} = ${a * x + b} and place x.`, {
        min: 0,
        max: 15,
        step: 1,
        value: x,
      });
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
    (r) => {
      const l = r.int(2, 15);
      const w = r.int(2, 15);
      return fill(
        `A rectangle has perimeter P = 2l + 2w. If P = ${2 * l + 2 * w} and l = ${l}, what is w?`,
        w,
        { hint: "a number" },
      );
    },
    (r) => {
      const which = r.bool();
      return order(
        which
          ? "Put the steps for rearranging A = (a + b)h/2 to make b the subject in order."
          : "Put the steps for rearranging v = u + at to make a the subject in order.",
        which
          ? [
              "Multiply both sides by 2",
              "Divide both sides by h",
              "Subtract a from both sides",
              "Write b = 2A/h - a",
            ]
          : [
              "Subtract u from both sides",
              "Divide both sides by t",
              "Write a = (v - u)/t",
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
      return fill(
        `Solve for x:  ${head(a, "x")}${signed(b)} = ${head(c, "x")}${signed(d)}`,
        x,
        { hint: "a number" },
      );
    },
    // a(x + b) = c. The distractor that ignores the distribution is the point,
    // so the multiplier has to actually multiply — ±1 is no test of anything.
    (r) => {
      const a = r.coefficient(7);
      const b = r.nonzero(-9, 9);
      const x = r.nonzero(-9, 9);
      const c = a * (x + b);
      return fill(
        `Solve for x:  ${head(a)}(x${signed(b)}) = ${c}`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(3, 7);
      const c = r.int(1, a - 2);
      const b = r.int(1, 9);
      const d = r.nonzero(-12, 12);
      return order(
        `Put the steps for solving ${a}(x + ${b}) = ${head(c, "x")}${signed(d)} in order.`,
        [
          `Distribute the ${a} across the bracket`,
          `Subtract ${head(c, "x")} from both sides`,
          `Subtract ${a * b} from both sides`,
          `Divide both sides by ${a - c}`,
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
      return fill(
        `Solve |x${signed(b)}| = ${c}. What is the sum of the solutions?`,
        high + low,
        { hint: "a number" },
      );
    },
    // One root is handed over, so the question is about the pair rather than
    // about grinding the algebra a second time.
    (r) => {
      const h = r.int(-8, 8);
      const k = r.int(2, 9);
      return fill(
        `|x${signed(-h)}| = ${k} has one solution x = ${h + k}. What is the other?`,
        h - k,
        { hint: "a number" },
      );
    },
    (r) => {
      const h = r.int(-4, 4);
      const k = r.int(2, 5);
      return slider(`Solve |x${signed(-h)}| = ${k} and place the larger solution.`, {
        min: -10,
        max: 10,
        step: 1,
        value: h + k,
      });
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
      return fill(
        `If f(x) = ${poly([[a, 2], [b, 1], [c, 0]])}, what is f(${at})?`,
        value,
        { hint: "a number" },
      );
    },
    // The rule is what is missing rather than the output, so the substitution
    // has to be undone instead of carried out.
    (r) => {
      const a = r.int(2, 9);
      const b = r.nonzero(-12, 12);
      const x = r.int(2, 9);
      return fill(
        `f(x) = ax${signed(b)} and f(${x}) = ${a * x + b}. What is a?`,
        a,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 5);
      const b = r.nonzero(-9, 9);
      const x = r.int(-8, 8);
      return slider(
        `f(x) = ${a}x${signed(b)}. Place the input x for which f(x) = ${a * x + b}.`,
        { min: -10, max: 10, step: 1, value: x },
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
    (r) => {
      const xs = [r.int(-8, -1), r.int(0, 3), r.int(4, 8)];
      const ys = [r.int(-9, 9), r.int(-9, 9), r.int(-9, 9)];
      return fill(
        `A relation is {(${xs[0]}, ${ys[0]}), (${xs[1]}, ${ys[1]}), (${xs[2]}, ${ys[2]})}. What is the largest value in its range?`,
        Math.max(...ys),
        { hint: "a number" },
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
      return fill(
        `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
        frac(dy, dx),
        { hint: "a number or fraction" },
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
    (r) => {
      const x1 = r.int(-8, 0);
      const x2 = x1 + r.int(1, 6);
      const m = r.nonzero(-4, 4);
      const y1 = r.int(-6, 6);
      return slider(
        `Place the slope of the line through (${x1}, ${y1}) and (${x2}, ${y1 + m * (x2 - x1)}).`,
        { min: -6, max: 6, step: 1, value: m },
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
      return fill(
        `For y = ${head(m, "x")}${signed(b)}, what is the ${wantSlope ? "slope" : "y-intercept"}?`,
        wantSlope ? m : b,
        { hint: "a number" },
      );
    },
    // Evaluating the function, which is where the intercept stops being a
    // label to memorise and starts being a number that does something.
    (r) => {
      const m = r.nonzero(-8, 8);
      const b = r.nonzero(-10, 10);
      const x = r.nonzero(-7, 7);
      return fill(
        `If y = ${head(m, "x")}${signed(b)}, what is y when x = ${x}?`,
        m * x + b,
        { hint: "a number" },
      );
    },
    (r) => {
      const m = r.nonzero(-4, 4);
      const b = r.nonzero(-7, 7);
      return order(
        `Put the steps for graphing y = ${head(m, "x")}${signed(b)} by hand in order.`,
        [
          `Mark the y-intercept at (0, ${b})`,
          `From there, count ${Math.abs(m)} ${m > 0 ? "up" : "down"} and 1 across`,
          "Mark that second point",
          "Draw the line through the two points",
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
    (r) => {
      const m = r.nonzero(-5, 5);
      const p = r.int(-6, 6);
      const q = r.int(-6, 6);
      const t = p + r.nonzero(-4, 4);
      return fill(
        `A line has slope ${m} and passes through (${p}, ${q}). What is y when x = ${t}?`,
        q + m * (t - p),
        { hint: "a number" },
      );
    },
  ],

  // ── 4.6 Parallel and perpendicular lines ──
  "math/algebra-1/unit-4/4.6": [
    (r) => {
      const slope = r.nonzero(-9, 9);
      const parallel = r.bool();
      return fill(
        `A line has slope ${slope}. What is the slope of a line ${parallel ? "parallel" : "perpendicular"} to it?`,
        parallel ? String(slope) : frac(-1, slope),
        { hint: "a number or fraction" },
      );
    },
    (r) => {
      const span = 8;
      const m = r.pick([1, 2, -1, -2]);
      const p = r.int(-3, 3);
      const perpendicular = -1 / m;
      return line(
        `Draw the line through (${p}, ${Math.round(perpendicular * p)}) perpendicular to a line of slope ${m}.`,
        {
          span,
          slope: perpendicular,
          intercept: Math.round(perpendicular * p) - perpendicular * p,
        },
      );
    },
    (r) => {
      const m = r.nonzero(-4, 4);
      const b = r.nonzero(-7, 7);
      const p = r.nonzero(-5, 5);
      const q = r.int(-6, 6);
      return fill(
        `A line parallel to y = ${head(m, "x")}${signed(b)} passes through (${p}, ${q}). What is its y-intercept?`,
        q - m * p,
        { hint: "a number" },
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
      return fill(
        `Solve the system:  ${head(a, "x")}${signed(b, "y")} = ${e}  and  ${head(c, "x")}${signed(d, "y")} = ${f}.  What is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 6);
      const c = r.int(2, 6);
      return fill(
        `To eliminate x from ${a}x + 5y = 12 and ${c}x - 3y = 7, you multiply the first by ${c} and the second by k. What is k?`,
        a,
        { hint: "a number" },
      );
    },
    (r) => {
      const span = 9;
      const x = r.int(-5, 5);
      const y = r.int(-5, 5);
      const a = r.nonzero(-3, 3);
      const b = r.nonzero(-3, 3);
      const c = r.nonzero(-3, 3);
      let d = r.nonzero(-3, 3);
      // Proportional rows are the same line, and there is no single point.
      if (a * d - b * c === 0) d = d + 1;
      return point(
        `Solve ${head(a, "x")}${signed(b, "y")} = ${a * x + b * y} and ${head(c, "x")}${signed(d, "y")} = ${c * x + d * y}, and place the solution.`,
        { span, x, y, zero: 2 },
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
    (r) => {
      const p = r.nonzero(-9, 9);
      const q = r.nonzero(-9, 9);
      return fill(
        `Expand (x${signed(p)})(x${signed(q)}). What is the coefficient of x?`,
        p + q,
        { hint: "a number" },
      );
    },
    (r) => {
      const p = r.nonzero(-9, 9);
      const q = r.nonzero(-9, 9);
      return fill(
        `Expand (x${signed(p)})(x${signed(q)}). What is the constant term?`,
        p * q,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps of multiplying two binomials in order.",
        [
          "Multiply the first terms of each bracket",
          "Multiply the outer pair, then the inner pair",
          "Multiply the last terms of each bracket",
          "Add the two middle terms together",
        ],
        r,
      ),
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
    (r) => {
      const a = r.int(2, 12);
      return fill(
        `x^2 - ${a * a} factors as (x + k)(x - k). What is k?`,
        a,
        { hint: "a number" },
      );
    },
    (r) => {
      const root = r.int(2, 12);
      return slider(`Solve x^2 - ${root * root} = 0 and place the positive root.`, {
        min: 0,
        max: 15,
        step: 1,
        value: root,
      });
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
    (r) => {
      const p = r.nonzero(-9, 9);
      const q = r.nonzero(-9, 9);
      return fill(
        `x^2${signed(p + q, "x")}${signed(p * q)} factors as (x${signed(p)})(x + k). What is k?`,
        q,
        { hint: "a number" },
      );
    },
    (r) => {
      const p = r.int(-9, -1);
      const q = r.int(1, 9);
      return fill(
        `Which two numbers multiply to ${p * q} and add to ${p + q}? Enter the larger one.`,
        Math.max(p, q),
        { hint: "a number" },
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
      return fill(
        `Solve using the quadratic formula:  ${poly([[1, 2], [b, 1], [c, 0]])} = 0.  What is the larger root?`,
        larger,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.nonzero(-4, 4);
      const b = r.nonzero(-12, 12);
      const c = r.nonzero(-9, 9);
      return fill(
        `For ${poly([[a, 2], [b, 1], [c, 0]])} = 0, what is the sum of the two roots?`,
        frac(-b, a),
        { hint: "a number or a fraction" },
      );
    },
    (r) => {
      const p = r.int(-7, 3);
      const q = p + r.int(1, 6);
      return slider(
        `x^2${signed(-(p + q), "x")}${signed(p * q)} = 0. Place the larger root.`,
        { min: -10, max: 10, step: 1, value: q },
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
      return fill(
        `What is the discriminant of ${poly([[a, 2], [b, 1], [c, 0]])}?`,
        b * b - 4 * a * c,
        { hint: "a number" },
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
    (r) => {
      const a = r.int(1, 4);
      const half = r.int(1, 6);
      return fill(
        `For what k does ${head(a, "x^2")}${signed(2 * a * half, "x")} + k = 0 have exactly one root?`,
        a * half * half,
        { hint: "a number" },
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
      return fill(
        `A geometric sequence starts ${first}, ${first * ratio}, ${first * ratio ** 2}, … What is the ${n}th term?`,
        nth,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.nonzero(-6, 6);
      const ratio = r.pick([2, 3, 4, 5]);
      return fill(
        `A geometric sequence runs ${first}, ${first * ratio}, ${first * ratio ** 2}, ${first * ratio ** 3}, … What is the common ratio?`,
        ratio,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps for finding the nth term of a geometric sequence in order.",
        [
          "Divide any term by the one before it to get the ratio",
          "Note the first term",
          "Raise the ratio to the power one less than the position",
          "Multiply that by the first term",
        ],
        r,
      ),
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
    (r) => {
      const outside = r.int(2, 7);
      const inside = r.pick([2, 3, 5, 6, 7, 10, 11]);
      return fill(
        `Simplify √${outside * outside * inside}.`,
        radical(outside * outside * inside),
        { hint: "a number times a root" },
      );
    },
    (r) => {
      const a = r.pick([2, 3, 5, 6, 7]);
      const b = r.pick([2, 3, 5, 6, 7]);
      return fill(`√${a} × √${b} = √k. What is k?`, a * b, { hint: "a number" });
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
      return fill(
        `For the data set ${values.join(", ")}, what is the ${wantMean ? "mean" : "median"}?`,
        wantMean ? mean : median,
        { hint: "a number" },
      );
    },
    (r) => {
      const values = [r.int(1, 9), r.int(10, 19), r.int(20, 29), r.int(30, 40)];
      return fill(
        `What is the range of ${values.join(", ")}?`,
        Math.max(...values) - Math.min(...values),
        { hint: "a number" },
      );
    },
    (r) => {
      const repeated = r.int(2, 20);
      const others = [r.int(21, 30), r.int(31, 40)];
      return fill(
        `What is the mode of ${[repeated, others[0], repeated, others[1]].join(", ")}?`,
        repeated,
        { hint: "a number" },
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
    // The property as a thing to use rather than a thing to name.
    (r) => {
      const n = r.nonzero(-12, 12);
      const kind = r.pick(["add-inverse", "add-identity", "mul-identity", "mul-inverse"]);
      if (kind === "add-inverse") {
        return fill(`What goes in the blank? ${n} + __ = 0`, -n, { hint: "a number" });
      }
      if (kind === "add-identity") {
        return fill(`What goes in the blank? ${n} + __ = ${n}`, 0, { hint: "a number" });
      }
      if (kind === "mul-identity") {
        return fill(`What goes in the blank? ${n} × __ = ${n}`, 1, { hint: "a number" });
      }
      return fill(`What goes in the blank? ${n} × __ = 1`, frac(1, n), {
        hint: "a fraction",
      });
    },
    // Distribution as an arithmetic shortcut, which is the only reason anyone
    // outside a classroom cares that it holds.
    (r) => {
      const a = r.int(3, 9);
      const off = r.int(1, 4);
      const b = 100 - off;
      return fill(
        `Use the distributive property: ${a} × ${b} = ${a} × (100 - ${off}) = ?`,
        a * b,
        { hint: "a number" },
      );
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
      return fill(
        `Evaluate:   ${a} + ${b} · ${c}`,
        value,
        { hint: "a number" },
      );
    },
    // Brackets, then the exponent, then the rest.
    (r) => {
      const a = r.int(2, 6);
      const b = r.int(1, 5);
      const c = r.int(2, 9);
      const value = (a + b) ** 2 - c;
      return fill(
        `Evaluate:   (${a} + ${b})^2 - ${c}`,
        value,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 9);
      const c = r.int(1, 6);
      const d = r.int(1, 6);
      const e = r.int(2, 5);
      return order(
        `Put the steps for evaluating ${a} + ${b} × (${c} + ${d})^2 ÷ ${e} in the order you carry them out.`,
        [
          `Add inside the brackets to get ${c + d}`,
          `Square it to get ${(c + d) ** 2}`,
          `Multiply by ${b}`,
          `Divide by ${e}`,
          `Add ${a}`,
        ],
        r,
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 6);
      const c = r.int(1, 5);
      const d = r.int(2, 4);
      return slider(
        `Place the value of ${a} + ${b} × (${c} + ${d}).`,
        { min: 0, max: 70, step: 1, value: a + b * (c + d) },
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
    (r) => {
      const a = r.int(4, 12);
      const c = r.int(2, a - 1);
      const b = r.int(2, 9);
      const d = r.int(2, 9);
      return fill(
        `Simplify ${a}x${signed(b)}${signed(-c, "x")}${signed(d)}. What is the coefficient of x?`,
        a - c,
        { hint: "a number" },
      );
    },
    // The same rule read backwards: the simplified form is given and one of
    // the original coefficients is missing.
    (r) => {
      const a = r.int(5, 14);
      const left = r.int(1, a - 1);
      const p = r.int(2, 9);
      const q = r.int(2, 9);
      return fill(
        `${a}x + ${p}y - ?x + ${q}y simplifies to ${head(left, "x")} + ${p + q}y. What replaces the ?`,
        a - left,
        { hint: "a number" },
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
    (r) => {
      const times = r.int(2, 9);
      const less = r.int(1, 15);
      const n = r.int(2, 12);
      return fill(
        `Let n = ${n}. What is the value of "${less} less than ${times} times n"?`,
        times * n - less,
        { hint: "a number" },
      );
    },
    // The translation run the other way: the sentence describes what was done
    // to a number and the number is what is missing.
    (r) => {
      const times = r.int(2, 6);
      const less = r.int(1, 12);
      const n = r.int(2, 15);
      return slider(
        `A number is multiplied by ${times}, then ${less} is subtracted, giving ${times * n - less}. Place the number.`,
        { min: 0, max: 20, step: 1, value: n },
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
    (r) => {
      const outside = r.int(2, 6);
      const inside = r.pick([2, 3, 5, 6, 7, 10, 11, 13]);
      return fill(`Simplify √${outside * outside * inside}.`, radical(outside * outside * inside), {
        hint: "a number times a root",
      });
    },
    // Estimating a root is the skill that tells you an answer is wrong before
    // you have checked it, and it is not the same skill as simplifying one.
    (r) => {
      let n = r.int(5, 99);
      // A perfect square has an exact root, so estimating it asks nothing.
      while (isSquare(n)) n = r.int(5, 99);
      return slider(`Place √${n} on the line, to the nearest tenth.`, {
        min: 0,
        max: 10,
        step: 0.1,
        value: Math.round(Math.sqrt(n) * 10) / 10,
        full: 0.2,
        zero: 1.5,
      });
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
    // The solution is handed over and a coefficient is missing, so the
    // equation has to be run backwards rather than forwards.
    (r) => {
      const a = r.int(2, 9);
      const quotient = r.int(2, 12);
      const k = r.nonzero(-15, 15);
      return fill(
        `The equation x/${a} + k = ${quotient + k} has solution x = ${a * quotient}. What is k?`,
        k,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 5);
      const x = r.int(1, Math.floor(20 / a)) * a;
      const b = r.nonzero(-9, 9);
      return slider(`Solve x/${a}${signed(b)} = ${x / a + b} and place x.`, {
        min: 0,
        max: 20,
        step: 1,
        value: x,
      });
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
    (r) => {
      const a = r.int(2, 9);
      const b = r.nonzero(-12, 12);
      let c = r.nonzero(-12, 12);
      // Equal constants would make it an identity rather than a contradiction.
      if (c === b) c = b + 1;
      return fill(
        `For what k does ${a}x${signed(b)} = kx${signed(c)} have no solution?`,
        a,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.nonzero(-12, 12);
      return fill(
        `For what k does ${a}x${signed(b)} = ${a}x + k have infinitely many solutions?`,
        b,
        { hint: "a number" },
      );
    },
    // Reading the end state rather than engineering it: what a solved equation
    // has collapsed to is the whole tell.
    (r) => {
      const contradiction = r.bool();
      const n = r.nonzero(-12, 12);
      return fill(
        contradiction
          ? `Solving an equation ends at 0 = ${n}. How many solutions does it have?`
          : `Solving an equation ends at ${n} = ${n}. How many solutions does it have? Enter -1 for infinitely many.`,
        contradiction ? 0 : -1,
        { hint: "a number" },
      );
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
      return fill(
        `Solve:   ${head(-a, "x")}${signed(b)} < 0`,
        `x > ${root}`,
        { hint: "e.g. x > 4" },
      );
    },
    (r) => {
      const a = r.nonzero(-6, 6);
      const boundary = r.int(-8, 8);
      const b = r.nonzero(-12, 12);
      const strict = r.bool();
      return slider(
        `Solve ${head(a, "x")}${signed(b)} ${strict ? ">" : "≥"} ${a * boundary + b}, then place the boundary of the solution set.`,
        { min: -10, max: 10, step: 1, value: boundary },
      );
    },
    (r) => {
      const a = r.int(2, 7);
      const boundary = r.int(-6, 9);
      const b = r.nonzero(-12, 12);
      return fill(
        `What is the largest integer x with ${a}x${signed(b)} ≤ ${a * boundary + b}?`,
        boundary,
        { hint: "a whole number" },
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
    (r) => {
      const low = r.int(-12, 4);
      const high = low + r.int(3, 14);
      return fill(
        `How many integers satisfy ${low} < x < ${high}?`,
        high - low - 1,
        { hint: "a whole number" },
      );
    },
    (r) => {
      const b = r.nonzero(-9, 9);
      const lower = r.int(-8, 4);
      const upper = lower + r.int(2, 8);
      return slider(
        `Solve ${lower + b} ≤ x${signed(b)} ≤ ${upper + b}, then place the smallest x that works.`,
        { min: -10, max: 10, step: 1, value: lower },
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
    (r) => {
      const h = r.int(-8, 8);
      const k = r.int(2, 9);
      return fill(
        `The solution of |x${signed(-h)}| < ${k} is one interval. How wide is it?`,
        2 * k,
        { hint: "a number" },
      );
    },
    (r) => {
      const h = r.int(-4, 4);
      const k = r.int(2, 5);
      return slider(
        `Solve |x${signed(-h)}| ≤ ${k} and place the left-hand end of the interval.`,
        { min: -10, max: 10, step: 1, value: h - k },
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
    // The vertical line test as arithmetic: an x that appears twice is the
    // whole of what makes a relation fail.
    (r) => {
      const repeat = r.int(-8, 8);
      let other = r.int(-8, 8);
      if (other === repeat) other = repeat + 1;
      return fill(
        `The relation {(${repeat}, ${r.int(-9, 9)}), (${other}, ${r.int(-9, 9)}), (${repeat}, ${r.int(-9, 9)})} is not a function. Which x-value is repeated?`,
        repeat,
        { hint: "a number" },
      );
    },
    (r) => {
      const pairs = r.int(3, 6);
      const clashes = r.int(1, 3);
      return fill(
        `A relation has ${pairs + clashes} ordered pairs, and ${clashes} of them repeat an x-value that already appears. How many pairs must be removed to leave a function?`,
        clashes,
        { hint: "a whole number" },
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
    (r) => {
      const price = r.int(3, 12);
      const most = r.int(4, 9);
      return fill(
        `Tickets cost ${price} each and you may buy from 1 to ${most} of them. How many values are in the range of the cost function?`,
        most,
        { hint: "a whole number" },
      );
    },
    // A discrete graph is dots, not a line, and plotting one of them is the
    // clearest way to say so.
    (r) => {
      const span = 9;
      const price = r.int(1, 2);
      const bought = r.int(1, 4);
      return point(
        `Tickets cost ${price} each. Plot the point for buying ${bought} of them, with tickets across and cost up.`,
        { span, x: bought, y: price * bought, zero: 2 },
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
    (r) => {
      const span = 9;
      const h = r.int(-4, 4);
      const k = r.int(-5, 5);
      const up = r.bool();
      const f = (x: number) => (up ? 1 : -1) * (x - h) * (x - h) + k;
      return fill(
        `The graph shows f. What is its ${up ? "minimum" : "maximum"} value?`,
        k,
        {
          hint: "a number",
          figure: graph({ span, curves: [plot(f, { span, label: "f" })] }),
        },
      );
    },
    (r) => {
      const span = 9;
      const m = r.nonzero(-2, 2);
      const b = r.int(-6, 6);
      const f = (x: number) => m * x + b;
      return slider("Place the y-intercept of the graph shown.", {
        min: -8,
        max: 8,
        step: 1,
        value: b,
        figure: graph({ span, curves: [plot(f, { span, label: "f" })] }),
      });
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
    (r) => {
      const cut = r.int(-6, 6);
      const a = r.int(2, 6);
      const c = r.nonzero(-9, 9);
      return fill(
        `f(x) = ${a}x for x < ${cut}, and f(x) = x${signed(c)} for x ≥ ${cut}. At what x does the definition change?`,
        cut,
        { hint: "a number" },
      );
    },
    (r) => {
      const span = 9;
      const cut = r.int(-3, 3);
      const c = r.nonzero(-3, 3);
      const at = cut + r.int(1, 3);
      return point(
        `f(x) = 0 for x < ${cut}, and f(x) = x${signed(c)} for x ≥ ${cut}. Plot the point (${at}, f(${at})).`,
        { span, x: at, y: at + c, zero: 2 },
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
      return fill(
        `f(x) = |${head(a, "x")} - ${b}|${signed(c)}.   Find f(${at}).`,
        value,
        { hint: "a number" },
      );
    },
    (r) => {
      const span = 9;
      const h = r.int(-5, 5);
      const k = r.int(-5, 5);
      return point(`Place the vertex of y = |x${signed(-h)}|${signed(k)}.`, {
        span,
        x: h,
        y: k,
        zero: 2,
      });
    },
    // The count, not the roots: an absolute value graph meets a horizontal
    // line twice, once, or not at all, and which one is the whole idea.
    (r) => {
      const h = r.int(-6, 6);
      const k = r.int(-6, 6);
      const above = r.pick([-2, 0, 3]);
      const m = k + above;
      return fill(
        `How many solutions does |x${signed(-h)}|${signed(k)} = ${m} have?`,
        above < 0 ? 0 : above === 0 ? 1 : 2,
        { hint: "0, 1 or 2" },
      );
    },
  ],

  // ── 3.8 Transformations of a graph ──
  "math/algebra-1/unit-3/3.8": [
    (r) => {
      const span = 8;
      const h = r.int(2, 5);
      const k = r.int(2, 5);
      const right = r.bool();
      const up = r.bool();
      const inside = right ? `x - ${h}` : `x + ${h}`;
      const shift = (across: boolean, along: boolean, a: number, b: number) =>
        `${across ? "right" : "left"} ${a}, ${along ? "up" : "down"} ${b}`;
      const across = right ? h : -h;
      const along = up ? k : -k;
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
        graph({
          span,
          curves: [
            plot((x) => x * x, { span, tone: "second", dashed: true, label: "x²" }),
            plot((x) => (x - across) ** 2 + along, { span, label: "y" }),
          ],
          caption: "The dashed parabola is y = x².",
        }),
      );
    },
    (r) => {
      const span = 9;
      const x = r.int(-4, 4);
      const y = r.int(-4, 4);
      const h = r.nonzero(-3, 3);
      const k = r.nonzero(-3, 3);
      return point(
        `(${x}, ${y}) lies on y = f(x). Place the matching point on y = f(x${signed(-h)})${signed(k)}.`,
        { span, x: x + h, y: y + k, zero: 2 },
      );
    },
    (r) => {
      const a = r.int(2, 4);
      const h = r.int(2, 5);
      const k = r.int(2, 5);
      return order(
        `Put the transformations in y = ${a}f(x - ${h}) + ${k} in the order they are applied to f.`,
        [
          `Shift right ${h}`,
          `Stretch vertically by ${a}`,
          `Shift up ${k}`,
        ],
        r,
      );
    },
  ],

  // ── 4.4 Standard form and intercepts ──
  "math/algebra-1/unit-4/4.4": [
    (r) => {
      const span = 8;
      const a = r.int(2, 8);
      const b = r.int(2, 8);
      const x = r.nonzero(-6, 6);
      const c = a * x;
      // c is a multiple of a, so the x-intercept lands on a grid point. The
      // line is deliberately not drawn: with it on the grid the crossing is
      // something to look at, and the question is meant to be worked out.
      return point(
        `Place the point where   ${head(a, "x")} + ${head(b, "y")} = ${c}   crosses the x-axis.`,
        { span, x, y: 0, zero: 2 },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const x = r.nonzero(-8, 8);
      return fill(
        `What is the x-intercept of ${a}x + ${b}y = ${a * x}?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 6);
      const b = r.int(2, 6);
      const c = a * b * r.nonzero(-3, 3);
      return order(
        `Put the steps for graphing ${a}x + ${b}y = ${c} from its intercepts in order.`,
        [
          `Set y = 0 and solve for x, giving ${c / a}`,
          `Set x = 0 and solve for y, giving ${c / b}`,
          "Mark both intercepts on the axes",
          "Draw the line through them",
        ],
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
    (r) => {
      const m = r.int(2, 9);
      const b = r.nonzero(-9, 9);
      return fill(
        `Write y = ${m}x${signed(b)} as Ax + By = C with A positive and whole. What is A?`,
        m,
        { hint: "a number" },
      );
    },
    (r) => {
      const m = r.int(2, 6);
      const b = r.nonzero(-8, 8);
      return slider(
        `Write y = ${m}x${signed(b)} as Ax + By = C with A positive and B = -1. Place C.`,
        { min: -10, max: 10, step: 1, value: -b },
      );
    },
  ],

  // ── 4.7 An equation from two points ──
  "math/algebra-1/unit-4/4.7": [
    (r) => {
      const span = 10;
      const m = r.pick([-2, -1, 1, 2]);
      const b = r.int(-3, 3);
      const x1 = r.int(-3, 1);
      const x2 = x1 + r.int(1, 2);
      // Drawn rather than chosen. Four equations of a line are four things to
      // read; one line through two marked points is the thing itself.
      return line(
        `Draw the line through (${x1}, ${m * x1 + b}) and (${x2}, ${m * x2 + b}).`,
        {
          span,
          slope: m,
          intercept: b,
          figure: graph({
            span,
            curves: [],
            marks: [dot(x1, m * x1 + b), dot(x2, m * x2 + b)],
          }),
        },
      );
    },
    (r) => {
      const m = r.nonzero(-4, 4);
      const b = r.int(-7, 7);
      const x1 = r.nonzero(-6, -1);
      const x2 = r.int(1, 6);
      return fill(
        `A line passes through (${x1}, ${m * x1 + b}) and (${x2}, ${m * x2 + b}). What is its y-intercept?`,
        b,
        { hint: "a number" },
      );
    },
    (r) => {
      const rate = r.int(2, 8);
      const fee = r.int(2, 9);
      const trip = r.int(2, 6);
      return slider(
        `A taxi charges a fixed fee plus a rate per mile. A ${trip}-mile trip costs ${fee + rate * trip} and a ${trip + 1}-mile trip costs ${fee + rate * (trip + 1)}. Place the rate per mile.`,
        { min: 0, max: 20, step: 1, value: rate },
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
    (r) => {
      const span = 8;
      const m = r.nonzero(-3, 3);
      const b = r.int(-5, 5);
      return line(
        `Draw the boundary line of y ${r.bool() ? "≥" : "<"} ${head(m, "x")}${signed(b)}.`,
        { span, slope: m, intercept: b },
      );
    },
    (r) => {
      const m = r.nonzero(-3, 3);
      const b = r.int(-5, 5);
      const at = (x: number) => m * x + b;
      const pts = [
        [r.int(-6, 6), 0],
        [r.int(-6, 6), 0],
        [r.int(-6, 6), 0],
        [r.int(-6, 6), 0],
      ].map(([x]) => [x, at(x) + r.int(-4, 4)] as [number, number]);
      return fill(
        `How many of (${pts.map(([x, y]) => `${x}, ${y}`).join("), (")}) satisfy y > ${head(m, "x")}${signed(b)}?`,
        pts.filter(([x, y]) => y > at(x)).length,
        { hint: "a number from 0 to 4" },
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
    (r) => {
      const first = r.int(-9, 9);
      const d = r.nonzero(-7, 7);
      const n = r.int(4, 12);
      return fill(
        `An arithmetic sequence starts at ${first} and has common difference ${d}. What is the ${n}th term?`,
        first + (n - 1) * d,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(-6, 6);
      const d = r.nonzero(-5, 5);
      return slider(
        `A sequence runs ${first}, ${first + d}, ${first + 2 * d}, ${first + 3 * d}, … Place the common difference.`,
        { min: -6, max: 6, step: 1, value: d },
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
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-6, 6);
      const m1 = r.nonzero(-3, 3);
      let m2 = r.nonzero(-3, 3);
      if (m2 === m1) m2 = m1 + 1;
      return fill(
        `y = ${head(m1, "x")}${signed(y - m1 * x)} and y = ${head(m2, "x")}${signed(y - m2 * x)} cross at one point. What is its x-coordinate?`,
        x,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps for solving a system by graphing in order.",
        [
          "Write both equations in slope-intercept form",
          "Graph each line from its intercept and slope",
          "Find the point where the two lines cross",
          "Check that point in both original equations",
        ],
        r,
      ),
  ],

  // ── 5.2 Substitution ──
  "math/algebra-1/unit-5/5.2": [
    (r) => {
      const span = 8;
      const x = r.nonzero(-6, 6);
      const y = r.nonzero(-6, 6);
      const m = r.coefficient(4);
      const b = y - m * x;
      const a = r.int(2, 5);
      const c = a * x + y;
      // The solution of a system is a place, so it is answered as one. Neither
      // line is drawn — reading an intersection off a picture is a different
      // question, and this subunit is the algebraic one.
      return point(
        `Solve, and place the solution:   y = ${head(m, "x")}${signed(b)}   and   ${head(a, "x")} + y = ${c}`,
        { span, x, y, zero: 2 },
      );
    },
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-6, 6);
      const m = r.nonzero(-3, 3);
      const a = r.nonzero(-3, 3);
      const b = r.nonzero(-3, 3);
      return fill(
        `y = ${head(m, "x")}${signed(y - m * x)} and ${head(a, "x")}${signed(b, "y")} = ${a * x + b * y}. Solve by substitution: what is y?`,
        y,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps of the substitution method in order.",
        [
          "Isolate one variable in one of the equations",
          "Substitute that expression into the other equation",
          "Solve the resulting one-variable equation",
          "Substitute back to find the remaining variable",
        ],
        r,
      ),
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
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-6, 6);
      const m = r.nonzero(-3, 3);
      const a = r.nonzero(-3, 3);
      return fill(
        `x = ${head(m, "y")}${signed(x - m * y)} and ${head(a, "x")} + y = ${a * x + y}. This is set up for substitution — what is y?`,
        y,
        { hint: "a number" },
      );
    },
    (r) => {
      const span = 9;
      const x = r.int(-5, 5);
      const y = r.int(-5, 5);
      const a = r.nonzero(-3, 3);
      return point(
        `x + y = ${x + y} and ${head(a, "x")} - y = ${a * x - y}. Adding the equations is quickest — place the solution.`,
        { span, x, y, zero: 2 },
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
    (r) => {
      const m = r.nonzero(-4, 4);
      const b1 = r.nonzero(-8, 8);
      let b2 = r.nonzero(-8, 8);
      if (b2 === b1) b2 = b1 + 1;
      return fill(
        `y = kx${signed(b1)} and y = ${head(m, "x")}${signed(b2)} never meet. What is k?`,
        m,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps for deciding how many solutions a system has in order.",
        [
          "Write both equations in slope-intercept form",
          "Compare the two slopes",
          "If the slopes match, compare the two intercepts",
          "Say none, one, or infinitely many",
        ],
        r,
      ),
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
    (r) => {
      const perUnit = r.int(2, 9);
      const margin = r.int(3, 8);
      const units = r.int(2, 20);
      return slider(
        `Setting up costs ${units * margin} and each unit costs ${perUnit} to make and sells for ${perUnit + margin}. Place the break-even number of units.`,
        { min: 0, max: 25, step: 1, value: units, full: 1, zero: 5 },
      );
    },
    (r) => {
      const fixed = r.int(10, 60);
      const perUnit = r.int(2, 8);
      const price = perUnit + r.int(2, 7);
      const units = r.int(10, 40);
      return fill(
        `Costs are ${fixed} plus ${perUnit} per unit; each sells for ${price}. What is the profit on ${units} units?`,
        units * (price - perUnit) - fixed,
        { hint: "a number" },
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
    (r) => {
      const span = 9;
      const x = r.int(-5, 5);
      const y = r.int(-5, 5);
      const m1 = r.nonzero(-3, 3);
      let m2 = r.nonzero(-3, 3);
      if (m2 === m1) m2 = m1 + 1;
      return point(
        `The regions y ≥ ${head(m1, "x")}${signed(y - m1 * x)} and y ≤ ${head(m2, "x")}${signed(y - m2 * x)} meet along their boundaries. Place the corner where the two boundaries cross.`,
        { span, x, y, zero: 2 },
      );
    },
    (r) => {
      const m = r.nonzero(-2, 2);
      const b = r.int(-4, 4);
      const at = (x: number) => m * x + b;
      const pts = [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)].map(
        (x) => [x, at(x) + r.int(-3, 3)] as [number, number],
      );
      return fill(
        `How many of (${pts.map(([x, y]) => `${x}, ${y}`).join("), (")}) satisfy both y ≥ ${head(m, "x")}${signed(b)} and y ≤ 6?`,
        pts.filter(([x, y]) => y >= at(x) && y <= 6).length,
        { hint: "a number from 0 to 3" },
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
    (r) => {
      const span = 9;
      const cx = r.int(1, 6);
      const cy = r.int(1, 6);
      return point(
        `A feasible region has corners at (0, 0), (${cx}, 0), (${cx}, ${cy}) and (0, ${cy}). Place the corner that maximises P = x + y.`,
        { span, x: cx, y: cy, zero: 2 },
      );
    },
    (r) =>
      order(
        "Put the steps of a linear programming problem in order.",
        [
          "Write the constraints as inequalities",
          "Graph them and shade the feasible region",
          "Find the coordinates of every corner",
          "Evaluate the objective at each corner and take the best",
        ],
        r,
      ),
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
    (r) => {
      const degree = r.int(2, 6);
      const lead = r.nonzero(-8, 8);
      const mid = r.nonzero(-8, 8);
      const c = r.nonzero(-9, 9);
      return fill(
        `What is the degree of ${poly([[lead, degree], [mid, 1], [c, 0]])}?`,
        degree,
        { hint: "a number" },
      );
    },
    (r) => {
      const terms: [number, number][] = [];
      const count = r.int(2, 4);
      for (let i = 0; i < count; i++) terms.push([r.nonzero(-9, 9), count - i]);
      return fill(`How many terms does ${poly(terms)} have?`, count, {
        hint: "a whole number",
      });
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
    (r) => {
      const a = r.nonzero(-9, 9);
      const d = r.nonzero(-9, 9);
      const b = r.nonzero(-9, 9);
      const e = r.nonzero(-9, 9);
      return fill(
        `Subtract: (${poly([[a, 2], [b, 0]])}) - (${poly([[d, 2], [e, 0]])}). What is the coefficient of x^2?`,
        a - d,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      const d = r.nonzero(-9, 9);
      const f = r.nonzero(-9, 9);
      return fill(
        `Add: (${poly([[a, 2], [c, 0]])}) + (${poly([[d, 2], [f, 0]])}). What is the constant term?`,
        c + f,
        { hint: "a number" },
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
      return fill(
        `Factor:   ${poly([[g * p, 2], [g * q, 1]])}`,
        `${g}x(${head(p, "x")}${signed(q)})`,
        { hint: "the factored form" },
      );
    },
    (r) => {
      const m = r.int(2, 7);
      const n = m + r.int(1, 5);
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return fill(
        `The greatest common factor of ${a}x^${n} and ${b}x^${m} contains x to what power?`,
        m,
        { hint: "a number" },
      );
    },
    (r) => {
      const g = r.int(2, 6);
      const a = g * r.int(2, 5);
      const b = g * r.int(2, 5);
      return order(
        `Put the steps for factoring ${a}x^2 + ${b}x in order.`,
        [
          `Find the largest number dividing ${a} and ${b}`,
          "Take the lowest power of x that appears in both terms",
          "Write that greatest common factor outside a bracket",
          "Divide each term by it to fill the bracket",
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
    (r) => {
      const a = r.int(2, 6);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      return fill(
        `To factor ${poly([[a, 2], [b, 1], [c, 0]])} by splitting the middle term, what is the product a × c?`,
        a * c,
        { hint: "a number" },
      );
    },
    (r) => {
      const p = r.int(-8, -2);
      const q = r.int(2, 8);
      return fill(
        `Splitting a middle term needs two numbers multiplying to ${p * q} and adding to ${p + q}. Enter the smaller one.`,
        Math.min(p, q),
        { hint: "a number" },
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
    (r) => {
      const a = r.int(2, 6);
      const b = r.nonzero(-8, 8);
      const c = r.int(2, 6);
      return fill(
        `Factor ${a}x^3${signed(a * b, "x^2")}${signed(c, "x")}${signed(b * c)} by grouping. Both groups share the bracket (x + k). What is k?`,
        b,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps of factoring by grouping in order.",
        [
          "Split the four terms into two pairs",
          "Factor the greatest common factor out of each pair",
          "Check that the two brackets left behind match",
          "Write the shared bracket times what was taken out",
        ],
        r,
      ),
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
    (r) => {
      const b = r.int(2, 6);
      const minus = r.bool();
      return fill(
        `x^3 ${minus ? "-" : "+"} ${b ** 3} factors with (x ${minus ? "-" : "+"} k) as one factor. What is k?`,
        b,
        { hint: "a number" },
      );
    },
    (r) => {
      const b = r.int(2, 6);
      return fill(
        `x^3 - ${b ** 3} = (x - ${b})(x^2 + kx + ${b * b}). What is k?`,
        b,
        { hint: "a number" },
      );
    },
  ],

  // ── 6.10 Factoring completely ──
  "math/algebra-1/unit-6/6.10": [
    (r) => {
      const g = r.int(2, 6);
      const a = r.int(2, 9);
      return fill(
        `Factor completely:   ${poly([[g, 2], [0, 1], [-g * a * a, 0]])}`,
        `${g}(x - ${a})(x + ${a})`,
        { hint: "the factored form" },
      );
    },
    (r) => {
      const g = r.int(2, 5);
      const p = r.int(2, 6);
      return fill(
        `${g}x^2 - ${g * p * p} factors completely as ${g}(x + ${p})(x - ${p}). How many factors does that leave, counting the ${g}?`,
        3,
        { hint: "a whole number" },
      );
    },
    (r) =>
      order(
        "Put the steps of a complete factoring strategy in order.",
        [
          "Take out the greatest common factor",
          "Count the terms left inside the bracket",
          "Apply the pattern that matches that number of terms",
          "Check each factor to see whether it factors again",
        ],
        r,
      ),
  ],

  // ── 7.1 Axis of symmetry and vertex ──
  "math/algebra-1/unit-7/7.1": [
    (r) => {
      const span = 8;
      const a = r.pick([1, 1, 2, 3]);
      const h = r.nonzero(-5, 5);
      const k = r.int(-5, 5);
      // Written out in standard form, but rolled from the vertex, so the
      // vertex is somewhere on the grid rather than eighty units below it.
      const b = -2 * a * h;
      const c = a * h * h + k;
      return slider(
        `Drag to the axis of symmetry of   y = ${poly([[a, 2], [b, 1], [c, 0]])}`,
        {
          min: -6,
          max: 6,
          step: 1,
          value: h,
          full: 0.25,
          zero: 2,
          figure: graph({
            span,
            curves: [plot((t) => a * (t - h) ** 2 + k, { span, label: "y" })],
          }),
        },
      );
    },
    (r) => {
      const a = r.nonzero(-4, 4);
      const b = r.nonzero(-12, 12);
      const c = r.nonzero(-9, 9);
      return fill(
        `What is the axis of symmetry of y = ${poly([[a, 2], [b, 1], [c, 0]])}?`,
        frac(-b, 2 * a),
        { hint: "a number or a fraction" },
      );
    },
    (r) => {
      const a = r.coefficient(3);
      const h = r.int(-5, 5);
      const k = r.int(-8, 8);
      return fill(
        `y = ${a}(x${signed(-h)})^2${signed(k)}. What is the y-value at the vertex?`,
        k,
        { hint: "a number" },
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
    (r) => {
      const a = r.coefficient(3);
      const h = r.int(-7, 7);
      const k = r.int(-7, 7);
      return fill(
        `y = ${a}(x${signed(-h)})^2${signed(k)} is in vertex form. What is h?`,
        h,
        { hint: "a number" },
      );
    },
    (r) => {
      const h = r.int(-6, 6);
      const k = r.int(-8, 8);
      return fill(
        `y = x^2${signed(-2 * h, "x")}${signed(h * h + k)}. What is the x-coordinate of its vertex?`,
        h,
        { hint: "a number" },
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
    (r) => {
      const p = r.int(-8, 8);
      let q = r.int(-8, 8);
      if (q === p) q = p + 1;
      return fill(
        `y = (x${signed(-p)})(x${signed(-q)}). Enter the larger of its two roots.`,
        Math.max(p, q),
        { hint: "a number" },
      );
    },
    // The vertex of a factored quadratic sits above the midpoint of its roots,
    // which is the fact the factored form is for.
    (r) => {
      const span = 9;
      const mid = r.int(-3, 3);
      const gap = r.int(1, 3);
      return point(
        `y = (x${signed(-(mid - gap))})(x${signed(-(mid + gap))}). Place its vertex.`,
        { span, x: mid, y: -gap * gap, zero: 2 },
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
    (r) => {
      const span = 9;
      const h = r.int(-3, 3);
      const k = r.pick([-4, 0, 3]);
      const f = (x: number) => (x - h) * (x - h) + k;
      return fill(`How many x-intercepts does the graph show?`, k < 0 ? 2 : k === 0 ? 1 : 0, {
        hint: "0, 1 or 2",
        figure: graph({ span, curves: [plot(f, { span, label: "f" })] }),
      });
    },
    (r) => {
      const root = r.int(-7, 7);
      const other = root + r.int(2, 6);
      return slider(
        `y = (x${signed(-root)})(x${signed(-other)}). Place the smaller root.`,
        { min: -10, max: 10, step: 1, value: Math.min(root, other) },
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
    (r) => {
      const a = r.int(2, 6);
      const b = a * r.int(1, 4);
      const c = r.int(2, 6);
      const d = c * r.int(1, 4);
      return fill(
        `Solve (${a}x - ${b})(${c}x - ${d}) = 0. Enter the larger solution.`,
        Math.max(b / a, d / c),
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps of solving by the Zero Product Property in order.",
        [
          "Move every term to one side so the other side is 0",
          "Factor the expression completely",
          "Set each factor equal to 0",
          "Solve the small equations that result",
        ],
        r,
      ),
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
    (r) => {
      const h = r.int(-7, 7);
      const root = r.int(2, 7);
      return fill(
        `Solve (x${signed(-h)})^2 = ${root * root}. Enter the larger solution.`,
        h + root,
        { hint: "a number" },
      );
    },
    (r) => {
      const h = r.int(-6, 6);
      const k = r.pick([-9, 0, 16]);
      return fill(
        `How many real solutions does (x${signed(-h)})^2 = ${k} have?`,
        k < 0 ? 0 : k === 0 ? 1 : 2,
        { hint: "0, 1 or 2" },
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
    (r) => {
      const half = r.nonzero(-9, 9);
      return fill(
        `x^2${signed(2 * half, "x")} + k is a perfect square. What is k?`,
        half * half,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps of completing the square for x^2 + bx + c = 0 in order.",
        [
          "Move the constant to the right-hand side",
          "Halve the coefficient of x and square it",
          "Add that number to both sides",
          "Write the left side as a squared bracket",
          "Take the square root of both sides, keeping both signs",
        ],
        r,
      ),
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
    (r) => {
      const m = r.int(2, 12);
      return fill(
        `x^2 = -${m * m}. The solutions are ±ki. What is k?`,
        m,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.nonzero(-7, 7);
      const b = r.int(2, 7);
      return fill(
        `Multiply out (${a} + ${b}i)(${a} - ${b}i). The result is a real number — what is it?`,
        a * a + b * b,
        { hint: "a number" },
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
    (r) => {
      const peak = r.int(1, 5);
      const start = r.int(1, 20);
      return slider(
        `A ball follows h = -16t^2 + ${32 * peak}t + ${start}. Place the time in seconds at which it is highest.`,
        { min: 0, max: 12, step: 1, value: peak },
      );
    },
    (r) => {
      const peak = r.int(1, 5);
      const start = r.int(1, 40);
      return fill(
        `A ball follows h = -16t^2 + ${32 * peak}t + ${start}. What is its greatest height?`,
        16 * peak * peak + start,
        { hint: "a number" },
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
    (r) => {
      const rate = r.pick([5, 10, 20, 25, 50]);
      const start = r.int(2, 40) * 100;
      return fill(
        `A population of ${start} grows by ${rate}% a year. What is the growth factor?`,
        1 + rate / 100,
        { hint: "a decimal" },
      );
    },
    (r) => {
      const start = r.int(1, 18);
      const factor = r.pick([2, 3]);
      return slider(
        `A culture follows y = a × ${factor}^t and reaches ${start * factor ** 2} after 2 hours. Place a.`,
        { min: 0, max: 20, step: 1, value: start },
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
    (r) => {
      const rate = r.pick([10, 20, 25, 40, 50]);
      const start = r.int(2, 40) * 100;
      return fill(
        `A sample of ${start} decays by a factor of ${1 - rate / 100} each year. What percentage is lost each year?`,
        rate,
        { unit: "%", hint: "a number" },
      );
    },
    (r) => {
      const half = r.pick([2, 3, 4, 5]);
      const start = 2 ** r.int(3, 6);
      return fill(
        `A sample of ${start} halves every ${half} years. After how many years is ${start / 8} left?`,
        3 * half,
        { hint: "a number of years" },
      );
    },
  ],

  // ── 8.4 Graphing exponentials ──
  "math/algebra-1/unit-8/8.4": [
    (r) => {
      const span = 8;
      const a = r.int(2, 6);
      const b = r.pick([2, 3, 4]);
      const c = r.nonzero(-6, 6);
      // The curve flattens onto its asymptote at the left of the grid, which
      // is what the question is asking the student to see.
      return slider(
        `Drag to the horizontal asymptote of   y = ${a} · ${b}^x${signed(c)}`,
        {
          min: -8,
          max: 8,
          step: 1,
          value: c,
          full: 0.25,
          zero: 2,
          figure: graph({
            span,
            curves: [plot((x) => a * b ** x + c, { span, label: "y" })],
          }),
        },
      );
    },
    (r) => {
      const a = r.int(2, 6);
      const base = r.pick([2, 3, 4]);
      const k = r.nonzero(-8, 8);
      return fill(
        `What is the horizontal asymptote of y = ${a} × ${base}^x${signed(k)}?`,
        k,
        { hint: "a number, as y = that" },
      );
    },
    (r) => {
      const span = 9;
      const a = r.int(2, 5);
      const base = r.pick([2, 3]);
      const k = r.int(-4, 4);
      return point(`Place the y-intercept of y = ${a} × ${base}^x${signed(k)}.`, {
        span,
        x: 0,
        y: a + k,
        zero: 2,
      });
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
    (r) => {
      const n = r.int(1, 4);
      return fill(
        `At x = ${n}, which is larger, 2^x or x^2? Enter the larger value.`,
        Math.max(2 ** n, n * n),
        { hint: "a number" },
      );
    },
    // Past x = 4 the doubling is ahead for good, and the gap is what makes
    // "eventually overtakes" concrete rather than a slogan.
    (r) => {
      const n = r.int(5, 10);
      return fill(
        `At x = ${n}, how much larger is 2^x than x^2?`,
        2 ** n - n * n,
        { hint: "a number" },
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
    (r) => {
      const first = r.nonzero(-9, 9);
      const d = r.nonzero(-6, 6);
      return fill(
        `A sequence is defined by a₁ = ${first} and aₙ = aₙ₋₁${signed(d)}. What is a₅?`,
        first + 4 * d,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        "Put the steps for turning a recursive arithmetic rule into an explicit one in order.",
        [
          "Read the first term from the definition",
          "Read the common difference from the recursion",
          "Write aₙ = a₁ + (n - 1)d",
          "Substitute both values into that formula",
        ],
        r,
      ),
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
    (r) => {
      const n = r.pick([2, 4, 12]);
      const years = r.int(2, 9);
      return fill(
        `Interest is compounded ${n} times a year for ${years} years. How many compounding periods is that?`,
        n * years,
        { hint: "a whole number" },
      );
    },
    (r) => {
      const rate = r.pick([2, 3, 4, 6, 8, 9]);
      return slider(
        `The rule of 72 estimates a doubling time as 72 divided by the percentage rate. At ${rate}% a year, place the estimated doubling time in years.`,
        { min: 0, max: 40, step: 1, value: 72 / rate, full: 1, zero: 6 },
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
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const k = r.pick([2, 3, 5, 7, 11]);
      return fill(
        `${a}√${k} + ${b}√${k} = m√${k}. What is m?`,
        a + b,
        { hint: "a number" },
      );
    },
    // Neither radical is like the other until both are simplified, which is
    // the step this question exists to catch.
    (r) => {
      const k = r.pick([2, 3, 5]);
      const p = r.int(2, 5);
      const q = r.int(2, 5);
      return fill(
        `√${p * p * k} + √${q * q * k} = m√${k}. What is m?`,
        p + q,
        { hint: "a number" },
      );
    },
    // Which radicals are like which is the step before any adding happens, and
    // it is the one that decides whether the sum is even possible.
    (r) => {
      const base = r.pick([2, 3, 5]);
      const pool = [
        `√${base}`,
        `√${4 * base}`,
        `√${9 * base}`,
        `√${base + 1}`,
        `√${base * base}`,
      ];
      return fill(
        `After simplifying, how many of ${pool.join(", ")} are like radicals with √${base}?`,
        3,
        { hint: "a whole number" },
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
    (r) => {
      const b = r.int(2, 9);
      const a = r.nonzero(-9, 9);
      return fill(`Solve √(x${signed(a)}) = ${b}.`, b * b - a, { hint: "a number" });
    },
    (r) => {
      const a = r.int(2, 8);
      return fill(
        `Solving √(x + ${a}) = x - ${a} by squaring gives two candidates, and one of them makes the right-hand side negative. How many of the two are genuine solutions?`,
        1,
        { hint: "a whole number" },
      );
    },
  ],

  // ── 9.4 Simplifying rational expressions ──
  "math/algebra-1/unit-9/9.4": [
    (r) => {
      const a = r.int(2, 9);
      return fill(
        `Simplify:   (x^2 - ${a * a}) / (x - ${a})`,
        `x + ${a}`,
        { hint: "an expression in x" },
      );
    },
    (r) => {
      const a = r.nonzero(-9, 9);
      const b = r.nonzero(-9, 9);
      return fill(
        `For what value of x is (x${signed(a)})/(x${signed(b)}) undefined?`,
        -b,
        { hint: "a number" },
      );
    },
    // A factor that cancels leaves a hole rather than an asymptote, and the
    // hole has a height the cancelled form still knows.
    (r) => {
      const span = 9;
      const a = r.int(1, 4);
      return point(
        `(x^2 - ${a * a})/(x - ${a}) simplifies to x + ${a}, but one point is missing. Place the hole.`,
        { span, x: a, y: 2 * a, zero: 2 },
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
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const c = r.int(2, 9);
      return fill(
        `(${a}x/${b}) × (${c}/x) simplifies to a number over ${b}. What is the numerator?`,
        a * c,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const c = r.int(2, 9);
      return fill(
        `(${a}/x) ÷ (${b}/${c}x) simplifies to a number. What is it?`,
        frac(a * c, b),
        { hint: "a number or a fraction" },
      );
    },
  ],

  // ── 9.6 Adding rational expressions ──
  "math/algebra-1/unit-9/9.6": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return fill(
        `Simplify:   ${a}/x + ${b}/x`,
        `${a + b}/x`,
        { hint: "an expression in x" },
      );
    },
    (r) => {
      const a = r.nonzero(-8, 8);
      let b = r.nonzero(-8, 8);
      if (b === a) b = a + 1;
      return fill(
        `To add 1/(x${signed(a)}) and 1/(x${signed(b)}), the common denominator is a product of two brackets. What is its degree in x?`,
        2,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 12);
      return fill(
        `${a}/x + ${b}/x = m/x. What is m?`,
        a + b,
        { hint: "a number" },
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
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 9);
      return fill(`Solve ${a * b}/x = ${b}.`, a, { hint: "a number" });
    },
    (r) => {
      const a = r.nonzero(-9, 9);
      return fill(
        `Solving an equation containing 1/(x${signed(a)}) gives two candidates. Which one has to be thrown out?`,
        -a,
        { hint: "a number" },
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
    (r) => {
      const k = r.int(2, 12);
      const x = r.int(2, 9);
      return fill(
        `y varies directly with x, and y = ${k * x} when x = ${x}. What is the constant of variation?`,
        k,
        { hint: "a number" },
      );
    },
    (r) => {
      const k = r.pick([12, 24, 36, 48]);
      const x = r.pick([2, 3, 4, 6]);
      return slider(
        `y varies inversely with x, and y = ${k / 2} when x = 2. Place y when x = ${x}.`,
        { min: 0, max: 30, step: 1, value: k / x, full: 1, zero: 5 },
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
      return fill(
        `For ${values.join(", ")}, what is the interquartile range?`,
        q3 - q1,
        { hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(1, 8);
      const values = [base, base + 2, base + 4, base + 6, base + 8, base + 10, base + 12];
      return fill(
        `What is the first quartile of ${values.join(", ")}?`,
        base + 2,
        { hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(0, 6);
      const values = [base, base + 1, base + 3, base + 4, base + 6];
      return slider(`Place the median of ${values.join(", ")}.`, {
        min: 0,
        max: 15,
        step: 1,
        value: base + 3,
      });
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
    (r) => {
      const values = [1, 2, 2, 3, 3, 3, r.int(30, 60)];
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return fill(
        `For ${values.join(", ")}, which is larger, the mean or the median? Enter the larger one, to one decimal place.`,
        Math.round(mean * 10) / 10,
        { hint: "a number", tolerance: 0.05 },
      );
    },
    (r) => {
      const big = r.int(40, 90);
      const values = [2, 4, 6, 8, big];
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return fill(
        `How many of ${values.join(", ")} lie above the mean?`,
        values.filter((v) => v > mean).length,
        { hint: "a whole number" },
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
    (r) => {
      const strong = r.bool();
      const negative = r.bool();
      const size = strong ? 0.9 : 0.3;
      return slider(
        `A scatter plot shows a ${strong ? "tight" : "loose"} ${negative ? "downward" : "upward"} trend. Place the correlation coefficient.`,
        {
          min: -1,
          max: 1,
          step: 0.1,
          value: negative ? -size : size,
          full: 0.2,
          zero: 0.7,
        },
      );
    },
    (r) => {
      const r10 = r.pick([2, 3, 4, 5, 6, 7, 8, 9]);
      const negative = r.bool();
      return fill(
        `Two variables have a correlation coefficient of ${negative ? "-" : ""}0.${r10}. What proportion of the variation does the line explain?`,
        Math.round(r10 * r10) / 100,
        { hint: "a decimal" },
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
    (r) => {
      const m = r.nonzero(-4, 4);
      const b = r.int(-6, 9);
      const t = r.int(1, 9);
      return fill(
        `A line of best fit is y = ${head(m, "x")}${signed(b)}. What does it predict at x = ${t}?`,
        m * t + b,
        { hint: "a number" },
      );
    },
    (r) => {
      const m = r.int(1, 4);
      const b = r.int(0, 5);
      const x = r.int(1, 6);
      const residual = r.nonzero(-5, 5);
      return slider(
        `A line of best fit is y = ${head(m, "x")}${signed(b)}, and the observed value at x = ${x} is ${m * x + b + residual}. Place the residual.`,
        { min: -6, max: 6, step: 1, value: residual },
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
      return fill(
        `Of ${total} students, ${a} walk and cycle, ${b} walk only, ${c} cycle only and ${d} do neither. How many walk?`,
        a + b,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(5, 30);
      const b = r.int(5, 30);
      return fill(
        `In a two-way table, a row reads ${a} and ${b} across its two columns. What is the row total?`,
        a + b,
        { hint: "a whole number" },
      );
    },
    (r) => {
      const both = r.int(4, 20);
      const only = r.int(4, 20);
      return fill(
        `Of ${both + only} students who walk to school, ${both} also play sport. What fraction of the walkers play sport?`,
        frac(both, both + only),
        { hint: "a fraction" },
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
    (r) =>
      order(
        "Put these in order, weakest evidence of cause first.",
        [
          "Two variables happen to rise together in one data set",
          "The pattern repeats across several independent data sets",
          "A plausible mechanism links the two",
          "A controlled experiment changes one and the other follows",
        ],
        r,
      ),
    (r) => {
      const r10 = r.pick([2, 4, 5, 6, 8]);
      return fill(
        `Two variables correlate at 0.${r10}, and someone claims one causes the other. What proportion of the variation is left unexplained?`,
        Math.round(100 - r10 * r10) / 100,
        { hint: "a decimal" },
      );
    },
  ],
};
