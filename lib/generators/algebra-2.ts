import "server-only";

import {
  among,
  ask,
  frac,
  graph,
  head,
  fill,
  piFrac,
  plot,
  point,
  slider,
  poly,
  signed,
  type Built,
  type Rng,
} from "./kit";

/**
 * Algebra 2 generators.
 *
 * The same rule as everywhere else: multiple choice is kept for the questions
 * whose answer really is a statement — which sampling method is random, what
 * the induction step is, which identity is the right one — and everything with
 * a numeric answer is typed, dragged or placed. A vertex, a centre and the
 * solution of a system are all points, so they are answered on a grid.
 */
export const ALGEBRA_2: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.5 Matrix multiplication ──
  "math/algebra-2/unit-1/1.5": [
    (r) => {
      const m = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
      const v = [r.nonzero(-5, 5), r.nonzero(-5, 5)];
      const top = m[0] * v[0] + m[1] * v[1];
      return fill(
        `Multiply [[${m[0]}, ${m[1]}], [${m[2]}, ${m[3]}]] by the column vector (${v[0]}, ${v[1]}). What is the top entry?`,
        top,
        { hint: "a number" },
      );
    },
  ],

  // ── 1.6 Determinants ──
  "math/algebra-2/unit-1/1.6": [
    (r) => {
      const [a, b, c, d] = [
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
      ];
      return fill(
        `What is the determinant of [[${a}, ${b}], [${c}, ${d}]]?`,
        a * d - b * c,
        { hint: "a number" },
      );
    },
  ],

  // ── 2.5 Powers of i ──
  "math/algebra-2/unit-2/2.5": [
    (r) => {
      const n = r.int(5, 60);
      const cycle = ["1", "i", "-1", "-i"];
      return among(`Simplify: i^${n}`, cycle[n % 4], cycle, r);
    },
  ],

  // ── 2.6 Operations with complex numbers ──
  "math/algebra-2/unit-2/2.6": [
    (r) => {
      const [a, b, c, d] = [
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
      ];
      // (a + bi)(c + di) = (ac - bd) + (ad + bc)i
      const real = a * c - b * d;
      const imaginary = a * d + b * c;
      const complex = (re: number, im: number) =>
        im === 0 ? String(re) : `${re}${signed(im, "i")}`;
      return ask(
        `Multiply: (${complex(a, b)})(${complex(c, d)})`,
        complex(real, imaginary),
        [
          complex(a * c + b * d, imaginary), // forgot that i² is -1
          complex(real, a * d - b * c),
          complex(a * c, b * d), // multiplied the parts separately
          complex(-real, imaginary),
          complex(imaginary, real),
        ],
        r,
      );
    },
  ],

  // ── 2.7 Complex conjugates ──
  "math/algebra-2/unit-2/2.7": [
    (r) => {
      const a = r.nonzero(-9, 9);
      const b = r.nonzero(-9, 9);
      // (a + bi)(a - bi) = a² + b², which is the point: the product is real.
      return fill(
        `What is (${a}${signed(b, "i")})(${a}${signed(-b, "i")})?`,
        a * a + b * b,
        { hint: "a number" },
      );
    },
  ],

  // ── 3.5 Synthetic division ──
  "math/algebra-2/unit-3/3.5": [
    (r) => {
      const root = r.nonzero(-5, 5);
      const [a, b, c] = [r.coefficient(5), r.nonzero(-9, 9), r.nonzero(-9, 9)];
      // Dividing by (x - root) leaves this remainder, by the Remainder Theorem.
      const remainder = a * root * root + b * root + c;
      return fill(
        `What is the remainder when ${poly([[a, 2], [b, 1], [c, 0]])} is divided by (x${signed(-root)})?`,
        remainder,
        { hint: "a number" },
      );
    },
  ],

  // ── 3.7 The Rational Root Theorem ──
  "math/algebra-2/unit-3/3.7": [
    (r) => {
      const lead = r.pick([2, 3, 4, 6]);
      const constant = r.pick([6, 10, 12, 15]);
      const divisors = (n: number) =>
        Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
      const p = r.pick(divisors(constant));
      const q = r.pick(divisors(lead).filter((d) => d > 1) ?? [1]);
      const bad = constant + lead + 1; // shares no factor with either
      return ask(
        `For ${poly([[lead, 3], [r.nonzero(-5, 5), 1], [constant, 0]])}, which is a possible rational root by the Rational Root Theorem?`,
        frac(p, q),
        [frac(q, p), frac(bad, q), frac(p, bad), frac(lead, constant), frac(bad, 1)],
        r,
      );
    },
  ],

  // ── 4.5 Vertical and horizontal asymptotes ──
  "math/algebra-2/unit-4/4.5": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.coefficient(6);
      const shift = r.nonzero(-7, 7);
      // (ax + n) / (bx + shift): horizontal asymptote at y = a/b.
      const n = r.nonzero(-9, 9);
      return ask(
        `What is the horizontal asymptote of y = (${head(a, "x")}${signed(n)}) / (${head(b, "x")}${signed(shift)})?`,
        `y = ${frac(a, b)}`,
        [
          `y = ${frac(b, a)}`, // inverted the ratio
          `y = 0`, // the rule for a lower-degree numerator
          `x = ${frac(-shift, b)}`, // gave the vertical asymptote
          `y = ${frac(n, shift)}`, // used the constants
          `y = ${frac(a + b, 2)}`,
          `y = ${frac(-a, b)}`, // sign slip on the leading coefficients
        ],
        r,
      );
    },
  ],

  // ── 5.2 Rational exponents ──
  "math/algebra-2/unit-5/5.2": [
    (r) => {
      const base = r.pick([4, 8, 9, 16, 27, 25, 32, 64]);
      const roots: Record<number, [number, number]> = {
        4: [2, 2],
        8: [3, 2],
        9: [2, 3],
        16: [2, 4],
        27: [3, 3],
        25: [2, 5],
        32: [5, 2],
        64: [3, 4],
      };
      const [index, root] = roots[base];
      const numerator = r.int(2, 3);
      const value = root ** numerator;
      return fill(
        `Evaluate: ${base}^(${numerator}/${index})`,
        value,
        { hint: "a number" },
      );
    },
  ],

  // ── 5.8 Function composition ──
  "math/algebra-2/unit-5/5.8": [
    (r) => {
      const [a, b, c, d] = [
        r.coefficient(5),
        r.nonzero(-8, 8),
        r.coefficient(5),
        r.nonzero(-8, 8),
      ];
      const at = r.nonzero(-5, 5);
      // f(g(x)) where f(x) = ax + b and g(x) = cx + d.
      const g = c * at + d;
      const fg = a * g + b;
      return fill(
        `If f(x) = ${head(a, "x")}${signed(b)} and g(x) = ${head(c, "x")}${signed(d)}, what is f(g(${at}))?`,
        fg,
        { hint: "a number" },
      );
    },
  ],

  // ── 5.9 Inverse functions ──
  "math/algebra-2/unit-5/5.9": [
    (r) => {
      const m = r.coefficient(7);
      const b = r.nonzero(-10, 10);
      const inverse = (num: string, den: number) => `f⁻¹(x) = (${num}) / ${den}`;
      return ask(
        `If f(x) = ${head(m, "x")}${signed(b)}, what is f⁻¹(x)?`,
        inverse(`x${signed(-b)}`, m),
        [
          inverse(`x${signed(b)}`, m), // did not negate the constant
          inverse(`x${signed(-b)}`, -m),
          `f⁻¹(x) = ${head(m, "x")}${signed(-b)}`, // negated but never divided
          `f⁻¹(x) = ${frac(1, m)}x${signed(b)}`,
          inverse(`x${signed(-m)}`, b),
        ],
        r,
      );
    },
  ],

  // ── 6.6 Properties of logarithms ──
  "math/algebra-2/unit-6/6.6": [
    (r) => {
      const base = r.pick([2, 3, 5, 10]);
      const p = r.int(2, 4);
      const q = r.int(2, 4);
      // log_b(base^p · base^q) = p + q.
      return fill(
        `Simplify: log_${base}(${base ** p}) + log_${base}(${base ** q})`,
        p + q,
        { hint: "a number" },
      );
    },
  ],

  // ── 6.5 Graphing logarithmic functions ──
  "math/algebra-2/unit-6/6.5": [
    (r) => {
      const base = r.pick([2, 3, 5, 10]);
      const n = r.int(2, 5);
      return fill(`Evaluate: log_${base}(${base ** n})`, n, { hint: "a number" });
    },
  ],

  // ── 6.8 Solving exponential equations ──
  "math/algebra-2/unit-6/6.8": [
    (r) => {
      const base = r.pick([2, 3, 5]);
      const x = r.int(2, 5);
      // The shifted exponent has to stay positive, or the right-hand side is a
      // fraction printed as 0.3333333333333333.
      let shift = r.nonzero(-3, 3);
      while (x + shift < 1) shift = r.nonzero(-3, 3);
      const value = base ** (x + shift);
      return fill(
        `Solve for x:  ${base}^(x${signed(shift)}) = ${value}`,
        x,
        { hint: "a number" },
      );
    },
  ],

  // ── 7.1 Angles and radian measure ──
  "math/algebra-2/unit-7/7.1": [
    (r) => {
      const degrees = r.pick([30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]);
      return ask(
        `Convert ${degrees}° to radians.`,
        piFrac(degrees, 180),
        [
          piFrac(180, degrees), // inverted the conversion
          piFrac(degrees, 360),
          piFrac(degrees * 2, 180),
          String(degrees),
          piFrac(degrees, 90),
        ],
        r,
      );
    },
  ],

  // ── 7.2 The unit circle ──
  "math/algebra-2/unit-7/7.2": [
    (r) => {
      const points: [string, string, string][] = [
        // [angle, cos, sin]
        ["0", "1", "0"],
        ["π/6", "√3/2", "1/2"],
        ["π/4", "√2/2", "√2/2"],
        ["π/3", "1/2", "√3/2"],
        ["π/2", "0", "1"],
        ["2π/3", "-1/2", "√3/2"],
        ["3π/4", "-√2/2", "√2/2"],
        ["5π/6", "-√3/2", "1/2"],
        ["π", "-1", "0"],
        ["7π/6", "-√3/2", "-1/2"],
        ["4π/3", "-1/2", "-√3/2"],
        ["3π/2", "0", "-1"],
        ["5π/3", "1/2", "-√3/2"],
        ["11π/6", "√3/2", "-1/2"],
      ];
      const [angle, cos, sin] = r.pick(points);
      const wantSin = r.bool();
      return ask(
        `What is ${wantSin ? "sin" : "cos"}(${angle})?`,
        wantSin ? sin : cos,
        [
          wantSin ? cos : sin, // read the other coordinate
          "1/2",
          "-1/2",
          "√3/2",
          "-√3/2",
          "√2/2",
          "-√2/2",
          "0",
          "1",
          "-1",
        ],
        r,
      );
    },
  ],

  // ── 7.7 Amplitude, period, phase shift ──
  "math/algebra-2/unit-7/7.7": [
    (r) => {
      const amplitude = r.int(2, 9);
      const b = r.int(2, 6);
      const wantPeriod = r.bool();
      return ask(
        `For y = ${amplitude} sin(${b}x), what is the ${wantPeriod ? "period" : "amplitude"}?`,
        wantPeriod ? piFrac(2, b) : String(amplitude),
        wantPeriod
          ? [String(amplitude), piFrac(2, 1), piFrac(b, 2), piFrac(1, b), String(b)]
          : [piFrac(2, b), String(b), String(2 * amplitude), String(amplitude * b), piFrac(2, 1)],
        r,
      );
    },
  ],

  // ── 8.2 Arithmetic sequences ──
  "math/algebra-2/unit-8/8.2": [
    (r) => {
      const first = r.nonzero(-12, 12);
      const step = r.nonzero(-9, 9);
      const n = r.int(6, 20);
      const nth = first + step * (n - 1);
      return fill(
        `An arithmetic sequence has first term ${first} and common difference ${step}. What is the ${n}th term?`,
        nth,
        { hint: "a number" },
      );
    },
  ],

  // ── 8.3 Arithmetic series ──
  "math/algebra-2/unit-8/8.3": [
    (r) => {
      const first = r.nonzero(-9, 9);
      const step = r.nonzero(-6, 6);
      const n = r.int(5, 15);
      const last = first + step * (n - 1);
      const sum = (n * (first + last)) / 2;
      return fill(
        `What is the sum of the first ${n} terms of the arithmetic sequence starting ${first} with common difference ${step}?`,
        sum,
        { hint: "a number" },
      );
    },
  ],

  // ── 8.6 Infinite geometric series ──
  "math/algebra-2/unit-8/8.6": [
    (r) => {
      const first = r.nonzero(-12, 12);
      const den = r.int(2, 6);
      const num = r.nonzero(-(den - 1), den - 1);
      // |ratio| < 1, so the series converges to a / (1 - ratio).
      const sum = frac(first * den, den - num);
      return fill(
        `What is the sum of the infinite geometric series with first term ${first} and common ratio ${frac(num, den)}?`,
        sum,
        { hint: "a number or fraction" },
      );
    },
  ],

  // ── 9.4 Ellipses ──
  "math/algebra-2/unit-9/9.4": [
    (r) => {
      const a = r.int(4, 12);
      let b = r.int(2, 11);
      while (b >= a) b = r.int(2, 11);
      // c² = a² - b² for an ellipse.
      const cSquared = a * a - b * b;
      return fill(
        `For the ellipse x²/${a * a} + y²/${b * b} = 1, what is c², where c is the focal distance?`,
        cSquared,
        { hint: "a number" },
      );
    },
  ],

  // ── 10.2 Probability of compound events ──
  "math/algebra-2/unit-10/10.2": [
    (r) => {
      const sides = r.pick([6, 8, 10]);
      const wanted = r.int(2, sides - 1);
      const chance = Math.round((wanted / sides) * 100);
      return slider(
        `A fair ${sides}-sided die is rolled. What is the probability of rolling ${wanted} or lower, as a percentage?`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: chance,
          unit: "%",
          full: 2,
          zero: 25,
        },
      );
    },
  ],

  // ── 10.5 Normal distributions and z-scores ──
  "math/algebra-2/unit-10/10.5": [
    (r) => {
      const mean = r.int(40, 120);
      const sd = r.pick([2, 4, 5, 10]);
      const z = r.nonzero(-3, 3);
      const value = mean + z * sd;
      return fill(
        `A distribution has mean ${mean} and standard deviation ${sd}. What is the z-score of ${value}?`,
        z,
        { hint: "a number" },
      );
    },
  ],
  // ── 1.1 Linear functions and inequalities ──
  "math/algebra-2/unit-1/1.1": [
    (r) => {
      const m = r.coefficient(6);
      const b = r.nonzero(-9, 9);
      const at = r.int(-6, 6);
      return fill(
        `f(x) = ${head(m, "x")}${signed(b)}.   Find f(${at}).`,
        m * at + b,
      );
    },
  ],

  // ── 1.2 Systems in two variables ──
  "math/algebra-2/unit-1/1.2": [
    (r) => {
      const span = 8;
      const x = r.nonzero(-7, 7);
      const y = r.nonzero(-7, 7);
      const a = r.coefficient(5);
      const b = r.coefficient(5);
      const c = r.coefficient(5);
      const rolled = r.coefficient(5);
      // Nudging by one always breaks the tie: a·(d ± 1) differs from a·d by a,
      // which is never zero.
      const d = a * rolled === b * c ? rolled + (rolled > 0 ? 1 : -1) : rolled;
      return point(
        `Solve, and place the solution:   ${head(a, "x")}${signed(b, "y")} = ${a * x + b * y}   and   ${head(c, "x")}${signed(d, "y")} = ${c * x + d * y}`,
        { span, x, y, zero: 2 },
      );
    },
  ],

  // ── 1.3 Systems in three variables ──
  "math/algebra-2/unit-1/1.3": [
    (r) => {
      const x = r.nonzero(-6, 6);
      const y = r.nonzero(-6, 6);
      const z = r.nonzero(-6, 6);
      // Two of the three equations are already solved, so the third is one
      // substitution away — the arithmetic stays about the method.
      return fill(
        `Solve for x:   x + y + z = ${x + y + z},   y = ${y},   z = ${z}`,
        x,
        { hint: "Substitute what you already know" },
      );
    },
  ],

  // ── 1.4 Matrix operations ──
  "math/algebra-2/unit-1/1.4": [
    (r) => {
      const a = [r.int(-9, 9), r.int(-9, 9), r.int(-9, 9), r.int(-9, 9)];
      const b = [r.int(-9, 9), r.int(-9, 9), r.int(-9, 9), r.int(-9, 9)];
      const take = r.bool();
      const s = take ? -1 : 1;
      const entry = a[0] + s * b[0];
      return fill(
        `[[${a[0]}, ${a[1]}], [${a[2]}, ${a[3]}]] ${take ? "-" : "+"} [[${b[0]}, ${b[1]}], [${b[2]}, ${b[3]}]].   What is the top-left entry?`,
        entry,
        { hint: "a number" },
      );
    },
  ],

  // ── 1.7 Inverse matrices ──
  "math/algebra-2/unit-1/1.7": [
    (r) => {
      const a = r.nonzero(-6, 6);
      const b = r.nonzero(-6, 6);
      const c = r.nonzero(-6, 6);
      const rolled = r.nonzero(-6, 6);
      // A singular matrix has no inverse to ask about, so d is moved off the
      // one value that would make the determinant vanish.
      const d = a * rolled === b * c ? rolled + (rolled > 0 ? 1 : -1) : rolled;
      const det = a * d - b * c;
      return fill(
        `A⁻¹ = (1/det)·[[d, -b], [-c, a]].   What is the top-left entry of the inverse of [[${a}, ${b}], [${c}, ${d}]]?`,
        frac(d, det),
        { hint: "a number or fraction" },
      );
    },
  ],

  // ── 1.8 Solving systems with matrices ──
  "math/algebra-2/unit-1/1.8": [
    (r) => {
      const a = r.nonzero(-6, 6);
      const b = r.nonzero(-6, 6);
      const c = r.nonzero(-6, 6);
      const d = r.nonzero(-6, 6);
      const det = a * d - b * c;
      return ask(
        `A system is written as AX = B with A = [[${a}, ${b}], [${c}, ${d}]]. What must be true for X = A⁻¹B to exist?`,
        det === 0 ? "It does not — the determinant is zero" : `The determinant is ${det}, which is not zero`,
        [
          "A must be symmetric",
          "B must be a zero vector",
          "A must have positive entries",
          "The system must have two variables",
        ],
        r,
      );
    },
  ],

  // ── 2.1 Quadratic forms and transformations ──
  "math/algebra-2/unit-2/2.1": [
    // Placed, not picked. Vertex form hands the vertex over in the equation,
    // so the parabola is deliberately not drawn — with it on the grid this
    // would be a question about looking rather than about reading the form.
    (r) => {
      const span = 8;
      const a = r.coefficient(4);
      const h = r.nonzero(-6, 6);
      const k = r.nonzero(-6, 6);
      const inside = h > 0 ? `x - ${h}` : `x + ${-h}`;
      return point(
        `Place the vertex of   y = ${head(a, "")}(${inside})^2${signed(k)}`,
        { span, x: h, y: k, zero: 2 },
      );
    },
  ],

  // ── 2.2 Solving by factoring and square roots ──
  "math/algebra-2/unit-2/2.2": [
    (r) => {
      const p = r.nonzero(-8, 8);
      const rolled = p + r.int(1, 7);
      const q = rolled === 0 ? 1 : rolled;
      return ask(
        `Solve:   ${poly([[1, 2], [-(p + q), 1], [p * q, 0]])} = 0`,
        `x = ${Math.min(p, q)} or x = ${Math.max(p, q)}`,
        [
          `x = ${Math.min(-p, -q)} or x = ${Math.max(-p, -q)}`,
          `x = ${p} or x = ${-q}`,
          `x = ${p + q}`,
          `x = ${p * q}`,
          `x = ${Math.min(p, q)}`,
        ],
        r,
      );
    },
  ],

  // ── 2.3 Completing the square ──
  "math/algebra-2/unit-2/2.3": [
    (r) => {
      const half = r.nonzero(-7, 7);
      const c = r.nonzero(-9, 9);
      const inside = half > 0 ? `x + ${half}` : `x - ${-half}`;
      return ask(
        `Write   ${poly([[1, 2], [2 * half, 1], [c, 0]])}   in vertex form.`,
        `(${inside})^2${signed(c - half * half)}`,
        [
          `(${inside})^2${signed(c)}`,
          `(${half > 0 ? `x - ${half}` : `x + ${-half}`})^2${signed(c - half * half)}`,
          `(${inside})^2${signed(c + half * half)}`,
          `(x${signed(2 * half)})^2${signed(c - half * half)}`,
          `(${inside})^2${signed(c - half * half - 1)}`,
        ],
        r,
      );
    },
  ],

  // ── 2.4 The quadratic formula and the discriminant ──
  "math/algebra-2/unit-2/2.4": [
    (r) => {
      const a = r.int(1, 4);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      const disc = b * b - 4 * a * c;
      return fill(
        `What is the discriminant of   ${poly([[a, 2], [b, 1], [c, 0]])} ?`,
        disc,
        { hint: "b² - 4ac" },
      );
    },
  ],

  // ── 2.8 Complex solutions ──
  "math/algebra-2/unit-2/2.8": [
    (r) => {
      const h = r.nonzero(-6, 6);
      const root = r.int(2, 7);
      const k = root * root;
      const inside = h > 0 ? `x - ${h}` : `x + ${-h}`;
      return ask(
        `Solve:   (${inside})^2 = -${k}`,
        `x = ${h} ± ${root}i`,
        [
          `x = ${h} ± ${root}`,
          `x = ${-h} ± ${root}i`,
          `x = ${h} ± ${k}i`,
          `x = ±${root}i`,
          `x = ${h} ± ${root * 2}i`,
        ],
        r,
      );
    },
  ],

  // ── 2.9 Quadratic inequalities ──
  "math/algebra-2/unit-2/2.9": [
    (r) => {
      const p = r.int(-7, 3);
      const q = p + r.int(2, 7);
      return ask(
        `Solve:   ${poly([[1, 2], [-(p + q), 1], [p * q, 0]])} < 0`,
        `${p} < x < ${q}`,
        [
          `x < ${p} or x > ${q}`,
          `${-q} < x < ${-p}`,
          `x < ${p}`,
          `x > ${q}`,
          `${p} ≤ x ≤ ${q}`,
        ],
        r,
      );
    },
  ],

  // ── 2.10 Systems with a quadratic ──
  "math/algebra-2/unit-2/2.10": [
    (r) => {
      const p = r.int(-5, 2);
      const q = p + r.int(1, 5);
      // y = x² and y = (p + q)x - pq meet where x² - (p+q)x + pq = 0.
      return ask(
        `Where do   y = x^2   and   y = ${poly([[p + q, 1], [-p * q, 0]])}   meet?`,
        `x = ${p} and x = ${q}`,
        [
          `x = ${-p} and x = ${-q}`,
          `x = ${p + q}`,
          `x = ${p * q}`,
          `x = ${p} only`,
          `They do not meet`,
        ],
        r,
      );
    },
  ],

  // ── 3.1 End behaviour ──
  "math/algebra-2/unit-3/3.1": [
    (r) => {
      const degree = r.pick([2, 3, 4, 5]);
      const lead = r.coefficient(6);
      const even = degree % 2 === 0;
      const up = lead > 0;
      const answer = even
        ? up
          ? "Up on both ends"
          : "Down on both ends"
        : up
          ? "Down on the left, up on the right"
          : "Up on the left, down on the right";
      return among(
        `What is the end behaviour of a degree ${degree} polynomial with leading coefficient ${lead}?`,
        answer,
        [
          "Up on both ends",
          "Down on both ends",
          "Down on the left, up on the right",
          "Up on the left, down on the right",
        ],
        r,
      );
    },
  ],

  // ── 3.2 Graphing polynomials ──
  "math/algebra-2/unit-3/3.2": [
    (r) => {
      const roots = [r.nonzero(-6, -1), r.nonzero(-2, 2), r.nonzero(3, 6)];
      return fill(
        `Where does   y = (x${signed(-roots[0])})(x${signed(-roots[1])})(x${signed(-roots[2])})   cross the y-axis?`,
        -roots[0] * -roots[1] * -roots[2],
        { hint: "Put x = 0" },
      );
    },
  ],

  // ── 3.3 Multiplying polynomials ──
  "math/algebra-2/unit-3/3.3": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const c = r.coefficient(5);
      const d = r.nonzero(-9, 9);
      return ask(
        `Expand:   (${head(a, "x")}${signed(b)})(${head(c, "x")}${signed(d)})`,
        poly([[a * c, 2], [a * d + b * c, 1], [b * d, 0]]),
        [
          poly([[a * c, 2], [b * d, 0]]),
          poly([[a * c, 2], [a * d - b * c, 1], [b * d, 0]]),
          poly([[a + c, 2], [a * d + b * c, 1], [b + d, 0]]),
          poly([[a * c, 2], [a * d + b * c, 1], [-b * d, 0]]),
          poly([[a * c, 2], [b * c, 1], [b * d, 0]]),
        ],
        r,
      );
    },
  ],

  // ── 3.4 Polynomial long division ──
  "math/algebra-2/unit-3/3.4": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-8, 8);
      const root = r.nonzero(-6, 6);
      // (x - root)(ax + b), divided back by (x - root).
      const terms: [number, number][] = [
        [a, 2],
        [b - a * root, 1],
        [-b * root, 0],
      ];
      return fill(
        `Divide:   (${poly(terms)}) ÷ (x${signed(-root)})`,
        `${head(a, "x")}${signed(b)}`,
        { hint: "an expression in x" },
      );
    },
  ],

  // ── 3.6 The Remainder and Factor Theorems ──
  "math/algebra-2/unit-3/3.6": [
    (r) => {
      const root = r.nonzero(-5, 5);
      const a = r.coefficient(4);
      const b = r.nonzero(-9, 9);
      // (x - root)(ax + b) has (x - root) as a factor, and nothing else does.
      const terms: [number, number][] = [
        [a, 2],
        [b - a * root, 1],
        [-b * root, 0],
      ];
      // Both factors count. Asking for "a" factor and then accepting only the
      // monic one would mark a correct factorisation wrong, which is a worse
      // failure than the question being slightly easier.
      return fill(
        `Give a linear factor of   ${poly(terms)}`,
        `x${signed(-root)}`,
        {
          accept: [`${head(a, "x")}${signed(b)}`],
          hint: "e.g. x - 3",
        },
      );
    },
  ],

  // ── 3.8 The Fundamental Theorem of Algebra ──
  "math/algebra-2/unit-3/3.8": [
    (r) => {
      const degree = r.int(2, 8);
      return fill(
        `How many roots does a degree ${degree} polynomial have, counting complex roots and multiplicity?`,
        degree,
        { hint: "Exactly as many as its degree" },
      );
    },
  ],

  // ── 3.9 All real and complex zeros ──
  "math/algebra-2/unit-3/3.9": [
    (r) => {
      const real = r.nonzero(-6, 6);
      const imaginary = r.int(2, 6);
      return fill(
        `A polynomial with real coefficients has zeros ${real} and ${imaginary}i. Which zero must it also have?`,
        `${-imaginary}i`,
        { hint: "e.g. -4i" },
      );
    },
  ],

  // ── 3.10 Building a polynomial from its zeros ──
  "math/algebra-2/unit-3/3.10": [
    (r) => {
      const p = r.nonzero(-6, 6);
      const rolled = p + r.int(1, 6);
      const q = rolled === 0 ? 1 : rolled;
      return ask(
        `Which polynomial has zeros ${p} and ${q}?`,
        poly([[1, 2], [-(p + q), 1], [p * q, 0]]),
        [
          poly([[1, 2], [p + q, 1], [p * q, 0]]),
          poly([[1, 2], [-(p + q), 1], [-p * q, 0]]),
          poly([[1, 2], [-p * q, 1], [p + q, 0]]),
          poly([[1, 2], [p + q, 1], [-p * q, 0]]),
          poly([[1, 2], [-(p + q), 1], [p * q + 1, 0]]),
          poly([[1, 2], [-(p + q) + 1, 1], [p * q, 0]]),
          poly([[1, 2], [-(p + q) - 1, 1], [p * q, 0]]),
        ],
        r,
      );
    },
  ],

  // ── 3.11 Multiplicity and turning points ──
  "math/algebra-2/unit-3/3.11": [
    (r) => {
      const degree = r.int(3, 8);
      return fill(
        `At most how many turning points does a degree ${degree} polynomial have?`,
        degree - 1,
        { hint: "One fewer than the degree" },
      );
    },
  ],

  // ── 3.12 Polynomial inequalities ──
  "math/algebra-2/unit-3/3.12": [
    (r) => {
      const p = r.int(-6, 2);
      const q = p + r.int(2, 6);
      return ask(
        `Solve:   (x${signed(-p)})(x${signed(-q)}) > 0`,
        `x < ${p} or x > ${q}`,
        [
          `${p} < x < ${q}`,
          `x > ${p}`,
          `x < ${q}`,
          `x < ${-q} or x > ${-p}`,
          `${-q} < x < ${-p}`,
        ],
        r,
      );
    },
  ],

  // ── 3.13 The Binomial Theorem ──
  "math/algebra-2/unit-3/3.13": [
    (r) => {
      const n = r.int(3, 7);
      const k = r.int(1, n - 1);
      let choose = 1;
      for (let i = 0; i < k; i++) choose = (choose * (n - i)) / (i + 1);
      return fill(
        `In the expansion of (a + b)^${n}, what is the coefficient of a^${n - k}b^${k}?`,
        choose,
        { hint: "A row of Pascal's triangle" },
      );
    },
  ],

  // ── 4.1 Simplifying rational expressions ──
  "math/algebra-2/unit-4/4.1": [
    (r) => {
      const a = r.nonzero(-8, 8);
      return fill(
        `Simplify:   (x^2 - ${a * a}) / (x${signed(-a)})`,
        `x${signed(a)}`,
        { hint: "an expression in x" },
      );
    },
  ],

  // ── 4.2 Multiplying and dividing ──
  "math/algebra-2/unit-4/4.2": [
    (r) => {
      const pool = [-7, -5, -3, -2, 2, 3, 5, 7];
      const a = r.pick(pool);
      const b = r.pick(pool.filter((v) => v !== a));
      const c = r.pick(pool.filter((v) => v !== a && v !== b));
      return ask(
        `Simplify:   (x${signed(a)})/(x${signed(b)}) ÷ (x${signed(c)})/(x${signed(b)})`,
        `(x${signed(a)})/(x${signed(c)})`,
        [
          `(x${signed(c)})/(x${signed(a)})`,
          `(x${signed(a)})/(x${signed(b)})`,
          `(x${signed(a)})(x${signed(c)})`,
          `(x${signed(b)})/(x${signed(c)})`,
          `(x${signed(a + c)})/(x${signed(b)})`,
        ],
        r,
      );
    },
  ],

  // ── 4.3 Adding and subtracting ──
  "math/algebra-2/unit-4/4.3": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return ask(
        `Simplify:   ${a}/x + ${b}/x^2`,
        `(${a}x + ${b})/x^2`,
        [
          `${a + b}/x^2`,
          `${a + b}/x^3`,
          `(${a} + ${b}x)/x^2`,
          `${a * b}/x^2`,
          `(${a}x + ${b})/x`,
        ],
        r,
      );
    },
  ],

  // ── 4.4 Complex fractions ──
  "math/algebra-2/unit-4/4.4": [
    (r) => {
      const b = r.int(2, 9);
      const k = r.int(2, 5);
      const a = b * k;
      return fill(
        `Simplify:   (${a}/x) ÷ (${b}/x^2)`,
        head(k, "x"),
        { hint: "an expression in x" },
      );
    },
  ],

  // ── 4.6 Holes ──
  "math/algebra-2/unit-4/4.6": [
    (r) => {
      const span = 8;
      const hole = r.nonzero(-5, 5);
      const other = hole + r.int(1, 6);
      // The break in the line is drawn but the missing point is not, so the
      // hole is something to find rather than something to spot.
      return slider(
        `Drag to the x where   y = ((x${signed(-hole)})(x${signed(-other)})) / (x${signed(-hole)})   has its hole.`,
        {
          min: -8,
          max: 8,
          step: 1,
          value: hole,
          full: 0.25,
          zero: 2,
          figure: graph({
            span,
            curves: [
              plot((x) => x - other, { span, to: hole - 0.4 }),
              plot((x) => x - other, { span, from: hole + 0.4, label: "y" }),
            ],
          }),
        },
      );
    },
  ],

  // ── 4.7 Slant asymptotes ──
  "math/algebra-2/unit-4/4.7": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-8, 8);
      const root = r.nonzero(-6, 6);
      const terms: [number, number][] = [
        [a, 2],
        [b - a * root, 1],
        [-b * root, 0],
      ];
      return ask(
        `What is the slant asymptote of   y = (${poly(terms)}) / (x${signed(-root)}) ?`,
        `y = ${head(a, "x")}${signed(b)}`,
        [
          `y = ${head(a, "x")}${signed(-b)}`,
          `y = ${head(a, "x")}`,
          "y = 0",
          `y = ${head(b, "x")}${signed(a)}`,
          `x = ${root}`,
        ],
        r,
      );
    },
  ],

  // ── 4.8 Graphing rational functions ──
  "math/algebra-2/unit-4/4.8": [
    (r) => {
      const zero = r.nonzero(-7, 7);
      const pole = zero + r.int(1, 6);
      return fill(
        `Where does   y = (x${signed(-zero)}) / (x${signed(-pole)})   cross the x-axis?`,
        `x = ${zero}`,
        { hint: "e.g. x = 3" },
      );
    },
  ],

  // ── 4.9 Rational equations and extraneous roots ──
  "math/algebra-2/unit-4/4.9": [
    (r) => {
      const a = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      return fill(
        `${poly([[1, 2], [0, 1], [-a * a, 0]])} over (x${signed(-a)}) equals ${c}. Which value of x is excluded from the domain?`,
        a,
        { hint: "The denominator may not vanish" },
      );
    },
  ],

  // ── 4.10 Rational inequalities ──
  "math/algebra-2/unit-4/4.10": [
    (r) => {
      const pole = r.nonzero(-7, 7);
      return ask(
        `For which x is   1/(x${signed(-pole)}) > 0 ?`,
        `x > ${pole}`,
        [`x < ${pole}`, `x > ${-pole}`, `x < ${-pole}`, "Every x", `x > ${pole + 1}`],
        r,
      );
    },
  ],

  // ── 4.11 Variation ──
  "math/algebra-2/unit-4/4.11": [
    (r) => {
      const k = r.int(2, 12);
      const x = r.int(2, 9);
      const y = r.int(2, 6);
      const joint = r.bool();
      return fill(
        joint
          ? `z varies jointly with x and y, and z = ${k * x * y} when x = ${x} and y = ${y}. What is the constant of variation?`
          : `y varies directly with x, and y = ${k * x} when x = ${x}. What is the constant of variation?`,
        k,
        { hint: "Divide it back out" },
      );
    },
  ],

  // ── 5.1 nth roots ──
  "math/algebra-2/unit-5/5.1": [
    (r) => {
      const base = r.int(2, 5);
      const n = r.pick([2, 3, 4]);
      return fill(
        `Evaluate:   the ${n === 2 ? "square" : n === 3 ? "cube" : "fourth"} root of ${base ** n}`,
        base,
        { hint: "a number" },
      );
    },
  ],

  // ── 5.3 Simplifying radical expressions ──
  "math/algebra-2/unit-5/5.3": [
    (r) => {
      const outside = r.int(2, 7);
      const inside = r.pick([2, 3, 5, 6, 7, 10, 11, 13]);
      const n = outside * outside * inside;
      return ask(
        `Simplify:   √${n}`,
        `${outside}√${inside}`,
        [
          `${outside * inside}`,
          `${inside}√${outside}`,
          `${outside}√${inside * 2}`,
          `${outside * 2}√${inside}`,
          `${outside + inside}`,
        ],
        r,
      );
    },
  ],

  // ── 5.4 Rationalising a denominator ──
  "math/algebra-2/unit-5/5.4": [
    (r) => {
      const a = r.int(2, 9);
      const k = r.pick([2, 3, 5, 6, 7, 11]);
      return ask(
        `Rationalise:   ${a}/√${k}`,
        `${a}√${k}/${k}`,
        [`${a}/${k}`, `√${k}/${a}`, `${a}√${k}`, `${a * k}/√${k}`, `${a}√${k}/${a}`],
        r,
      );
    },
  ],

  // ── 5.5 Square root and cube root graphs ──
  "math/algebra-2/unit-5/5.5": [
    (r) => {
      const h = r.int(2, 9);
      const right = r.bool();
      const inside = right ? `x - ${h}` : `x + ${h}`;
      return ask(
        `What is the domain of   y = √(${inside}) ?`,
        `x ≥ ${right ? h : -h}`,
        [
          `x ≥ ${right ? -h : h}`,
          `x ≤ ${right ? h : -h}`,
          "Every x",
          `x > ${right ? h : -h}`,
          `x ≥ 0`,
        ],
        r,
      );
    },
  ],

  // ── 5.6 Radical equations ──
  "math/algebra-2/unit-5/5.6": [
    (r) => {
      const b = r.int(2, 9);
      const a = r.int(1, 20);
      return fill(
        `Solve:   √(x + ${a}) = ${b}`,
        b * b - a,
        { hint: "Square, then check it back" },
      );
    },
  ],

  // ── 5.7 Function operations ──
  "math/algebra-2/unit-5/5.7": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const c = r.coefficient(5);
      const d = r.nonzero(-9, 9);
      const at = r.int(-5, 5);
      const f = a * at + b;
      const g = c * at + d;
      const product = r.bool();
      return fill(
        `f(x) = ${head(a, "x")}${signed(b)} and g(x) = ${head(c, "x")}${signed(d)}.   Find (f ${product ? "·" : "+"} g)(${at}).`,
        product ? f * g : f + g,
      );
    },
  ],

  // ── 5.10 Verifying an inverse ──
  "math/algebra-2/unit-5/5.10": [
    (r) => {
      const m = r.int(2, 5);
      const b = r.nonzero(-9, 9);
      return ask(
        `f(x) = ${head(m, "x")}${signed(b)}.   Which function undoes it?`,
        `f⁻¹(x) = (x${signed(-b)})/${m}`,
        [
          `f⁻¹(x) = (x${signed(b)})/${m}`,
          `f⁻¹(x) = ${head(m, "x")}${signed(-b)}`,
          `f⁻¹(x) = ${frac(1, m)}x${signed(b)}`,
          `f⁻¹(x) = (x${signed(-b)})·${m}`,
        ],
        r,
      );
    },
  ],
  // ── 6.1 Exponential growth and decay ──
  "math/algebra-2/unit-6/6.1": [
    (r) => {
      const rate = r.pick([5, 10, 20, 25, 50]);
      const growth = r.bool();
      const factor = growth ? 100 + rate : 100 - rate;
      return fill(
        `A population ${growth ? "grows" : "falls"} by ${rate}% a year. What is the yearly multiplier?`,
        frac(factor, 100),
        { hint: "a number or fraction" },
      );
    },
  ],

  // ── 6.2 The natural base ──
  "math/algebra-2/unit-6/6.2": [
    (r) => {
      const a = r.int(2, 20);
      const k = r.int(2, 9);
      const growth = r.bool();
      return among(
        `What does   y = ${a}e^(${growth ? "" : "-"}${k}t)   describe?`,
        growth ? "Continuous growth" : "Continuous decay",
        [
          "Continuous growth",
          "Continuous decay",
          "Linear growth",
          "Periodic motion",
        ],
        r,
      );
    },
  ],

  // ── 6.3 Graphing exponential functions ──
  "math/algebra-2/unit-6/6.3": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.pick([2, 3, 4, 5]);
      const c = r.nonzero(-9, 9);
      return fill(
        `Where does   y = ${a} · ${b}^x${signed(c)}   cross the y-axis?`,
        a + c,
        { hint: "Any base to the power zero is 1" },
      );
    },
  ],

  // ── 6.4 Logarithmic notation ──
  "math/algebra-2/unit-6/6.4": [
    (r) => {
      const b = r.pick([2, 3, 4, 5]);
      const n = r.int(2, 4);
      return ask(
        `Rewrite   log_${b}(${b ** n}) = ${n}   without a logarithm.`,
        `${b}^${n} = ${b ** n}`,
        [
          `${n}^${b} = ${b ** n}`,
          `${b} · ${n} = ${b ** n}`,
          `${b ** n}^${n} = ${b}`,
          `${b}^${b ** n} = ${n}`,
        ],
        r,
      );
    },
  ],

  // ── 6.7 The change of base formula ──
  "math/algebra-2/unit-6/6.7": [
    (r) => {
      const b = r.pick([2, 3, 5, 7]);
      const x = r.int(11, 60);
      return ask(
        `Rewrite   log_${b}(${x})   using natural logs.`,
        `ln ${x} / ln ${b}`,
        [`ln ${b} / ln ${x}`, `ln ${x} · ln ${b}`, `ln(${x}/${b})`, `ln ${x} - ln ${b}`],
        r,
      );
    },
  ],

  // ── 6.9 Solving logarithmic equations ──
  "math/algebra-2/unit-6/6.9": [
    (r) => {
      const b = r.pick([2, 3, 4, 5]);
      const n = r.int(2, 4);
      return fill(
        `Solve:   log_${b}(x) = ${n}`,
        b ** n,
        { hint: "Undo the log with the base" },
      );
    },
  ],

  // ── 6.10 Compound and continuous interest ──
  "math/algebra-2/unit-6/6.10": [
    (r) => {
      const principal = r.int(1, 20) * 100;
      const rate = r.pick([5, 10, 20, 25]);
      const years = r.int(2, 3);
      const value = principal * (1 + rate / 100) ** years;
      return fill(
        `$${principal} at ${rate}% a year, compounded yearly. What is it worth after ${years} years?`,
        Number(value.toFixed(2)),
        { unit: "dollars", hint: "Multiply by the growth factor each year" },
      );
    },
  ],

  // ── 6.11 Exponential and logarithmic modelling ──
  "math/algebra-2/unit-6/6.11": [
    (r) => {
      const start = r.int(2, 40);
      const doublings = r.int(2, 6);
      const hours = r.int(2, 5);
      return fill(
        `A culture of ${start} doubles every ${hours} hours. How many are there after ${doublings * hours} hours?`,
        start * 2 ** doublings,
        { hint: "Count the doublings first" },
      );
    },
  ],

  // ── 6.12 Logistic growth ──
  "math/algebra-2/unit-6/6.12": [
    (r) => {
      const cap = r.int(2, 50) * 100;
      const a = r.int(2, 9);
      const k = r.int(2, 6);
      return fill(
        `P(t) = ${cap} / (1 + ${a}e^(-${k}t)).   What does P approach as t grows?`,
        cap,
        { hint: "The exponential term dies away" },
      );
    },
  ],

  // ── 7.3 Right triangle trigonometry ──
  "math/algebra-2/unit-7/7.3": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ];
      const [opposite, adjacent, hypotenuse] = r.pick(triples);
      const wantSin = r.bool();
      return fill(
        `A right triangle has legs ${opposite} and ${adjacent} with hypotenuse ${hypotenuse}. What is ${wantSin ? "sin" : "cos"} θ for the angle opposite the side of ${opposite}?`,
        frac(wantSin ? opposite : adjacent, hypotenuse),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 7.4 Trigonometric functions of any angle ──
  "math/algebra-2/unit-7/7.4": [
    (r) => {
      const quadrant = r.int(1, 4);
      const positives = [
        "All are positive",
        "Only sine is positive",
        "Only tangent is positive",
        "Only cosine is positive",
      ];
      return among(
        `In quadrant ${quadrant}, which of sine, cosine and tangent are positive?`,
        positives[quadrant - 1],
        positives,
        r,
      );
    },
  ],

  // ── 7.5 Reference angles ──
  "math/algebra-2/unit-7/7.5": [
    (r) => {
      const acute = r.int(10, 80);
      const quadrant = r.int(2, 4);
      const angle = quadrant === 2 ? 180 - acute : quadrant === 3 ? 180 + acute : 360 - acute;
      return fill(
        `What is the reference angle for ${angle}°?`,
        acute,
        { unit: "degrees", hint: "The acute angle to the x-axis" },
      );
    },
  ],

  // ── 7.6 Graphing sine and cosine ──
  "math/algebra-2/unit-7/7.6": [
    (r) => {
      const amplitude = r.int(2, 9);
      const shift = r.nonzero(-8, 8);
      return fill(
        `What is the greatest value of   y = ${amplitude} sin x${signed(shift)} ?`,
        amplitude + shift,
        { hint: "Sine tops out at 1" },
      );
    },
  ],

  // ── 7.8 Tangent and the reciprocal graphs ──
  "math/algebra-2/unit-7/7.8": [
    (r) => {
      const k = r.int(1, 4);
      return among(
        `Where does the graph of y = tan x have its asymptotes?`,
        "Wherever cos x = 0",
        [
          "Wherever cos x = 0",
          "Wherever sin x = 0",
          `Every ${90 * k}° without exception`,
          "It has none",
        ],
        r,
      );
    },
  ],

  // ── 7.9 Inverse trigonometric functions ──
  "math/algebra-2/unit-7/7.9": [
    (r) => {
      const cases = [
        { call: "arcsin(1/2)", angle: 30 },
        { call: "arcsin(√2/2)", angle: 45 },
        { call: "arcsin(√3/2)", angle: 60 },
        { call: "arccos(1/2)", angle: 60 },
        { call: "arccos(√3/2)", angle: 30 },
        { call: "arctan(1)", angle: 45 },
        { call: "arctan(√3)", angle: 60 },
        { call: "arccos(0)", angle: 90 },
      ];
      const c = r.pick(cases);
      return fill(`Evaluate:   ${c.call}`, `${c.angle}°`,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 7.10 Solving trigonometric equations ──
  "math/algebra-2/unit-7/7.10": [
    (r) => {
      const cases = [
        { equation: "sin θ = 1/2", answer: "30° and 150°" },
        { equation: "sin θ = -1/2", answer: "210° and 330°" },
        { equation: "cos θ = 1/2", answer: "60° and 300°" },
        { equation: "cos θ = -1/2", answer: "120° and 240°" },
        { equation: "tan θ = 1", answer: "45° and 225°" },
      ];
      const c = r.pick(cases);
      return among(
        `Solve for 0° ≤ θ < 360°:   ${c.equation}`,
        c.answer,
        cases.map((one) => one.answer),
        r,
      );
    },
  ],

  // ── 7.11 The Pythagorean identity ──
  "math/algebra-2/unit-7/7.11": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ];
      const [opposite, adjacent, hypotenuse] = r.pick(triples);
      return fill(
        `sin θ = ${frac(opposite, hypotenuse)} and θ is acute. What is cos θ?`,
        frac(adjacent, hypotenuse),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 7.12 Verifying identities ──
  "math/algebra-2/unit-7/7.12": [
    (r) => {
      const cases = [
        { left: "1 - sin²θ", right: "cos²θ" },
        { left: "1 - cos²θ", right: "sin²θ" },
        { left: "sin θ / cos θ", right: "tan θ" },
        { left: "1 / cos θ", right: "sec θ" },
        { left: "1 + tan²θ", right: "sec²θ" },
      ];
      const c = r.pick(cases);
      return among(
        `Simplify:   ${c.left}`,
        c.right,
        cases.map((one) => one.right),
        r,
      );
    },
  ],

  // ── 7.13 Sum and difference formulas ──
  "math/algebra-2/unit-7/7.13": [
    (r) => {
      const sum = r.bool();
      return ask(
        `Which expansion is correct for   ${sum ? "cos(A + B)" : "cos(A - B)"} ?`,
        sum
          ? "cos A cos B - sin A sin B"
          : "cos A cos B + sin A sin B",
        [
          sum ? "cos A cos B + sin A sin B" : "cos A cos B - sin A sin B",
          "sin A cos B + cos A sin B",
          "sin A cos B - cos A sin B",
          "cos A cos B",
        ],
        r,
      );
    },
  ],

  // ── 7.14 Double-angle formulas ──
  "math/algebra-2/unit-7/7.14": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ];
      const [opposite, adjacent, hypotenuse] = r.pick(triples);
      const square = hypotenuse * hypotenuse;
      return fill(
        `sin θ = ${frac(opposite, hypotenuse)} and cos θ = ${frac(adjacent, hypotenuse)}. What is sin 2θ?`,
        frac(2 * opposite * adjacent, square),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 7.15 The Law of Sines and the Law of Cosines ──
  "math/algebra-2/unit-7/7.15": [
    (r) => {
      const side = r.int(3, 20);
      return fill(
        `A triangle has a 30° angle opposite a side of x, and a 90° angle opposite a side of ${2 * side}. What is x?`,
        side,
        { hint: "a / sin A is the same for every side" },
      );
    },
  ],

  // ── 7.16 Modelling periodic behaviour ──
  "math/algebra-2/unit-7/7.16": [
    (r) => {
      const b = r.pick([2, 3, 4, 5, 6]);
      const amplitude = r.int(2, 9);
      return fill(
        `What is the period, in degrees, of   y = ${amplitude} sin(${b}x) ?`,
        360 / b,
        { unit: "degrees", hint: "360 divided by the coefficient" },
      );
    },
  ],

  // ── 8.1 Recursive sequences ──
  "math/algebra-2/unit-8/8.1": [
    (r) => {
      const first = r.int(1, 9);
      const multiplier = r.int(2, 4);
      const add = r.nonzero(-6, 6);
      let value = first;
      for (let i = 0; i < 3; i++) value = multiplier * value + add;
      return fill(
        `a(1) = ${first} and a(n) = ${multiplier}·a(n - 1)${signed(add)}.   What is a(4)?`,
        value,
        { hint: "Step through one term at a time" },
      );
    },
  ],

  // ── 8.4 Geometric sequences ──
  "math/algebra-2/unit-8/8.4": [
    (r) => {
      const first = r.int(1, 9);
      const ratio = r.pick([2, 3, 4]);
      const n = r.int(4, 7);
      return fill(
        `The first term is ${first} and the common ratio is ${ratio}. What is term ${n}?`,
        first * ratio ** (n - 1),
        { hint: "One fewer multiplication than the term number" },
      );
    },
  ],

  // ── 8.5 Geometric series ──
  "math/algebra-2/unit-8/8.5": [
    (r) => {
      const first = r.int(1, 9);
      const ratio = r.pick([2, 3]);
      const n = r.int(3, 6);
      const sum = (first * (ratio ** n - 1)) / (ratio - 1);
      return fill(
        `Add the first ${n} terms of a geometric sequence starting at ${first} with ratio ${ratio}.`,
        sum,
        { hint: "a(rⁿ - 1)/(r - 1)" },
      );
    },
  ],

  // ── 8.7 Sigma notation ──
  "math/algebra-2/unit-8/8.7": [
    (r) => {
      const a = r.int(2, 6);
      const b = r.nonzero(-6, 6);
      const n = r.int(3, 6);
      let total = 0;
      for (let k = 1; k <= n; k++) total += a * k + b;
      return fill(
        `Evaluate:   Σ from k = 1 to ${n} of (${head(a, "k")}${signed(b)})`,
        total,
        { hint: "Write the terms out" },
      );
    },
  ],

  // ── 8.8 Mathematical induction ──
  "math/algebra-2/unit-8/8.8": [
    (r) => {
      const n = r.int(1, 9);
      return ask(
        `A proof by induction has shown the statement holds for n = ${n}. What is the remaining step?`,
        `Assume it holds for some k, and prove it for k + 1`,
        [
          `Check it for n = ${n + 1} as well`,
          `Check every n up to ${n + 10}`,
          "Assume it holds for all n and check the first case",
          "Show it fails for some n",
        ],
        r,
      );
    },
  ],

  // ── 9.1 Distance and midpoint ──
  "math/algebra-2/unit-9/9.1": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
      ];
      const [dx, dy, distance] = r.pick(triples);
      const x = r.int(-6, 2);
      const y = r.int(-6, 2);
      return fill(
        `How far is (${x}, ${y}) from (${x + dx}, ${y + dy})?`,
        distance,
        { hint: "a number" },
      );
    },
  ],

  // ── 9.2 Parabolas ──
  "math/algebra-2/unit-9/9.2": [
    (r) => {
      const span = 8;
      const p = r.int(1, 6);
      // The parabola is drawn, because the focus is not visible on it — the
      // picture says which way the curve opens and how wide, and the student
      // still has to know that 4p is where the focus lives.
      return point(`Place the focus of   x^2 = ${4 * p}y`, {
        span,
        x: 0,
        y: p,
        zero: 2,
        figure: graph({
          span,
          curves: [plot((x) => (x * x) / (4 * p), { span, label: "y" })],
        }),
      });
    },
  ],

  // ── 9.3 Circles ──
  "math/algebra-2/unit-9/9.3": [
    (r) => {
      const span = 8;
      const h = r.nonzero(-6, 6);
      const k = r.nonzero(-6, 6);
      const radius = r.int(2, 9);
      return point(
        `Place the centre of   (x${signed(-h)})^2 + (y${signed(-k)})^2 = ${radius * radius}`,
        { span, x: h, y: k, zero: 2 },
      );
    },
  ],

  // ── 9.5 Hyperbolas ──
  "math/algebra-2/unit-9/9.5": [
    // The pair of slopes is ±b/a, but only the positive one is asked for: the
    // answer box is a keyboard, and ± is not on it.
    (r) => {
      const a = r.int(2, 8);
      const b = r.int(2, 8);
      return fill(
        `The asymptotes of   x²/${a * a} - y²/${b * b} = 1   have slopes ±m. What is m?`,
        frac(b, a),
        { hint: "a number or fraction" },
      );
    },
  ],

  // ── 9.6 Classifying conics ──
  "math/algebra-2/unit-9/9.6": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const kind = r.int(0, 3);
      const equations = [
        `x^2 + y^2 = ${a * a}`,
        `x^2/${a * a} + y^2/${b * b + a * a} = 1`,
        `x^2/${a * a} - y^2/${b * b} = 1`,
        `y = ${a}x^2${signed(b)}`,
      ];
      const names = ["A circle", "An ellipse", "A hyperbola", "A parabola"];
      return among(`What conic is   ${equations[kind]} ?`, names[kind], names, r);
    },
  ],

  // ── 9.7 Systems with a conic ──
  "math/algebra-2/unit-9/9.7": [
    (r) => {
      const radius = r.int(3, 9);
      const kind = r.int(0, 2);
      const line = [radius, radius + r.int(1, 5), r.int(0, radius - 1)][kind];
      const answer = [1, 0, 2][kind];
      return fill(
        `How many times does the line   y = ${line}   meet the circle   x² + y² = ${radius * radius} ?`,
        answer,
        { hint: "Compare the line with the radius" },
      );
    },
  ],

  // ── 10.1 Permutations and combinations ──
  "math/algebra-2/unit-10/10.1": [
    (r) => {
      const n = r.int(4, 8);
      const k = r.int(2, 3);
      let permutations = 1;
      for (let i = 0; i < k; i++) permutations *= n - i;
      let factorial = 1;
      for (let i = 2; i <= k; i++) factorial *= i;
      const ordered = r.bool();
      return fill(
        ordered
          ? `In how many orders can ${k} of ${n} runners finish first through ${k === 2 ? "second" : "third"}?`
          : `How many groups of ${k} can be chosen from ${n} people?`,
        ordered ? permutations : permutations / factorial,
        { hint: ordered ? "Order matters" : "Order does not matter" },
      );
    },
  ],

  // ── 10.3 Conditional probability and independence ──
  "math/algebra-2/unit-10/10.3": [
    (r) => {
      const red = r.int(2, 9);
      const blue = r.int(2, 9);
      const total = red + blue;
      return fill(
        `A bag holds ${red} red and ${blue} blue counters. Two are drawn without replacement. What is the chance both are red?`,
        frac(red * (red - 1), total * (total - 1)),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 10.4 Binomial distributions ──
  "math/algebra-2/unit-10/10.4": [
    (r) => {
      const n = r.int(3, 6);
      const k = r.int(1, n - 1);
      let choose = 1;
      for (let i = 0; i < k; i++) choose = (choose * (n - i)) / (i + 1);
      return fill(
        `A fair coin is thrown ${n} times. What is the chance of exactly ${k} heads?`,
        frac(choose, 2 ** n),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 10.6 Sampling and design ──
  "math/algebra-2/unit-10/10.6": [
    (r) => {
      const n = r.int(2, 9) * 50;
      return ask(
        `A school of ${n} students is surveyed. Which method gives a random sample?`,
        "Draw names from a list of every student",
        [
          "Ask the first students to arrive",
          "Ask everyone on one sports team",
          "Ask whoever answers an online post",
          "Ask the students sitting nearest the door",
        ],
        r,
      );
    },
  ],

  // ── 10.7 Margin of error ──
  "math/algebra-2/unit-10/10.7": [
    (r) => {
      const root = r.pick([10, 20, 25, 50]);
      const n = root * root;
      return fill(
        `A sample of ${n} people gives a margin of error of about 1/√n, as a percentage. What is it?`,
        Number((100 / root).toFixed(2)),
        { unit: "percent", hint: "Take the square root first" },
      );
    },
  ],

  // ── 10.8 Choosing a regression model ──
  "math/algebra-2/unit-10/10.8": [
    (r) => {
      const start = r.int(2, 9);
      const kind = r.int(0, 2);
      const values = [
        [start, start * 2, start * 4, start * 8],
        [start, start + 3, start + 6, start + 9],
        [start, start + 3, start + 8, start + 15],
      ][kind];
      const names = ["Exponential", "Linear", "Quadratic", "Logarithmic"];
      return among(
        `Which model fits the data ${values.join(", ")}?`,
        names[kind],
        names,
        r,
      );
    },
  ],
};
