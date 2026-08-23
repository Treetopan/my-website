import "server-only";

import {
  ask,
  frac,
  head,
  nearMisses,
  piFrac,
  poly,
  signed,
  type Built,
  type Rng,
} from "./kit";

/** Precalculus generators. */
export const PRECALCULUS: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.4 Average rate of change ──
  "math/precalculus/unit-1/1.4": [
    (r) => {
      const a = r.coefficient(4);
      const c = r.nonzero(-9, 9);
      const x1 = r.int(-5, 3);
      const x2 = x1 + r.int(1, 5);
      // For a quadratic the secant slope reduces to a(x1 + x2) + b, so choosing
      // b away from -a(x1 + x2) keeps the rate off zero. A flat secant is not
      // wrong, but it drags every distractor built from the rise to zero too.
      let b = r.nonzero(-6, 6);
      while (a * (x1 + x2) + b === 0) b = r.nonzero(-6, 6);
      const f = (x: number) => a * x * x + b * x + c;
      const rate = frac(f(x2) - f(x1), x2 - x1);
      return ask(
        `What is the average rate of change of f(x) = ${poly([[a, 2], [b, 1], [c, 0]])} on [${x1}, ${x2}]?`,
        rate,
        [
          frac(f(x2) + f(x1), x2 - x1), // added the outputs
          frac(x2 - x1, f(x2) - f(x1)), // inverted the ratio
          String(f(x2) - f(x1)), // never divided by the run
          frac(f(x1) - f(x2), x2 - x1),
          frac(f(x2), x2),
          frac(2 * (f(x2) - f(x1)), x2 - x1),
          "0",
        ],
        r,
      );
    },
  ],

  // ── 1.8 Function composition ──
  "math/precalculus/unit-1/1.8": [
    (r) => {
      const a = r.coefficient(4);
      const b = r.nonzero(-6, 6);
      const at = r.nonzero(-4, 4);
      // f(x) = ax + b, g(x) = x², so f(g(x)) = a·x² + b.
      const fg = a * at * at + b;
      const gf = (a * at + b) ** 2;
      const wantFg = r.bool();
      return ask(
        `If f(x) = ${head(a, "x")}${signed(b)} and g(x) = x², what is ${wantFg ? "f(g" : "g(f"}(${at}))?`,
        wantFg ? fg : gf,
        [
          wantFg ? gf : fg, // composed in the other order
          (a * at + b) * at * at,
          a * at + b,
          at * at,
          ...nearMisses(wantFg ? fg : gf),
        ],
        r,
      );
    },
  ],

  // ── 2.7 Vertical, horizontal and slant asymptotes ──
  "math/precalculus/unit-2/2.7": [
    (r) => {
      const root = r.nonzero(-7, 7);
      const other = r.nonzero(-7, 7);
      // (x + other) / (x - root) has a vertical asymptote where the bottom is 0.
      return ask(
        `Where is the vertical asymptote of y = (x${signed(other)}) / (x${signed(-root)})?`,
        `x = ${root}`,
        [
          `x = ${-root}`, // sign slip
          `x = ${other}`,
          `x = ${-other}`, // gave the zero of the numerator
          `y = ${root}`,
          `y = 1`,
          `x = 0`, // the asymptote of the un-shifted function
        ],
        r,
      );
    },
  ],

  // ── 3.6 Properties of logarithms ──
  "math/precalculus/unit-3/3.6": [
    (r) => {
      const base = r.pick([2, 3, 5, 10]);
      const p = r.int(2, 5);
      const k = r.int(2, 4);
      // log_b((b^p)^k) = pk.
      return ask(
        `Simplify: ${k}·log_${base}(${base ** p})`,
        p * k,
        [p + k, p, k, p * k + 1, p * k - 1, base * p * k],
        r,
      );
    },
  ],

  // ── 3.7 Solving exponential and logarithmic equations ──
  "math/precalculus/unit-3/3.7": [
    (r) => {
      const base = r.pick([2, 3, 4, 5]);
      const x = r.int(2, 5);
      const shift = r.nonzero(-4, 4);
      const value = base ** x + shift;
      return ask(
        `Solve for x:  ${base}^x${signed(shift)} = ${value}`,
        x,
        [x + shift, x - shift, value, value - shift, frac(value, base)],
        r,
      );
    },
  ],

  // ── 4.2 Radian measure and arc length ──
  "math/precalculus/unit-4/4.2": [
    (r) => {
      const radius = r.int(2, 15);
      const den = r.pick([2, 3, 4, 6]);
      const num = r.int(1, 2 * den - 1);
      // s = rθ, with θ in radians as a multiple of π.
      return ask(
        `A circle of radius ${radius} subtends a central angle of ${piFrac(num, den)} radians. What is the arc length?`,
        piFrac(num * radius, den),
        [
          piFrac(num, den * radius), // divided by the radius
          piFrac(num * radius * radius, den), // used the area formula
          piFrac(num, den),
          String(radius),
          piFrac(num * radius, den * 2),
        ],
        r,
      );
    },
  ],

  // ── 4.5 Sinusoidal transformations ──
  "math/precalculus/unit-4/4.5": [
    (r) => {
      const amplitude = r.int(2, 8);
      const b = r.int(2, 6);
      const midline = r.nonzero(-8, 8);
      const wanted = r.pick(["amplitude", "period", "midline"] as const);
      const correct =
        wanted === "amplitude"
          ? String(amplitude)
          : wanted === "period"
            ? piFrac(2, b)
            : `y = ${midline}`;
      return ask(
        `For y = ${amplitude} cos(${b}x)${signed(midline)}, what is the ${wanted}?`,
        correct,
        [
          String(amplitude),
          piFrac(2, b),
          `y = ${midline}`,
          String(b),
          String(2 * amplitude),
          piFrac(b, 2),
          `y = ${amplitude}`,
        ],
        r,
      );
    },
  ],

  // ── 4.11 Pythagorean identities ──
  "math/precalculus/unit-4/4.11": [
    (r) => {
      const [a, b, c] = r.pick([
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ]);
      // sin θ = a/c in the first quadrant, so cos θ = b/c.
      return ask(
        `If sin θ = ${frac(a, c)} and θ is in the first quadrant, what is cos θ?`,
        frac(b, c),
        [
          frac(a, c), // repeated the sine
          frac(-b, c), // wrong quadrant
          frac(a, b), // gave the tangent
          frac(c, b),
          frac(b, a),
        ],
        r,
      );
    },
  ],

  // ── 5.2 Vector operations and magnitude ──
  "math/precalculus/unit-5/5.2": [
    (r) => {
      const [a, b] = r.pick([
        [3, 4],
        [6, 8],
        [5, 12],
        [8, 15],
        [9, 12],
        [7, 24],
      ]);
      const x = r.sign() * a;
      const y = r.sign() * b;
      const magnitude = Math.round(Math.sqrt(a * a + b * b));
      return ask(
        `What is the magnitude of the vector ⟨${x}, ${y}⟩?`,
        magnitude,
        [
          Math.abs(x) + Math.abs(y), // added the components
          Math.abs(Math.abs(y) - Math.abs(x)),
          magnitude * magnitude,
          Math.abs(x * y),
          magnitude + 1,
        ],
        r,
      );
    },
  ],

  // ── 5.4 The dot product ──
  "math/precalculus/unit-5/5.4": [
    (r) => {
      const [a, b, c, d] = [
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
        r.nonzero(-8, 8),
      ];
      return ask(
        `What is ⟨${a}, ${b}⟩ · ⟨${c}, ${d}⟩?`,
        a * c + b * d,
        [
          a * c - b * d, // subtracted, which is the determinant
          a * d + b * c,
          a * d - b * c,
          (a + b) * (c + d),
          ...nearMisses(a * c + b * d),
        ],
        r,
      );
    },
  ],

  // ── 5.7 Eliminating the parameter ──
  "math/precalculus/unit-5/5.7": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-8, 8);
      const c = r.coefficient(5);
      const d = r.nonzero(-8, 8);
      // x = at + b and y = ct + d, so t = (x - b)/a and y = (c/a)(x - b) + d.
      const slope = frac(c, a);
      return ask(
        `If x = ${head(a, "t")}${signed(b)} and y = ${head(c, "t")}${signed(d)}, what is the slope of the resulting line?`,
        slope,
        [
          frac(a, c), // inverted
          frac(d, b),
          frac(b, d),
          frac(c + a, 2),
          frac(-c, a),
          frac(2 * c, a),
          frac(c, 2 * a),
        ],
        r,
      );
    },
  ],

  // ── 6.4 Eccentricity ──
  "math/precalculus/unit-6/6.4": [
    (r) => {
      const kinds = [
        { text: "e = 0", answer: "Circle" },
        { text: "0 < e < 1", answer: "Ellipse" },
        { text: "e = 1", answer: "Parabola" },
        { text: "e > 1", answer: "Hyperbola" },
      ];
      const kind = r.pick(kinds);
      return ask(
        `A conic section has eccentricity ${kind.text}. What kind of conic is it?`,
        kind.answer,
        kinds.map((k) => k.answer),
        r,
      );
    },
  ],

  // ── 7.2 Arithmetic and geometric series ──
  "math/precalculus/unit-7/7.2": [
    (r) => {
      const first = r.nonzero(-8, 8);
      const ratio = r.pick([-3, -2, 2, 3]);
      const n = r.int(4, 8);
      // Sum of a finite geometric series: a(1 - rⁿ)/(1 - r).
      const sum = (first * (1 - ratio ** n)) / (1 - ratio);
      return ask(
        `What is the sum of the first ${n} terms of the geometric series with first term ${first} and common ratio ${ratio}?`,
        sum,
        [
          first * ratio ** (n - 1), // gave the nth term
          first * ratio ** n,
          (first * (1 - ratio ** (n + 1))) / (1 - ratio),
          first * n,
          -sum,
        ],
        r,
      );
    },
  ],

  // ── 7.5 The Binomial Theorem ──
  "math/precalculus/unit-7/7.5": [
    (r) => {
      const n = r.int(4, 8);
      const k = r.int(1, n - 1);
      const choose = (a: number, b: number) => {
        let out = 1;
        for (let i = 0; i < b; i++) out = (out * (a - i)) / (i + 1);
        return Math.round(out);
      };
      return ask(
        `What is the coefficient of x^${k} in the expansion of (1 + x)^${n}?`,
        choose(n, k),
        [
          choose(n, k + 1),
          choose(n, k - 1),
          n * k,
          2 ** k,
          choose(n + 1, k),
        ],
        r,
      );
    },
  ],

  // ── 7.9 Limit laws and algebraic evaluation ──
  "math/precalculus/unit-7/7.9": [
    (r) => {
      const root = r.nonzero(-6, 6);
      let other = r.nonzero(-6, 6);
      while (other === root) other = r.nonzero(-6, 6);
      // (x - root)(x - other) / (x - root) cancels to (x - other) at x = root.
      const limit = root - other;
      return ask(
        `Evaluate: lim(x→${root}) of (${poly([[1, 2], [-(root + other), 1], [root * other, 0]])}) / (x${signed(-root)})`,
        limit,
        [
          "The limit does not exist", // the usual answer to a 0/0 form
          0,
          root + other,
          other - root,
          root * other,
        ],
        r,
      );
    },
  ],

  // ── 7.10 One-sided limits and continuity ──
  "math/precalculus/unit-7/7.10": [
    (r) => {
      const at = r.nonzero(-6, 6);
      const left = r.nonzero(-9, 9);
      const right = r.bool() ? left : left + r.nonzero(1, 6);
      const continuous = left === right;
      return ask(
        `A piecewise function approaches ${left} as x→${at}⁻ and ${right} as x→${at}⁺. What is lim(x→${at})?`,
        continuous ? String(left) : "The limit does not exist",
        [
          continuous ? "The limit does not exist" : String(left),
          String(right),
          String(left + right),
          frac(left + right, 2),
          "0",
        ],
        r,
      );
    },
  ],

  // ── 7.12 The difference quotient ──
  "math/precalculus/unit-7/7.12": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-8, 8);
      // For f(x) = ax² + bx, the difference quotient simplifies to
      // 2ax + ah + b.
      return ask(
        `Simplify the difference quotient [f(x+h) − f(x)]/h for f(x) = ${poly([[a, 2], [b, 1]])}.`,
        `${poly([[2 * a, 1]])}${signed(a, "h")}${signed(b)}`,
        [
          `${poly([[2 * a, 1]])}${signed(b)}`, // dropped the ah term
          `${poly([[a, 1]])}${signed(a, "h")}${signed(b)}`,
          `${poly([[2 * a, 1]])}${signed(a, "h")}`,
          `${poly([[2 * a, 1]])}${signed(2 * a, "h")}${signed(b)}`,
          `${poly([[a, 2], [b, 1]])}`,
        ],
        r,
      );
    },
  ],
};
