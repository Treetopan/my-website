import "server-only";

import {
  ask,
  frac,
  head,
  fill,
  nearMisses,
  poly,
  signed,
  type Built,
  type Rng,
} from "./kit";

/**
 * AP Calculus AB generators.
 *
 * Polynomials do most of the work here. They are the one family where a
 * generator can roll coefficients freely and still be sure the derivative, the
 * antiderivative and the definite integral all come out exact — which is what
 * lets the question be about the rule rather than about the arithmetic.
 */
export const CALCULUS_AB: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.6 Determining limits using algebraic manipulation ──
  "math/ap-calculus-ab/unit-1/1.6": [
    (r) => {
      const root = r.nonzero(-6, 6);
      let other = r.nonzero(-6, 6);
      while (other === root) other = r.nonzero(-6, 6);
      // A 0/0 form that cancels to (x - other).
      return ask(
        `Evaluate: lim(x→${root}) (${poly([[1, 2], [-(root + other), 1], [root * other, 0]])}) / (x${signed(-root)})`,
        root - other,
        ["The limit does not exist", 0, root + other, other - root, root * other],
        r,
      );
    },
  ],

  // ── 1.15 Limits at infinity and horizontal asymptotes ──
  "math/ap-calculus-ab/unit-1/1.15": [
    (r) => {
      const a = r.coefficient(8);
      const b = r.coefficient(8);
      const degree = r.pick(["same", "top", "bottom"] as const);
      const top = degree === "top" ? 3 : 2;
      const bottom = degree === "bottom" ? 3 : 2;
      const answer =
        degree === "same" ? frac(a, b) : degree === "top" ? "∞ (no limit)" : "0";
      return ask(
        `Evaluate: lim(x→∞) (${head(a, `x^${top}`)} + 1) / (${head(b, `x^${bottom}`)} + 1)`,
        answer,
        [frac(a, b), "0", "∞ (no limit)", frac(b, a), String(a - b), frac(-a, b)],
        r,
      );
    },
  ],

  // ── 2.5 The Power Rule ──
  "math/ap-calculus-ab/unit-2/2.5": [
    (r) => {
      const a = r.coefficient(9);
      const n = r.int(3, 8);
      const b = r.coefficient(9);
      const m = r.int(1, n - 1);
      const c = r.nonzero(-9, 9);
      return ask(
        `Differentiate: f(x) = ${poly([[a, n], [b, m], [c, 0]])}`,
        poly([[a * n, n - 1], [b * m, m - 1]]),
        [
          poly([[a * n, n - 1], [b * m, m - 1], [c, 0]]), // kept the constant
          poly([[a * n, n], [b * m, m]]), // did not drop the exponent
          poly([[a, n - 1], [b, m - 1]]), // dropped the exponent but never multiplied
          poly([[a * (n - 1), n - 1], [b * (m - 1), m - 1]]),
          poly([[a * n, n - 1]]),
        ],
        r,
      );
    },
  ],

  // ── 2.8 The Product Rule ──
  "math/ap-calculus-ab/unit-2/2.8": [
    (r) => {
      const [a, b, c, d] = [
        r.coefficient(5),
        r.nonzero(-8, 8),
        r.coefficient(5),
        r.nonzero(-8, 8),
      ];
      // (ax+b)(cx+d) differentiates to 2acx + ad + bc.
      return ask(
        `Differentiate: f(x) = (${head(a, "x")}${signed(b)})(${head(c, "x")}${signed(d)})`,
        poly([[2 * a * c, 1], [a * d + b * c, 0]]),
        [
          poly([[a * c, 0]]), // multiplied the derivatives
          poly([[a * c, 1], [a * d + b * c, 0]]),
          poly([[2 * a * c, 1], [a * d - b * c, 0]]),
          poly([[a * c, 2], [a * d + b * c, 1], [b * d, 0]]), // never differentiated
          poly([[2 * a * c, 1]]),
        ],
        r,
      );
    },
  ],

  // ── 2.9 The Quotient Rule ──
  "math/ap-calculus-ab/unit-2/2.9": [
    (r) => {
      const [a, b, c, d] = [
        r.coefficient(5),
        r.nonzero(-8, 8),
        r.coefficient(5),
        r.nonzero(-8, 8),
      ];
      // The numerator of the derivative is ad - bc, a constant.
      const numerator = a * d - b * c;
      const bottom = `(${head(c, "x")}${signed(d)})^2`;
      return ask(
        `Differentiate: f(x) = (${head(a, "x")}${signed(b)}) / (${head(c, "x")}${signed(d)})`,
        `${numerator} / ${bottom}`,
        [
          `${b * c - a * d} / ${bottom}`, // subtracted the wrong way round
          `${a * d + b * c} / ${bottom}`,
          `${frac(a, c)}`, // differentiated top and bottom separately
          `${numerator} / (${head(c, "x")}${signed(d)})`,
          `${a * c} / ${bottom}`,
        ],
        r,
      );
    },
  ],

  // ── 3.1 The Chain Rule ──
  "math/ap-calculus-ab/unit-3/3.1": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.nonzero(-9, 9);
      const n = r.int(2, 6);
      // d/dx (ax + b)^n = n·a·(ax + b)^(n-1)
      const inner = `(${head(a, "x")}${signed(b)})`;
      const showPower = (coefficient: number, exponent: number) =>
        exponent === 1 ? head(coefficient, inner) : `${head(coefficient, "")}${inner}^${exponent}`;
      return ask(
        `Differentiate: f(x) = ${inner}^${n}`,
        showPower(n * a, n - 1),
        [
          showPower(n, n - 1), // forgot the inner derivative
          showPower(n * a, n), // did not drop the exponent
          showPower(a, n - 1),
          showPower(n * a, n - 2),
          showPower((n - 1) * a, n - 1),
        ],
        r,
      );
    },
  ],

  // ── 3.6 Higher-order derivatives ──
  "math/ap-calculus-ab/unit-3/3.6": [
    (r) => {
      const a = r.coefficient(6);
      const n = r.int(4, 8);
      const b = r.coefficient(6);
      // The second derivative of ax^n + bx^2 is a·n(n-1)x^(n-2) + 2b.
      return ask(
        `What is f''(x) for f(x) = ${poly([[a, n], [b, 2]])}?`,
        poly([[a * n * (n - 1), n - 2], [2 * b, 0]]),
        [
          poly([[a * n, n - 1], [2 * b, 1]]), // stopped at the first derivative
          poly([[a * n * (n - 1), n - 1], [2 * b, 0]]),
          poly([[a * n * n, n - 2], [2 * b, 0]]),
          poly([[a * n * (n - 1) * (n - 2), n - 3], [0, 0]]),
          poly([[a * n * (n - 1), n - 2], [b, 0]]),
        ],
        r,
      );
    },
  ],

  // ── 4.2 Straight-line motion ──
  "math/ap-calculus-ab/unit-4/4.2": [
    (r) => {
      const a = r.coefficient(4);
      const b = r.coefficient(6);
      const c = r.nonzero(-9, 9);
      const at = r.int(1, 5);
      // Position s(t) = at² + bt + c, so velocity is 2at + b.
      const velocity = 2 * a * at + b;
      const acceleration = 2 * a;
      const wantVelocity = r.bool();
      return ask(
        `A particle has position s(t) = ${poly([[a, 2], [b, 1], [c, 0]], "t")}. What is its ${wantVelocity ? "velocity" : "acceleration"} at t = ${at}?`,
        wantVelocity ? velocity : acceleration,
        [
          wantVelocity ? acceleration : velocity, // differentiated the wrong number of times
          a * at * at + b * at + c, // gave the position
          a * at + b,
          2 * a * at,
          ...nearMisses(wantVelocity ? velocity : acceleration),
        ],
        r,
      );
    },
  ],

  // ── 4.5 Related rates ──
  "math/ap-calculus-ab/unit-4/4.5": [
    (r) => {
      const rate = r.int(2, 9);
      const radius = r.int(2, 12);
      // A = πr², so dA/dt = 2πr·dr/dt.
      return ask(
        `A circle's radius grows at ${rate} units per second. How fast is its area growing when r = ${radius}, in terms of π?`,
        `${2 * radius * rate}π`,
        [
          `${radius * rate}π`, // dropped the factor of two
          `${radius * radius * rate}π`, // differentiated nothing
          `${2 * radius}π`, // forgot the rate
          `${rate}π`,
          `${2 * radius * radius * rate}π`,
        ],
        r,
      );
    },
  ],

  // ── 4.7 L'Hospital's Rule ──
  "math/ap-calculus-ab/unit-4/4.7": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.coefficient(6);
      const n = r.int(2, 4);
      // lim(x→0) (ax^n + ...) — built so both parts vanish at zero and the
      // ratio of the linear coefficients is the answer.
      const c = r.coefficient(6);
      const d = r.coefficient(6);
      return ask(
        `Evaluate: lim(x→0) (${poly([[a, n], [c, 1]])}) / (${poly([[b, n], [d, 1]])})`,
        frac(c, d),
        [
          frac(a, b), // differentiated too many times
          frac(d, c),
          "0",
          "The limit does not exist",
          frac(a + c, b + d),
          frac(-c, d), // sign slip after differentiating
        ],
        r,
      );
    },
  ],

  // ── 5.3 Increasing and decreasing intervals ──
  "math/ap-calculus-ab/unit-5/5.3": [
    (r) => {
      const p = r.nonzero(-6, 6);
      let q = r.nonzero(-6, 6);
      while (q === p) q = r.nonzero(-6, 6);
      const low = Math.min(p, q);
      const high = Math.max(p, q);
      // f'(x) = (x - p)(x - q), positive outside the roots.
      return ask(
        `f'(x) = ${poly([[1, 2], [-(p + q), 1], [p * q, 0]])}. On which interval is f decreasing?`,
        `(${low}, ${high})`,
        [
          `(${high}, ∞)`,
          `(-∞, ${low})`,
          `(-∞, ${low}) ∪ (${high}, ∞)`, // where it increases
          `(${-high}, ${-low})`,
          `(${low - 1}, ${high + 1})`,
        ],
        r,
      );
    },
  ],

  // ── 5.2 Critical points ──
  "math/ap-calculus-ab/unit-5/5.2": [
    // Typed, because a critical point is a number the student finds rather
    // than one they spot among four.
    (r) => {
      const root = r.nonzero(-6, 6);
      const a = r.coefficient(4);
      // f'(x) = 2a(x - root), so the only critical point is at root.
      return fill(
        `f'(x) = ${poly([[2 * a, 1], [-2 * a * root, 0]])}. At what x does f have its only critical point?`,
        root,
        { hint: "a number" },
      );
    },
  ],

  // ── 5.7 The Second Derivative Test ──
  "math/ap-calculus-ab/unit-5/5.7": [
    (r) => {
      const at = r.nonzero(-6, 6);
      const second = r.nonzero(-9, 9);
      const answer =
        second > 0 ? "A relative minimum" : "A relative maximum";
      return ask(
        `f'(${at}) = 0 and f''(${at}) = ${second}. What does the Second Derivative Test conclude?`,
        answer,
        [
          second > 0 ? "A relative maximum" : "A relative minimum",
          "A point of inflection",
          "The test is inconclusive",
          "Neither a maximum nor a minimum",
        ],
        r,
      );
    },
  ],

  // ── 6.8 Antiderivatives ──
  "math/ap-calculus-ab/unit-6/6.8": [
    (r) => {
      const n = r.int(2, 6);
      const a = (n + 1) * r.coefficient(4); // divides evenly by n + 1
      const b = r.coefficient(6) * 2;
      return ask(
        `Find the general antiderivative of f(x) = ${poly([[a, n], [b, 1]])}.`,
        `${poly([[a / (n + 1), n + 1], [b / 2, 2]])} + C`,
        [
          `${poly([[a * n, n - 1], [b, 0]])} + C`, // differentiated instead
          `${poly([[a, n + 1], [b, 2]])} + C`, // raised the power but never divided
          `${poly([[a / (n + 1), n + 1], [b, 2]])} + C`,
          `${poly([[a / n, n + 1], [b / 2, 2]])} + C`,
          `${poly([[a / (n + 1), n], [b / 2, 1]])} + C`,
        ],
        r,
      );
    },
  ],

  // ── 6.7 The Fundamental Theorem and definite integrals ──
  "math/ap-calculus-ab/unit-6/6.7": [
    (r) => {
      const a = r.coefficient(5) * 3; // divides by 3 so the cubic term is exact
      const b = r.coefficient(5) * 2;
      const upper = r.int(1, 4);
      // ∫₀^u (a x² + b x) dx = (a/3)u³ + (b/2)u²
      const value = (a / 3) * upper ** 3 + (b / 2) * upper ** 2;
      return ask(
        `Evaluate: ∫ from 0 to ${upper} of (${poly([[a, 2], [b, 1]])}) dx`,
        value,
        [
          a * upper * upper + b * upper, // evaluated the integrand
          a * upper ** 3 + b * upper ** 2, // never divided by the new powers
          (a / 3) * upper ** 3,
          2 * a * upper + b, // differentiated
          ...nearMisses(value),
        ],
        r,
      );
    },
  ],

  // ── 6.9 Integrating using substitution ──
  "math/ap-calculus-ab/unit-6/6.9": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-8, 8);
      const n = r.int(2, 5);
      const inner = `(${head(a, "x")}${signed(b)})`;
      // ∫ (ax+b)^n dx = (ax+b)^(n+1) / (a(n+1)) + C
      return ask(
        `Find: ∫ ${inner}^${n} dx`,
        `${inner}^${n + 1} / ${a * (n + 1)} + C`,
        [
          `${inner}^${n + 1} / ${n + 1} + C`, // forgot to divide by the inner derivative
          `${inner}^${n + 1} / ${a} + C`,
          `${inner}^${n - 1} · ${a * n} + C`, // differentiated
          `${inner}^${n + 1} / ${a * n} + C`,
          `${inner}^${n} / ${a * (n + 1)} + C`,
        ],
        r,
      );
    },
  ],

  // ── 8.1 The average value of a function ──
  "math/ap-calculus-ab/unit-8/8.1": [
    (r) => {
      const upper = r.pick([2, 3, 4, 6]);
      const a = 3 * r.coefficient(4);
      // Average of ax² on [0, u] is (a/3)u³ / u = a u² / 3.
      const average = (a * upper * upper) / 3;
      return ask(
        `What is the average value of f(x) = ${head(a, "x^2")} on [0, ${upper}]?`,
        average,
        [
          a * upper * upper, // gave f at the endpoint
          (a / 3) * upper ** 3, // gave the integral without dividing by the width
          frac(a * upper, 3),
          average * 2,
          -average,
        ],
        r,
      );
    },
  ],

  // ── 8.4 The area between curves ──
  "math/ap-calculus-ab/unit-8/8.4": [
    (r) => {
      const m = r.int(2, 8);
      // Between y = mx and y = x² the curves meet at 0 and m, and the area is
      // m³/6.
      const area = frac(m ** 3, 6);
      return ask(
        `What is the area enclosed between y = ${head(m, "x")} and y = x²?`,
        area,
        [
          frac(m ** 3, 3), // integrated only one of the curves
          frac(m ** 3, 2),
          frac(m ** 2, 6),
          String(m ** 3),
          frac(m ** 3, 12),
        ],
        r,
      );
    },
  ],
};
