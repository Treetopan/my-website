import "server-only";

import {
  among,
  ask,
  frac,
  head,
  fill,
  nearMisses,
  piFrac,
  slider,
  poly,
  signed,
  type Built,
  type Rng,
} from "./kit";

/** Algebra 2 generators. */
export const ALGEBRA_2: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.5 Matrix multiplication ──
  "math/algebra-2/unit-1/1.5": [
    (r) => {
      const m = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
      const v = [r.nonzero(-5, 5), r.nonzero(-5, 5)];
      const top = m[0] * v[0] + m[1] * v[1];
      const bottom = m[2] * v[0] + m[3] * v[1];
      return ask(
        `Multiply [[${m[0]}, ${m[1]}], [${m[2]}, ${m[3]}]] by the column vector (${v[0]}, ${v[1]}). What is the top entry?`,
        top,
        [
          bottom, // read the wrong row
          m[0] * v[0] + m[2] * v[1], // went down the column instead of along the row
          m[0] * v[0],
          m[0] * v[0] * m[1] * v[1],
          ...nearMisses(top),
        ],
        r,
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
      return ask(
        `What is the determinant of [[${a}, ${b}], [${c}, ${d}]]?`,
        a * d - b * c,
        [
          a * d + b * c, // added the products
          b * c - a * d, // subtracted the wrong way round
          a * b - c * d, // paired rows instead of diagonals
          a + d - b - c,
          a * c - b * d,
          ...nearMisses(a * d - b * c),
        ],
        r,
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
      return ask(
        `What is (${a}${signed(b, "i")})(${a}${signed(-b, "i")})?`,
        a * a + b * b,
        [
          a * a - b * b, // treated i² as +1
          `${a * a}${signed(b * b, "i")}`,
          a * a,
          2 * a * b,
          -(a * a + b * b),
        ],
        r,
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
      return ask(
        `What is the remainder when ${poly([[a, 2], [b, 1], [c, 0]])} is divided by (x${signed(-root)})?`,
        remainder,
        [
          a * root * root - b * root + c, // sign slip on the root
          a * (-root) ** 2 + b * -root + c,
          c, // read off the constant term
          a + b + c, // evaluated at 1
          ...nearMisses(remainder),
        ],
        r,
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
      return ask(
        `Evaluate: ${base}^(${numerator}/${index})`,
        value,
        [
          root, // took the root and stopped
          base * numerator,
          base ** numerator,
          root ** index,
          root * numerator,
        ],
        r,
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
      return ask(
        `If f(x) = ${head(a, "x")}${signed(b)} and g(x) = ${head(c, "x")}${signed(d)}, what is f(g(${at}))?`,
        fg,
        [
          c * (a * at + b) + d, // composed the other way round
          (a * at + b) * (c * at + d), // multiplied instead of composing
          a * at + b,
          g,
          ...nearMisses(fg),
        ],
        r,
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
      return ask(
        `Simplify: log_${base}(${base ** p}) + log_${base}(${base ** q})`,
        p + q,
        // Not base^(p+q): that is 10,000,000 next to an answer of 7.
        [p * q, Math.abs(p - q), p + q + 1, p + q - 1, base * (p + q)],
        r,
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
      return ask(
        `Solve for x:  ${base}^(x${signed(shift)}) = ${value}`,
        x,
        [x + shift, x - shift, value, frac(value, base), ...nearMisses(x)],
        r,
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
      return ask(
        `An arithmetic sequence has first term ${first} and common difference ${step}. What is the ${n}th term?`,
        nth,
        [
          first + step * n, // counted from term zero
          step * (n - 1), // dropped the first term
          first * n + step,
          first + step,
          nth - step,
          -nth,
        ],
        r,
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
      return ask(
        `What is the sum of the first ${n} terms of the arithmetic sequence starting ${first} with common difference ${step}?`,
        sum,
        [
          n * (first + last), // forgot to halve
          last, // gave the last term
          frac(n * (first + last), 4),
          n * first,
          ...nearMisses(sum),
        ],
        r,
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
      return ask(
        `What is the sum of the infinite geometric series with first term ${first} and common ratio ${frac(num, den)}?`,
        sum,
        [
          frac(first * den, den + num), // sign slip in the denominator
          frac(den - num, first * den),
          String(first),
          frac(first, den),
          "It diverges",
        ],
        r,
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
      return ask(
        `For the ellipse x²/${a * a} + y²/${b * b} = 1, what is c², where c is the focal distance?`,
        cSquared,
        [
          a * a + b * b, // the hyperbola relation
          b * b - a * a,
          a - b,
          (a - b) ** 2,
          a * b,
        ],
        r,
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
      return ask(
        `A distribution has mean ${mean} and standard deviation ${sd}. What is the z-score of ${value}?`,
        z,
        [
          -z, // subtracted the wrong way round
          value - mean, // never divided by the deviation
          frac(value, sd),
          frac(mean - value, sd),
          ...nearMisses(z),
        ],
        r,
      );
    },
  ],
};
