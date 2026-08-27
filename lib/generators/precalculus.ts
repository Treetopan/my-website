import "server-only";

import {
  among,
  ask,
  fill,
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
  // ── 1.1 Domain and range ──
  "math/precalculus/unit-1/1.1": [
    (r) => {
      const a = r.nonzero(-8, 8);
      return ask(
        `What is the domain of   f(x) = 1/(x${signed(-a)}) ?`,
        `Every x except ${a}`,
        [
          `Every x except ${-a}`,
          `x > ${a}`,
          `x ≥ ${a}`,
          "Every real number",
          `Every x except 0`,
        ],
        r,
      );
    },
  ],

  // ── 1.2 Increasing, decreasing, and extrema ──
  "math/precalculus/unit-1/1.2": [
    (r) => {
      const a = r.pick([1, 2, 3]);
      const h = r.nonzero(-6, 6);
      const k = r.nonzero(-9, 9);
      return fill(
        `f(x) = ${a === 1 ? "" : a}(x${signed(-h)})^2${signed(k)}.   What is its least value?`,
        k,
        { hint: "A square is never negative" },
      );
    },
  ],

  // ── 1.3 Even and odd functions ──
  "math/precalculus/unit-1/1.3": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.coefficient(6);
      const kind = r.int(0, 2);
      const shown = [
        poly([[a, 4], [b, 2]]),
        poly([[a, 3], [b, 1]]),
        poly([[a, 3], [b, 2]]),
      ][kind];
      const names = ["Even", "Odd", "Neither even nor odd"];
      return among(`Is   f(x) = ${shown}   even, odd, or neither?`, names[kind], [...names, "Both even and odd"], r);
    },
  ],

  // ── 1.5 Concavity ──
  "math/precalculus/unit-1/1.5": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.nonzero(-9, 9);
      return among(
        `Which way does   f(x) = ${poly([[a, 2], [b, 1]])}   bend?`,
        a > 0 ? "Concave up everywhere" : "Concave down everywhere",
        [
          "Concave up everywhere",
          "Concave down everywhere",
          "Concave up then down",
          "It does not bend",
        ],
        r,
      );
    },
  ],

  // ── 1.6 Piecewise functions ──
  "math/precalculus/unit-1/1.6": [
    (r) => {
      const cut = r.int(-3, 3);
      const a = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      const below = r.bool();
      const at = below ? cut - r.int(1, 4) : cut + r.int(1, 4);
      return fill(
        `f(x) = ${head(a, "x")}${signed(b)} for x < ${cut}, and f(x) = x^2${signed(c)} for x ≥ ${cut}.   Find f(${at}).`,
        below ? a * at + b : at * at + c,
        { hint: "Which piece is x in?" },
      );
    },
  ],

  // ── 1.7 Transformations ──
  "math/precalculus/unit-1/1.7": [
    (r) => {
      const h = r.int(2, 8);
      const k = r.int(2, 8);
      const right = r.bool();
      const up = r.bool();
      const shift = (across: boolean, along: boolean) =>
        `${across ? "right" : "left"} ${h}, ${along ? "up" : "down"} ${k}`;
      return ask(
        `How does   y = f(x ${right ? "-" : "+"} ${h}) ${up ? "+" : "-"} ${k}   sit against y = f(x)?`,
        shift(right, up),
        [shift(!right, up), shift(right, !up), shift(!right, !up), `${up ? "up" : "down"} ${h}`],
        r,
      );
    },
  ],

  // ── 1.9 Inverses and restricted domains ──
  "math/precalculus/unit-1/1.9": [
    (r) => {
      const a = r.int(2, 9);
      return ask(
        `f(x) = x^2${signed(a)} has no inverse as it stands. Which restriction gives it one?`,
        "x ≥ 0",
        [`x ≥ ${a}`, `x ≤ ${a}`, "Every real x", `x ≠ ${a}`],
        r,
      );
    },
  ],

  // ── 1.10 Building a model ──
  "math/precalculus/unit-1/1.10": [
    (r) => {
      const m = r.coefficient(6);
      const b = r.nonzero(-9, 9);
      const x1 = r.int(-5, 0);
      const x2 = x1 + r.int(1, 6);
      return fill(
        `A linear model passes through (${x1}, ${m * x1 + b}) and (${x2}, ${m * x2 + b}). What is its slope?`,
        m,
        { hint: "Rise over run" },
      );
    },
  ],

  // ── 2.1 Degree, end behaviour, and zeros ──
  "math/precalculus/unit-2/2.1": [
    (r) => {
      const degree = r.int(3, 7);
      return fill(
        `At most how many real zeros can a degree ${degree} polynomial have?`,
        degree,
        { hint: "No more than the degree" },
      );
    },
  ],

  // ── 2.2 Multiplicity ──
  "math/precalculus/unit-2/2.2": [
    (r) => {
      const root = r.nonzero(-7, 7);
      const even = r.bool();
      return among(
        `What does the graph of   y = (x${signed(-root)})^${even ? 2 : 3}(x${signed(root)})   do at x = ${root}?`,
        even ? "Touches the axis and turns back" : "Crosses, flattening as it goes",
        [
          "Touches the axis and turns back",
          "Crosses, flattening as it goes",
          "Crosses straight through",
          "Jumps over the axis",
        ],
        r,
      );
    },
  ],

  // ── 2.3 Complex zeros ──
  "math/precalculus/unit-2/2.3": [
    (r) => {
      const real = r.nonzero(-6, 6);
      const imaginary = r.int(2, 7);
      return ask(
        `A polynomial with real coefficients has a zero at ${real} + ${imaginary}i. What other zero must it have?`,
        `${real} - ${imaginary}i`,
        [
          `${-real} + ${imaginary}i`,
          `${-real} - ${imaginary}i`,
          `${real} + ${imaginary}`,
          `${imaginary} + ${real}i`,
        ],
        r,
      );
    },
  ],

  // ── 2.4 The Remainder Theorem ──
  "math/precalculus/unit-2/2.4": [
    (r) => {
      const a = r.coefficient(4);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      const at = r.nonzero(-4, 4);
      return fill(
        `What is the remainder when   ${poly([[a, 2], [b, 1], [c, 0]])}   is divided by (x${signed(-at)})?`,
        a * at * at + b * at + c,
        { hint: "Evaluate rather than divide" },
      );
    },
  ],

  // ── 2.5 Odd and even degree ──
  "math/precalculus/unit-2/2.5": [
    (r) => {
      const degree = r.pick([3, 4, 5, 6]);
      const even = degree % 2 === 0;
      return among(
        `Must a degree ${degree} polynomial with real coefficients have at least one real zero?`,
        even ? "No — it may have none" : "Yes — its ends go opposite ways",
        [
          "Yes — its ends go opposite ways",
          "No — it may have none",
          "Yes — every polynomial has one",
          "Only if the leading coefficient is positive",
        ],
        r,
      );
    },
  ],

  // ── 2.6 Domains and holes ──
  "math/precalculus/unit-2/2.6": [
    (r) => {
      const hole = r.nonzero(-7, 7);
      const pole = hole + r.int(1, 6);
      return ask(
        `y = ((x${signed(-hole)})(x${signed(-pole)})) / ((x${signed(-hole)})(x${signed(-pole)})^2).   Where is the hole?`,
        `x = ${hole}`,
        [
          `x = ${pole}`,
          `x = ${-hole}`,
          `x = ${-pole}`,
          "There is none",
          `x = ${hole + 1}`,
          `y = ${hole}`,
        ],
        r,
      );
    },
  ],

  // ── 2.8 Graphing rational functions ──
  "math/precalculus/unit-2/2.8": [
    (r) => {
      const zero = r.nonzero(-7, 7);
      const pole = zero + r.int(1, 6);
      return ask(
        `Where is the vertical asymptote of   y = (x${signed(-zero)}) / (x${signed(-pole)}) ?`,
        `x = ${pole}`,
        [`x = ${zero}`, `x = ${-pole}`, `y = ${pole}`, "y = 1", "There is none"],
        r,
      );
    },
  ],

  // ── 2.9 Polynomial and rational inequalities ──
  "math/precalculus/unit-2/2.9": [
    (r) => {
      const p = r.int(-7, 2);
      const q = p + r.int(2, 7);
      return ask(
        `Solve:   (x${signed(-p)})(x${signed(-q)}) ≤ 0`,
        `${p} ≤ x ≤ ${q}`,
        [
          `x ≤ ${p} or x ≥ ${q}`,
          `${p} < x < ${q}`,
          `${-q} ≤ x ≤ ${-p}`,
          `x ≥ ${q}`,
          `x ≤ ${p}`,
        ],
        r,
      );
    },
  ],

  // ── 2.10 Modelling with a polynomial ──
  "math/precalculus/unit-2/2.10": [
    (r) => {
      const side = r.int(8, 20);
      const cut = r.int(1, 3);
      return fill(
        `A ${side} by ${side} sheet has squares of side ${cut} cut from each corner and the sides folded up. What is the volume of the box?`,
        (side - 2 * cut) * (side - 2 * cut) * cut,
        { hint: "The base loses twice the cut" },
      );
    },
  ],

  // ── 2.11 Residuals ──
  "math/precalculus/unit-2/2.11": [
    (r) => {
      const a = r.int(2, 6);
      const b = r.int(1, 15);
      const x = r.int(2, 8);
      const residual = r.nonzero(-9, 9);
      return fill(
        `A model predicts y = ${head(a, "x")} + ${b}. At x = ${x} the measured value is ${a * x + b + residual}. What is the residual?`,
        residual,
        { hint: "Measured minus predicted" },
      );
    },
  ],

  // ── 3.1 Arithmetic and geometric sequences ──
  "math/precalculus/unit-3/3.1": [
    (r) => {
      const first = r.int(2, 9);
      const geometric = r.bool();
      const step = geometric ? r.pick([2, 3]) : r.int(2, 9);
      const terms = [0, 1, 2, 3].map((n) => (geometric ? first * step ** n : first + n * step));
      return fill(
        `What comes next?   ${terms.join(", ")}, …`,
        geometric ? first * step ** 4 : first + 4 * step,
        { hint: "Is it adding or multiplying?" },
      );
    },
  ],

  // ── 3.2 Exponential forms ──
  "math/precalculus/unit-3/3.2": [
    (r) => {
      const first = r.int(2, 12);
      const ratio = r.pick([2, 3, 4, 5]);
      return fill(
        `A table reads ${first}, ${first * ratio}, ${first * ratio ** 2}, ${first * ratio ** 3}. What is the growth factor?`,
        ratio,
        { hint: "Divide one term by the one before it" },
      );
    },
  ],

  // ── 3.3 The natural base ──
  "math/precalculus/unit-3/3.3": [
    (r) => {
      const rate = r.int(2, 9);
      const start = r.int(2, 20) * 100;
      return among(
        `What is the continuous growth rate in   P(t) = ${start}e^(0.0${rate}t) ?`,
        `${rate}% a year`,
        [`${rate}% a decade`, `${rate * 10}% a year`, `${start}% a year`, `0.0${rate}% a year`],
        r,
      );
    },
  ],

  // ── 3.4 Exponential transformations ──
  "math/precalculus/unit-3/3.4": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.pick([2, 3, 4]);
      const c = r.nonzero(-9, 9);
      return fill(
        `What is the horizontal asymptote of   y = ${a} · ${b}^x${signed(c)} ?`,
        c,
        { hint: "The power term dies away on one side" },
      );
    },
  ],

  // ── 3.5 Logarithms as inverses ──
  "math/precalculus/unit-3/3.5": [
    (r) => {
      const b = r.pick([2, 3, 4, 5]);
      const n = r.int(2, 4);
      return fill(
        `Solve:   ${b}^x = ${b ** n}`,
        n,
        { hint: "A logarithm undoes a power" },
      );
    },
  ],

  // ── 3.8 Exponential inequalities ──
  "math/precalculus/unit-3/3.8": [
    (r) => {
      const b = r.pick([2, 3, 4]);
      const n = r.int(2, 5);
      return ask(
        `Solve:   ${b}^x > ${b ** n}`,
        `x > ${n}`,
        [`x < ${n}`, `x > ${b ** n}`, `x > ${b}`, `x ≥ ${n}`, `x > ${n * b}`],
        r,
      );
    },
  ],

  // ── 3.9 Linearising data ──
  "math/precalculus/unit-3/3.9": [
    (r) => {
      const ratio = r.pick([2, 3, 5, 10]);
      return among(
        `Data multiplying by ${ratio} each step is plotted with a logarithmic y-axis. What does the plot look like?`,
        "A straight line",
        ["A straight line", "A parabola", "A curve bending upward", "A horizontal line"],
        r,
      );
    },
  ],

  // ── 3.10 Exponential and logistic modelling ──
  "math/precalculus/unit-3/3.10": [
    (r) => {
      const start = r.int(2, 30);
      const doublings = r.int(2, 6);
      const period = r.int(2, 6);
      return fill(
        `A quantity of ${start} doubles every ${period} years. What is it after ${period * doublings} years?`,
        start * 2 ** doublings,
        { hint: "Count the doublings" },
      );
    },
  ],

  // ── 4.1 Periodic behaviour ──
  "math/precalculus/unit-4/4.1": [
    (r) => {
      const period = r.int(3, 24);
      const cycles = r.int(2, 8);
      return fill(
        `A wheel completes a turn every ${period} seconds. How long do ${cycles} turns take?`,
        period * cycles,
        { unit: "seconds" },
      );
    },
  ],

  // ── 4.3 The unit circle ──
  "math/precalculus/unit-4/4.3": [
    (r) => {
      const cases = [
        { angle: "π/6", sin: "1/2", cos: "√3/2" },
        { angle: "π/4", sin: "√2/2", cos: "√2/2" },
        { angle: "π/3", sin: "√3/2", cos: "1/2" },
        { angle: "π/2", sin: "1", cos: "0" },
        { angle: "π", sin: "0", cos: "-1" },
      ];
      const c = r.pick(cases);
      const wantSin = r.bool();
      return ask(
        `Evaluate:   ${wantSin ? "sin" : "cos"}(${c.angle})`,
        wantSin ? c.sin : c.cos,
        ["0", "1", "-1", "1/2", "√2/2", "√3/2"],
        r,
      );
    },
  ],

  // ── 4.4 Graphs of sine and cosine ──
  "math/precalculus/unit-4/4.4": [
    (r) => {
      const amplitude = r.int(2, 9);
      const b = r.pick([2, 3, 4, 6]);
      return ask(
        `What is the period of   y = ${amplitude} cos(${b}x) ?`,
        piFrac(2, b),
        [piFrac(2 * b, 1), piFrac(1, b), piFrac(2, 1), `${amplitude}`, piFrac(4, b)],
        r,
      );
    },
  ],

  // ── 4.6 Sinusoidal models ──
  "math/precalculus/unit-4/4.6": [
    (r) => {
      const amplitude = r.int(2, 12);
      const midline = r.int(2, 30);
      return fill(
        `A tide is modelled by   h(t) = ${amplitude} sin(t) + ${midline}.   What is the highest water level?`,
        amplitude + midline,
        { hint: "Sine tops out at 1" },
      );
    },
  ],

  // ── 4.7 The tangent function ──
  "math/precalculus/unit-4/4.7": [
    (r) => {
      const k = r.int(1, 5);
      return ask(
        `What is the period of   y = tan(${k === 1 ? "" : k}x) ?`,
        piFrac(1, k),
        [piFrac(2, k), piFrac(k, 1), piFrac(1, 2 * k), `${k}`, piFrac(2, 1)],
        r,
      );
    },
  ],

  // ── 4.8 Reciprocal trigonometric functions ──
  "math/precalculus/unit-4/4.8": [
    (r) => {
      const cases = [
        { call: "sec(π/3)", value: "2" },
        { call: "csc(π/6)", value: "2" },
        { call: "cot(π/4)", value: "1" },
        { call: "sec(0)", value: "1" },
        { call: "csc(π/2)", value: "1" },
        { call: "cot(π/3)", value: "√3/3" },
      ];
      const c = r.pick(cases);
      return ask(`Evaluate:   ${c.call}`, c.value, ["0", "1", "2", "1/2", "√3", "√3/3"], r);
    },
  ],

  // ── 4.9 Inverse trigonometric functions ──
  "math/precalculus/unit-4/4.9": [
    (r) => {
      const which = r.bool();
      return among(
        `What is the range of   ${which ? "arcsin x" : "arccos x"} ?`,
        which ? "[-π/2, π/2]" : "[0, π]",
        ["[-π/2, π/2]", "[0, π]", "[0, 2π]", "[-π, π]"],
        r,
      );
    },
  ],

  // ── 4.10 Solving trigonometric equations ──
  "math/precalculus/unit-4/4.10": [
    (r) => {
      const cases = [
        { equation: "sin x = 0", answer: "0 and π" },
        { equation: "cos x = 0", answer: "π/2 and 3π/2" },
        { equation: "sin x = 1", answer: "π/2 only" },
        { equation: "cos x = -1", answer: "π only" },
        { equation: "tan x = 0", answer: "0 and π" },
      ];
      const c = r.pick(cases);
      return among(
        `Solve on [0, 2π):   ${c.equation}`,
        c.answer,
        ["0 and π", "π/2 and 3π/2", "π/2 only", "π only", "0 only"],
        r,
      );
    },
  ],

  // ── 4.12 Double and half angle identities ──
  "math/precalculus/unit-4/4.12": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ];
      const [opposite, adjacent, hypotenuse] = r.pick(triples);
      const square = hypotenuse * hypotenuse;
      return ask(
        `sin θ = ${frac(opposite, hypotenuse)} and cos θ = ${frac(adjacent, hypotenuse)}. What is cos 2θ?`,
        frac(adjacent * adjacent - opposite * opposite, square),
        [
          frac(2 * opposite * adjacent, square),
          frac(opposite * opposite - adjacent * adjacent, square),
          frac(adjacent * adjacent + opposite * opposite, square),
          frac(2 * adjacent, hypotenuse),
          frac(adjacent - opposite, hypotenuse),
        ],
        r,
      );
    },
  ],

  // ── 4.13 Verifying identities ──
  "math/precalculus/unit-4/4.13": [
    (r) => {
      const cases = [
        { left: "sin²θ + cos²θ", right: "1" },
        { left: "1 + cot²θ", right: "csc²θ" },
        { left: "sec²θ - tan²θ", right: "1" },
        { left: "cos θ / sin θ", right: "cot θ" },
        { left: "2 sin θ cos θ", right: "sin 2θ" },
      ];
      const c = r.pick(cases);
      return among(`Simplify:   ${c.left}`, c.right, ["1", "csc²θ", "cot θ", "sin 2θ", "tan θ"], r);
    },
  ],

  // ── 4.14 The Law of Sines and Cosines ──
  "math/precalculus/unit-4/4.14": [
    (r) => {
      const a = r.int(3, 14);
      const b = r.int(3, 14);
      // cos 60° = 1/2, so c² = a² + b² - ab and everything stays exact.
      const c2 = a * a + b * b - a * b;
      const c = Math.sqrt(c2);
      return fill(
        `Two sides of ${a} and ${b} meet at 60°. How long is the third side?`,
        Number.isInteger(c) ? c : Number(c.toFixed(2)),
        { hint: "cos 60° = 1/2" },
      );
    },
  ],

  // ── 4.15 Polar coordinates ──
  "math/precalculus/unit-4/4.15": [
    (r) => {
      const radius = r.int(2, 12);
      const cases = [
        { angle: "0", x: `${radius}`, y: "0" },
        { angle: "π/2", x: "0", y: `${radius}` },
        { angle: "π", x: `${-radius}`, y: "0" },
        { angle: "3π/2", x: "0", y: `${-radius}` },
      ];
      const c = r.pick(cases);
      return ask(
        `Convert the polar point (${radius}, ${c.angle}) to rectangular coordinates.`,
        `(${c.x}, ${c.y})`,
        cases.filter((one) => one.angle !== c.angle).map((one) => `(${one.x}, ${one.y})`),
        r,
      );
    },
  ],

  // ── 4.16 Graphs of polar functions ──
  "math/precalculus/unit-4/4.16": [
    (r) => {
      const a = r.int(2, 9);
      const kind = r.int(0, 2);
      const equations = [`r = ${a}`, `r = ${a} cos θ`, `r = ${a} cos(2θ)`];
      const names = ["A circle centred at the origin", "A circle through the origin", "A four-petal rose", "A straight line"];
      return among(`What shape is   ${equations[kind]} ?`, names[kind], names, r);
    },
  ],

  // ── 4.17 Rates of change in polar functions ──
  "math/precalculus/unit-4/4.17": [
    (r) => {
      const a = r.int(2, 9);
      const growing = r.bool();
      return among(
        `For   r = ${a}${growing ? " + θ" : " - θ"},   what happens to the distance from the origin as θ grows?`,
        growing ? "It increases" : "It decreases",
        ["It increases", "It decreases", "It stays the same", "It oscillates"],
        r,
      );
    },
  ],

  // ── 5.1 Vectors in two dimensions ──
  "math/precalculus/unit-5/5.1": [
    (r) => {
      const a = [r.nonzero(-9, 9), r.nonzero(-9, 9)];
      const b = [r.nonzero(-9, 9), r.nonzero(-9, 9)];
      return ask(
        `Add the vectors ⟨${a[0]}, ${a[1]}⟩ and ⟨${b[0]}, ${b[1]}⟩.`,
        `⟨${a[0] + b[0]}, ${a[1] + b[1]}⟩`,
        [
          `⟨${a[0] - b[0]}, ${a[1] - b[1]}⟩`,
          `⟨${a[0] * b[0]}, ${a[1] * b[1]}⟩`,
          `⟨${a[0] + b[1]}, ${a[1] + b[0]}⟩`,
          `⟨${b[0] - a[0]}, ${b[1] - a[1]}⟩`,
          `⟨${a[0] + b[0] + 1}, ${a[1] + b[1]}⟩`,
        ],
        r,
      );
    },
  ],

  // ── 5.3 Unit vectors ──
  "math/precalculus/unit-5/5.3": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ];
      const [x, y, length] = r.pick(triples);
      return ask(
        `What is the unit vector in the direction of ⟨${x}, ${y}⟩?`,
        `⟨${frac(x, length)}, ${frac(y, length)}⟩`,
        [
          `⟨${frac(y, length)}, ${frac(x, length)}⟩`,
          `⟨${frac(x, x + y)}, ${frac(y, x + y)}⟩`,
          `⟨${frac(length, x)}, ${frac(length, y)}⟩`,
          `⟨${x}, ${y}⟩`,
          `⟨${frac(-x, length)}, ${frac(-y, length)}⟩`,
        ],
        r,
      );
    },
  ],

  // ── 5.5 Vector applications ──
  "math/precalculus/unit-5/5.5": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [9, 12, 15],
        [8, 15, 17],
      ];
      const [east, north, resultant] = r.pick(triples);
      return fill(
        `A boat is pushed ${east} km east and ${north} km north. How far is it from where it started?`,
        resultant,
        { unit: "km", hint: "The two legs meet at a right angle" },
      );
    },
  ],

  // ── 5.6 Parametric equations ──
  "math/precalculus/unit-5/5.6": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const c = r.coefficient(5);
      const d = r.nonzero(-9, 9);
      const t = r.int(-4, 4);
      return ask(
        `x = ${head(a, "t")}${signed(b)} and y = ${head(c, "t")}${signed(d)}.   Where is the point at t = ${t}?`,
        `(${a * t + b}, ${c * t + d})`,
        [
          `(${c * t + d}, ${a * t + b})`,
          `(${a * t}, ${c * t})`,
          `(${a + b * t}, ${c + d * t})`,
          `(${a * t + b + 1}, ${c * t + d})`,
          `(${a * t - b}, ${c * t - d})`,
        ],
        r,
      );
    },
  ],

  // ── 5.8 Parametric motion ──
  "math/precalculus/unit-5/5.8": [
    (r) => {
      const speedX = r.int(2, 12);
      const speedY = r.int(2, 12);
      const seconds = r.int(2, 8);
      return fill(
        `A particle moves with x = ${speedX}t and y = ${speedY}t. How far along x is it after ${seconds} seconds?`,
        speedX * seconds,
      );
    },
  ],

  // ── 5.9 Matrix operations and inverses ──
  "math/precalculus/unit-5/5.9": [
    (r) => {
      const a = r.nonzero(-8, 8);
      const b = r.nonzero(-8, 8);
      const c = r.nonzero(-8, 8);
      const d = r.nonzero(-8, 8);
      return fill(
        `What is the determinant of [[${a}, ${b}], [${c}, ${d}]]?`,
        a * d - b * c,
        { hint: "ad - bc" },
      );
    },
  ],

  // ── 5.10 Matrices as transformations ──
  "math/precalculus/unit-5/5.10": [
    (r) => {
      const x = r.nonzero(-6, 6);
      const y = r.nonzero(-6, 6);
      const kind = r.int(0, 2);
      const matrices = [
        { name: `[[${1}, 0], [0, ${1}]]`, image: [x, y] },
        { name: "[[-1, 0], [0, 1]]", image: [-x, y] },
        { name: "[[0, -1], [1, 0]]", image: [-y, x] },
      ];
      const m = matrices[kind];
      return ask(
        `Apply ${m.name} to the point (${x}, ${y}).`,
        `(${m.image[0]}, ${m.image[1]})`,
        [
          `(${y}, ${x})`,
          `(${-x}, ${-y})`,
          `(${x}, ${-y})`,
          `(${y}, ${-x})`,
          `(${-y}, ${-x})`,
          `(${-x}, ${y})`,
          `(${x + 1}, ${y})`,
        ],
        r,
      );
    },
  ],

  // ── 5.11 Solving systems with matrices ──
  "math/precalculus/unit-5/5.11": [
    (r) => {
      const x = r.nonzero(-6, 6);
      const y = r.nonzero(-6, 6);
      const a = r.coefficient(5);
      const b = r.coefficient(5);
      return fill(
        `The system   ${head(a, "x")}${signed(b, "y")} = ${a * x + b * y},   y = ${y}   is written as AX = B. What is x?`,
        x,
        { hint: "One substitution is enough" },
      );
    },
  ],

  // ── 5.12 Determinants as area ──
  "math/precalculus/unit-5/5.12": [
    (r) => {
      const a = r.int(2, 8);
      const d = r.int(2, 8);
      const b = r.int(0, 4);
      return fill(
        `A transformation has matrix [[${a}, ${b}], [0, ${d}]]. By what factor does it scale area?`,
        a * d,
        { hint: "The size of the determinant" },
      );
    },
  ],

  // ── 6.1 Parabolas ──
  "math/precalculus/unit-6/6.1": [
    (r) => {
      const p = r.int(1, 6);
      return ask(
        `What is the directrix of   x^2 = ${4 * p}y ?`,
        `y = ${-p}`,
        [`y = ${p}`, `x = ${-p}`, `y = ${-4 * p}`, `y = ${-2 * p}`, "y = 0"],
        r,
      );
    },
  ],

  // ── 6.2 Ellipses ──
  "math/precalculus/unit-6/6.2": [
    (r) => {
      const a = r.int(3, 9);
      const b = r.int(2, a - 1);
      return fill(
        `How long is the major axis of   x²/${a * a} + y²/${b * b} = 1 ?`,
        2 * a,
        { hint: "Twice the larger semi-axis" },
      );
    },
  ],

  // ── 6.3 Hyperbolas ──
  "math/precalculus/unit-6/6.3": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return ask(
        `Where are the vertices of   x²/${a * a} - y²/${b * b} = 1 ?`,
        `(±${a}, 0)`,
        [
          `(0, ±${a})`,
          `(±${b}, 0)`,
          `(±${a * a}, 0)`,
          `(0, ±${b})`,
          `(±${a + b}, 0)`,
          `(±${a + 1}, 0)`,
          `(±${2 * a}, 0)`,
        ],
        r,
      );
    },
  ],

  // ── 6.5 Rotation of axes ──
  "math/precalculus/unit-6/6.5": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return fill(
        `In   ${a}x² + ${b}xy + ${a}y² = 1   the two square terms have equal coefficients. Through what angle, in degrees, should the axes be turned to remove the xy term?`,
        45,
        { unit: "degrees", hint: "cot 2θ = (A - C)/B" },
      );
    },
  ],

  // ── 6.6 Conics in polar form ──
  "math/precalculus/unit-6/6.6": [
    (r) => {
      const e = r.int(2, 6);
      const d = r.int(2, 9);
      return ask(
        `What conic is   r = ${e * d} / (1 + ${e} cos θ) ?`,
        "A hyperbola",
        ["An ellipse", "A parabola", "A circle", "A straight line"],
        r,
      );
    },
  ],

  // ── 6.7 Conics in parametric form ──
  "math/precalculus/unit-6/6.7": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const same = a === b;
      return among(
        `What curve is traced by   x = ${a} cos t,   y = ${b} sin t ?`,
        same ? "A circle" : "An ellipse",
        ["A circle", "An ellipse", "A hyperbola", "A parabola"],
        r,
      );
    },
  ],

  // ── 7.1 Explicit and recursive sequences ──
  "math/precalculus/unit-7/7.1": [
    (r) => {
      const first = r.int(1, 9);
      const d = r.coefficient(6);
      const n = r.int(5, 20);
      return fill(
        `a(n) = ${head(d, "n")}${signed(first - d)}.   What is a(${n})?`,
        d * n + first - d,
      );
    },
  ],

  // ── 7.3 Summation formulas ──
  "math/precalculus/unit-7/7.3": [
    (r) => {
      const n = r.int(5, 40);
      return fill(
        `Evaluate:   Σ from k = 1 to ${n} of k`,
        (n * (n + 1)) / 2,
        { hint: "n(n + 1)/2" },
      );
    },
  ],

  // ── 7.4 Infinite series ──
  "math/precalculus/unit-7/7.4": [
    (r) => {
      const first = r.int(2, 12);
      const denominator = r.pick([2, 3, 4, 5]);
      return ask(
        `Does   ${first} + ${first}/${denominator} + ${first}/${denominator * denominator} + …   converge, and to what?`,
        `Yes, to ${frac(first * denominator, denominator - 1)}`,
        [
          `Yes, to ${first * denominator}`,
          `Yes, to ${frac(first, denominator - 1)}`,
          "No, it diverges",
          `Yes, to ${first}`,
          `Yes, to ${frac(first * denominator, denominator + 1)}`,
          `Yes, to ${first + denominator}`,
          "No, it grows without bound",
        ],
        r,
      );
    },
  ],

  // ── 7.6 Mathematical induction ──
  "math/precalculus/unit-7/7.6": [
    (r) => {
      const n = r.int(1, 6);
      return ask(
        `An induction proof has verified the base case n = ${n}. What comes next?`,
        "Assume the statement for k, and prove it for k + 1",
        [
          `Verify n = ${n + 1} as well`,
          `Verify every n up to ${n + 20}`,
          "Assume it for all n and check the base case again",
          "Find a counterexample",
        ],
        r,
      );
    },
  ],

  // ── 7.7 The idea of a limit ──
  "math/precalculus/unit-7/7.7": [
    (r) => {
      const a = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      const at = r.nonzero(-5, 5);
      return fill(
        `Evaluate:   lim as x → ${at} of (${head(a, "x")}${signed(b)})`,
        a * at + b,
        { hint: "A polynomial is continuous, so substitute" },
      );
    },
  ],

  // ── 7.8 Limits from a table ──
  "math/precalculus/unit-7/7.8": [
    (r) => {
      const at = r.nonzero(-5, 5);
      const value = r.nonzero(-9, 9);
      return fill(
        `A table shows f(x) at x = ${at - 1}, ${(at - 0.1).toFixed(1)}, ${(at + 0.1).toFixed(1)} and ${at + 1} taking values closer and closer to ${value} from both sides. What is the limit as x → ${at}?`,
        value,
        { hint: "Both sides agree" },
      );
    },
  ],

  // ── 7.11 Limits at infinity ──
  "math/precalculus/unit-7/7.11": [
    (r) => {
      const a = r.coefficient(9);
      const b = r.coefficient(9);
      const c = r.nonzero(-9, 9);
      const d = r.nonzero(-9, 9);
      return ask(
        `Evaluate:   lim as x → ∞ of (${poly([[a, 2], [c, 0]])}) / (${poly([[b, 2], [d, 0]])})`,
        frac(a, b),
        [
          frac(b, a),
          frac(c, d),
          "0",
          `${a}`,
          frac(a + c, b + d),
          frac(a, b + 1),
          frac(a * a, b),
        ],
        r,
      );
    },
  ],
};
