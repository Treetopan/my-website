import "server-only";

import {
  among,
  ask,
  frac,
  head,
  nearMisses,
  piFrac,
  type Built,
  type Rng,
} from "./kit";

/**
 * AP Calculus BC generators.
 *
 * BC shares Units 1–5 with AB, so nothing is generated for them here — the AB
 * generators cover that ground and duplicating them would only mean two places
 * to fix a bug. What follows is BC's own: the extra integration techniques,
 * parametric and polar calculus, and series.
 */
export const CALCULUS_BC: Record<string, ((r: Rng) => Built)[]> = {
  // ── 6.11 Integration by parts ──
  "math/ap-calculus-bc/unit-6/6.11": [
    (r) => {
      const a = r.nonzero(-6, 6);
      // ∫ x·e^(ax) dx = e^(ax)(x/a - 1/a²) + C
      return ask(
        `Find: ∫ x·e^(${head(a, "x")}) dx`,
        `e^(${head(a, "x")})(x/${a} − 1/${a * a}) + C`,
        [
          `e^(${head(a, "x")})(x/${a} + 1/${a * a}) + C`, // sign slip
          `e^(${head(a, "x")})(x/${a}) + C`, // stopped after one round
          `${frac(1, 2)}x²·e^(${head(a, "x")}) + C`, // integrated as a product
          `e^(${head(a, "x")})(x − 1/${a}) + C`,
          `${a}·e^(${head(a, "x")})(x − 1) + C`,
        ],
        r,
      );
    },
  ],

  // ── 6.13 Improper integrals ──
  "math/ap-calculus-bc/unit-6/6.13": [
    (r) => {
      const p = r.int(2, 5);
      const lower = r.int(1, 4);
      // ∫ from L to ∞ of x^-p dx converges to L^(1-p) / (p - 1).
      const converges = r.bool();
      if (converges) {
        return ask(
          `Evaluate: ∫ from ${lower} to ∞ of x^(-${p}) dx`,
          `${frac(1, (p - 1) * lower ** (p - 1))}`,
          [
            frac(1, p - 1),
            frac(1, p * lower ** p),
            "It diverges",
            frac(lower, p - 1),
            "0",
            frac(2, (p - 1) * lower ** (p - 1)),
          ],
          r,
        );
      }
      return among(
        `Does ∫ from ${lower} to ∞ of x^(-1) dx converge or diverge?`,
        "It diverges",
        // Fixed wording rather than one built from `lower`, which collides with
        // the literal options whenever the lower limit happens to be 1.
        [
          "It diverges",
          "It converges to 1",
          "It converges to 0",
          "It converges to ln 2",
        ],
        r,
      );
    },
  ],

  // ── 7.5 Euler's method ──
  "math/ap-calculus-bc/unit-7/7.5": [
    (r) => {
      const slope = r.nonzero(-5, 5);
      const y0 = r.nonzero(-9, 9);
      const step = r.pick([1, 2]);
      // dy/dx = slope (constant), so one Euler step is exact.
      const next = y0 + slope * step;
      return ask(
        `For dy/dx = ${slope}, with y(0) = ${y0}, what does one Euler step of size ${step} give for y(${step})?`,
        next,
        [
          y0 + slope, // ignored the step size
          y0 - slope * step,
          y0 * slope * step,
          slope * step,
          ...nearMisses(next),
        ],
        r,
      );
    },
  ],

  // ── 8.13 Arc length ──
  "math/ap-calculus-bc/unit-8/8.13": [
    (r) => {
      const m = r.nonzero(-9, 9);
      const upper = r.int(2, 9);
      // For y = mx on [0, u], the arc length is u·√(1 + m²).
      const inside = 1 + m * m;
      return ask(
        `What is the arc length of y = ${head(m, "x")} from x = 0 to x = ${upper}?`,
        `${upper}√${inside}`,
        [
          `${upper * Math.abs(m)}`, // dropped the 1, leaving √(m²)
          // `1 + m` rather than `1 + |m|` would ask for √-8 when the slope is
          // negative, which is not a wrong answer so much as a broken one.
          `${upper}√${1 + Math.abs(m)}`, // did not square the slope
          `${upper}`,
          `√${inside}`, // forgot the length of the interval
          `${upper * upper}√${inside}`,
        ],
        r,
      );
    },
  ],

  // ── 9.1 Differentiating parametric equations ──
  "math/ap-calculus-bc/unit-9/9.1": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.coefficient(5);
      const at = r.nonzero(-4, 4);
      // x = a t², y = b t³, so dy/dx = 3b t² / (2a t) = 3b t / (2a).
      const value = frac(3 * b * at, 2 * a);
      return ask(
        `If x = ${head(a, "t^2")} and y = ${head(b, "t^3")}, what is dy/dx at t = ${at}?`,
        value,
        [
          frac(2 * a * at, 3 * b * at * at), // inverted the ratio
          frac(3 * b * at * at, 2 * a), // forgot to cancel a t
          frac(b, a), // divided the coefficients only
          frac(3 * b, 2 * a),
          frac(-3 * b * at, 2 * a),
          frac(3 * b * at, a), // dropped the 2 from the x-derivative
        ],
        r,
      );
    },
  ],

  // ── 9.8 The area of a polar region ──
  "math/ap-calculus-bc/unit-9/9.8": [
    (r) => {
      const a = r.int(2, 9);
      // Area inside r = a is πa², and the polar formula ½∫r² dθ over 0..2π
      // agrees — which is the check the question is really asking for.
      return ask(
        `Using A = ½∫r² dθ, what is the area enclosed by r = ${a} for 0 ≤ θ ≤ 2π?`,
        piFrac(a * a, 1),
        [
          piFrac(2 * a, 1), // used the circumference
          piFrac(a * a, 2), // kept the half without integrating 2π
          piFrac(a, 1),
          piFrac(a * a * 2, 1),
          piFrac(a, 2),
        ],
        r,
      );
    },
  ],

  // ── 10.2 Geometric series ──
  "math/ap-calculus-bc/unit-10/10.2": [
    (r) => {
      const first = r.nonzero(-12, 12);
      const den = r.int(2, 7);
      const num = r.nonzero(-(den - 1), den - 1);
      // |r| < 1, so the series converges to a / (1 - r).
      return ask(
        `What does the geometric series with first term ${first} and ratio ${frac(num, den)} converge to?`,
        frac(first * den, den - num),
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

  // ── 10.5 p-series ──
  "math/ap-calculus-bc/unit-10/10.5": [
    (r) => {
      const p = r.pick([
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 2],
        [1, 1],
        [2, 1],
        [5, 2],
        [3, 4],
      ]);
      const value = p[0] / p[1];
      const converges = value > 1;
      return among(
        `Does the p-series Σ 1/n^(${frac(p[0], p[1])}) converge or diverge?`,
        converges ? "It converges" : "It diverges",
        ["It converges", "It diverges"].concat([
          "It converges conditionally",
          "The test is inconclusive",
        ]),
        r,
      );
    },
  ],

  // ── 10.8 The Ratio Test ──
  "math/ap-calculus-bc/unit-10/10.8": [
    (r) => {
      const limit = r.pick([
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 2],
        [4, 3],
        [5, 2],
      ]);
      const value = limit[0] / limit[1];
      const verdict =
        value < 1
          ? "It converges absolutely"
          : "It diverges";
      return among(
        `The Ratio Test gives a limit of ${frac(limit[0], limit[1])} for a series. What does it conclude?`,
        verdict,
        [
          "It converges absolutely",
          "It diverges",
          "The test is inconclusive",
          "It converges conditionally",
        ],
        r,
      );
    },
  ],

  // ── 10.11 Taylor polynomials ──
  "math/ap-calculus-bc/unit-10/10.11": [
    (r) => {
      const n = r.int(2, 5);
      const factorial = (k: number) => {
        let out = 1;
        for (let i = 2; i <= k; i++) out *= i;
        return out;
      };
      // The Maclaurin series for e^x has coefficient 1/n! on x^n.
      return ask(
        `In the Maclaurin series for e^x, what is the coefficient of x^${n}?`,
        frac(1, factorial(n)),
        [
          frac(1, n), // used n rather than n!
          String(factorial(n)), // did not invert
          frac(1, factorial(n - 1)),
          frac(1, factorial(n + 1)),
          "1",
        ],
        r,
      );
    },
  ],

  // ── 10.13 Radius and interval of convergence ──
  "math/ap-calculus-bc/unit-10/10.13": [
    (r) => {
      const a = r.int(2, 9);
      // Σ (x/a)^n converges for |x| < a, so the radius is a.
      return ask(
        `What is the radius of convergence of Σ x^n / ${a}^n?`,
        a,
        [frac(1, a), a * a, 1, frac(a, 2), 0],
        r,
      );
    },
  ],
};
