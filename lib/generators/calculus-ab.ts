import "server-only";

import {
  among,
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
  // ── 1.1 Change at an instant ──
  "math/ap-calculus-ab/unit-1/1.1": [
    (r) => {
      const distance = r.int(20, 200);
      const time = r.int(2, 10);
      return among(
        `A car covers ${distance} m in ${time} s. What does ${frac(distance, time)} m/s describe?`,
        "Its average speed over the interval",
        [
          "Its average speed over the interval",
          "Its speed at the last instant",
          "Its speed at the first instant",
          "Its acceleration over the interval",
        ],
        r,
      );
    },
  ],

  // ── 1.2 Limit notation ──
  "math/ap-calculus-ab/unit-1/1.2": [
    (r) => {
      const at = r.nonzero(-6, 6);
      const value = r.nonzero(-9, 9);
      return among(
        `What does   lim as x → ${at} of f(x) = ${value}   say?`,
        `f(x) can be made as close to ${value} as you like by taking x close enough to ${at}`,
        [
          `f(${at}) is ${value}`,
          `f(x) never reaches ${value}`,
          `f(x) equals ${value} for every x near ${at}`,
          `f(x) can be made as close to ${value} as you like by taking x close enough to ${at}`,
        ],
        r,
      );
    },
  ],

  // ── 1.3 Limits from a graph ──
  "math/ap-calculus-ab/unit-1/1.3": [
    (r) => {
      const at = r.nonzero(-5, 5);
      const limit = r.nonzero(-9, 9);
      const hole = limit + r.nonzero(1, 5);
      return fill(
        `A graph approaches ${limit} from both sides of x = ${at}, but the point drawn there is (${at}, ${hole}). What is the limit as x → ${at}?`,
        limit,
        { hint: "The limit does not look at the point itself" },
      );
    },
  ],

  // ── 1.4 Limits from a table ──
  "math/ap-calculus-ab/unit-1/1.4": [
    (r) => {
      const at = r.int(1, 6);
      const value = r.nonzero(-9, 9);
      return fill(
        `f(x) reads ${value - 0.1}, ${value - 0.01}, then ${value + 0.01}, ${value + 0.1} as x closes in on ${at} from below and above. What is the limit?`,
        value,
        { hint: "Both sides are heading for the same place" },
      );
    },
  ],

  // ── 1.5 Algebraic properties of limits ──
  "math/ap-calculus-ab/unit-1/1.5": [
    (r) => {
      const f = r.nonzero(-9, 9);
      const g = r.nonzero(-9, 9);
      const at = r.nonzero(-5, 5);
      const product = r.bool();
      return fill(
        `lim f(x) = ${f} and lim g(x) = ${g} as x → ${at}.   What is lim ${product ? "f(x)·g(x)" : "(f(x) + g(x))"}?`,
        product ? f * g : f + g,
        { hint: "Limits pass straight through sums and products" },
      );
    },
  ],

  // ── 1.7 Choosing a procedure ──
  "math/ap-calculus-ab/unit-1/1.7": [
    (r) => {
      const root = r.nonzero(-6, 6);
      return among(
        `lim as x → ${root} of (x^2 - ${root * root})/(x${signed(-root)}) gives the indeterminate form zero over zero. What should you do?`,
        "Factor and cancel, then substitute",
        [
          "Factor and cancel, then substitute",
          "Say the limit does not exist",
          "Say the limit is zero",
          "Differentiate the whole quotient",
        ],
        r,
      );
    },
  ],

  // ── 1.8 The Squeeze Theorem ──
  "math/ap-calculus-ab/unit-1/1.8": [
    (r) => {
      const at = r.nonzero(-5, 5);
      const value = r.nonzero(-9, 9);
      return fill(
        `g(x) ≤ f(x) ≤ h(x) near x = ${at}, and both g and h tend to ${value} there. What is the limit of f?`,
        value,
        { hint: "It has nowhere else to go" },
      );
    },
  ],

  // ── 1.9 Representations of a limit ──
  "math/ap-calculus-ab/unit-1/1.9": [
    (r) => {
      const at = r.nonzero(-5, 5);
      const left = r.nonzero(-9, 9);
      const right = left + r.int(1, 6);
      return among(
        `As x → ${at}, f approaches ${left} from the left and ${right} from the right. What is the limit?`,
        "It does not exist",
        [
          "It does not exist",
          `It is ${left}`,
          `It is ${right}`,
          `It is ${frac(left + right, 2)}`,
        ],
        r,
      );
    },
  ],

  // ── 1.10 Types of discontinuity ──
  "math/ap-calculus-ab/unit-1/1.10": [
    (r) => {
      const at = r.nonzero(-6, 6);
      const kind = r.int(0, 2);
      const shown = [
        `f(x) = (x^2 - ${at * at})/(x${signed(-at)})`,
        `f(x) = 1/(x${signed(-at)})`,
        `f(x) = ${at} for x < ${at} and ${at + 1} for x ≥ ${at}`,
      ][kind];
      const names = ["Removable", "Infinite", "Jump", "None — it is continuous"];
      return among(
        `What kind of discontinuity does this have at x = ${at}?   ${shown}`,
        names[kind],
        names,
        r,
      );
    },
  ],

  // ── 1.11 Continuity at a point ──
  "math/ap-calculus-ab/unit-1/1.11": [
    (r) => {
      const at = r.int(1, 6);
      const a = r.coefficient(5);
      const b = r.nonzero(-9, 9);
      // f(x) = ax + b for x < at, and k for x ≥ at. Continuity fixes k.
      return fill(
        `f(x) = ${head(a, "x")}${signed(b)} for x < ${at}, and f(x) = k for x ≥ ${at}. What k makes f continuous?`,
        a * at + b,
        { hint: "The two pieces have to meet" },
      );
    },
  ],

  // ── 1.12 Continuity over an interval ──
  "math/ap-calculus-ab/unit-1/1.12": [
    (r) => {
      const pole = r.nonzero(-6, 6);
      return among(
        `On which interval is   f(x) = 1/(x${signed(-pole)})   continuous?`,
        `Every interval that leaves out ${pole}`,
        [
          `Every interval that leaves out ${pole}`,
          "Every interval",
          `Only intervals containing ${pole}`,
          "No interval at all",
        ],
        r,
      );
    },
  ],

  // ── 1.13 Removing a discontinuity ──
  "math/ap-calculus-ab/unit-1/1.13": [
    (r) => {
      const hole = r.nonzero(-6, 6);
      const other = hole + r.int(1, 6);
      return fill(
        `f(x) = ((x${signed(-hole)})(x${signed(-other)}))/(x${signed(-hole)}) has a hole at x = ${hole}. What value there would remove it?`,
        hole - other,
        { hint: "Cancel first, then substitute" },
      );
    },
  ],

  // ── 1.14 Infinite limits ──
  "math/ap-calculus-ab/unit-1/1.14": [
    (r) => {
      const pole = r.nonzero(-6, 6);
      return ask(
        `Where does   f(x) = 1/(x${signed(-pole)})^2   have a vertical asymptote?`,
        `x = ${pole}`,
        [`x = ${-pole}`, "y = 0", `y = ${pole}`, "There is none", `x = ${pole * 2}`],
        r,
      );
    },
  ],

  // ── 1.16 The Intermediate Value Theorem ──
  "math/ap-calculus-ab/unit-1/1.16": [
    (r) => {
      const a = r.int(0, 4);
      const b = a + r.int(1, 5);
      const low = -r.int(1, 20);
      const high = r.int(1, 20);
      return among(
        `f is continuous, f(${a}) = ${low} and f(${b}) = ${high}. What follows?`,
        `f has a zero somewhere between ${a} and ${b}`,
        [
          `f has a zero somewhere between ${a} and ${b}`,
          `f is increasing on [${a}, ${b}]`,
          `f has a maximum at ${b}`,
          "Nothing follows without a formula",
        ],
        r,
      );
    },
  ],

  // ── 2.1 Average and instantaneous rate ──
  "math/ap-calculus-ab/unit-2/2.1": [
    (r) => {
      const a = r.int(1, 5);
      const x1 = r.int(0, 3);
      const x2 = x1 + r.int(1, 4);
      // For f = ax², the average rate over [x1, x2] is a(x1 + x2).
      return fill(
        `f(x) = ${a === 1 ? "" : a}x^2.   What is the average rate of change from x = ${x1} to x = ${x2}?`,
        a * (x1 + x2),
        { hint: "Rise over run" },
      );
    },
  ],

  // ── 2.2 The definition of the derivative ──
  "math/ap-calculus-ab/unit-2/2.2": [
    (r) => {
      const at = r.nonzero(-5, 5);
      return among(
        `Which limit is f'(${at})?`,
        `lim as h → 0 of (f(${at} + h) - f(${at}))/h`,
        [
          `lim as h → 0 of (f(${at} + h) - f(${at}))/h`,
          `lim as h → 0 of (f(${at} + h) - f(${at}))`,
          `lim as x → ${at} of (f(x) - f(${at}))`,
          `lim as h → 0 of (f(${at}) - f(${at} - h))/${at}`,
        ],
        r,
      );
    },
  ],

  // ── 2.3 Estimating a derivative ──
  "math/ap-calculus-ab/unit-2/2.3": [
    (r) => {
      const at = r.int(1, 8);
      const step = r.pick([1, 2]);
      const slope = r.coefficient(9);
      const value = r.int(-20, 20);
      return fill(
        `A table gives f(${at - step}) = ${value - slope * step} and f(${at + step}) = ${value + slope * step}. Estimate f'(${at}).`,
        slope,
        { hint: "Use the symmetric difference" },
      );
    },
  ],

  // ── 2.4 Differentiability and continuity ──
  "math/ap-calculus-ab/unit-2/2.4": [
    (r) => {
      const at = r.nonzero(-6, 6);
      return among(
        `f(x) = |x${signed(-at)}| is continuous at x = ${at}. Is it differentiable there?`,
        "No — the graph has a corner",
        [
          "No — the graph has a corner",
          "Yes — continuity is enough",
          "No — it is not continuous either",
          "Only from the right",
        ],
        r,
      );
    },
  ],

  // ── 2.6 The sum and constant multiple rules ──
  "math/ap-calculus-ab/unit-2/2.6": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.coefficient(6);
      const c = r.nonzero(-9, 9);
      return ask(
        `Differentiate:   ${poly([[a, 3], [b, 2], [c, 0]])}`,
        poly([[3 * a, 2], [2 * b, 1]]),
        [
          poly([[3 * a, 2], [2 * b, 1], [c, 0]]),
          poly([[a, 2], [b, 1]]),
          poly([[3 * a, 3], [2 * b, 2]]),
          poly([[a * 3, 2], [b, 1]]),
          poly([[3 * a, 2], [2 * b, 1], [1, 0]]),
        ],
        r,
      );
    },
  ],

  // ── 2.7 Derivatives of the standard functions ──
  "math/ap-calculus-ab/unit-2/2.7": [
    (r) => {
      const cases = [
        { f: "sin x", d: "cos x" },
        { f: "cos x", d: "-sin x" },
        { f: "e^x", d: "e^x" },
        { f: "ln x", d: "1/x" },
      ];
      const c = r.pick(cases);
      return ask(
        `Differentiate:   ${c.f}`,
        c.d,
        cases.filter((one) => one.d !== c.d).map((one) => one.d).concat(["-cos x", "x·e^x"]),
        r,
      );
    },
  ],

  // ── 2.10 Derivatives of the other trigonometric functions ──
  "math/ap-calculus-ab/unit-2/2.10": [
    (r) => {
      const cases = [
        { f: "tan x", d: "sec²x" },
        { f: "cot x", d: "-csc²x" },
        { f: "sec x", d: "sec x tan x" },
        { f: "csc x", d: "-csc x cot x" },
      ];
      const c = r.pick(cases);
      return ask(
        `Differentiate:   ${c.f}`,
        c.d,
        cases.filter((one) => one.d !== c.d).map((one) => one.d).concat(["tan²x"]),
        r,
      );
    },
  ],

  // ── 3.2 Implicit differentiation ──
  "math/ap-calculus-ab/unit-3/3.2": [
    (r) => {
      const radius = r.int(2, 12);
      return ask(
        `x² + y² = ${radius * radius}.   What is dy/dx?`,
        "-x/y",
        ["x/y", "-y/x", "y/x", "-2x/y", `${radius}/y`],
        r,
      );
    },
  ],

  // ── 3.3 Derivatives of inverse functions ──
  "math/ap-calculus-ab/unit-3/3.3": [
    (r) => {
      const slope = r.int(2, 9);
      const at = r.nonzero(-6, 6);
      const image = r.nonzero(-6, 6);
      return ask(
        `f(${at}) = ${image} and f'(${at}) = ${slope}. What is (f⁻¹)'(${image})?`,
        frac(1, slope),
        [
          `${slope}`,
          frac(1, at),
          `${-slope}`,
          frac(-1, slope),
          frac(1, image),
          frac(1, slope + 1),
          frac(slope, image),
        ],
        r,
      );
    },
  ],

  // ── 3.4 Inverse trigonometric derivatives ──
  "math/ap-calculus-ab/unit-3/3.4": [
    (r) => {
      const cases = [
        { f: "arcsin x", d: "1/√(1 - x²)" },
        { f: "arccos x", d: "-1/√(1 - x²)" },
        { f: "arctan x", d: "1/(1 + x²)" },
      ];
      const c = r.pick(cases);
      return ask(
        `Differentiate:   ${c.f}`,
        c.d,
        cases.filter((one) => one.d !== c.d).map((one) => one.d).concat(["-1/(1 + x²)", "1/(1 - x²)"]),
        r,
      );
    },
  ],

  // ── 3.5 Selecting a rule ──
  "math/ap-calculus-ab/unit-3/3.5": [
    (r) => {
      const n = r.int(2, 6);
      const kind = r.int(0, 2);
      const shown = [`(x^2 + ${n})^${n}`, `x^${n} sin x`, `x^${n}/(x + ${n})`][kind];
      const names = ["The Chain Rule", "The Product Rule", "The Quotient Rule", "The Power Rule alone"];
      return among(`Which rule does   ${shown}   need first?`, names[kind], names, r);
    },
  ],

  // ── 4.1 The derivative in context ──
  "math/ap-calculus-ab/unit-4/4.1": [
    (r) => {
      const rate = r.int(2, 40);
      return among(
        `V(t) is the volume of a tank in litres, t in minutes, and V'(${r.int(1, 9)}) = ${rate}. What does that mean?`,
        `The tank is filling at ${rate} litres a minute`,
        [
          `The tank is filling at ${rate} litres a minute`,
          `The tank holds ${rate} litres`,
          `The tank fills in ${rate} minutes`,
          `The tank is emptying at ${rate} litres a minute`,
        ],
        r,
      );
    },
  ],

  // ── 4.3 Rates in applied contexts ──
  "math/ap-calculus-ab/unit-4/4.3": [
    (r) => {
      const a = r.int(2, 9);
      const t = r.int(1, 6);
      return fill(
        `A tank holds V(t) = ${a}t² litres after t minutes. How fast is it filling at t = ${t}?`,
        2 * a * t,
        { unit: "litres per minute", hint: "Differentiate, then substitute" },
      );
    },
  ],

  // ── 4.4 Related rates ──
  "math/ap-calculus-ab/unit-4/4.4": [
    (r) => {
      const side = r.int(2, 12);
      const rate = r.int(1, 6);
      return fill(
        `A square's side grows at ${rate} cm/s. How fast is its area growing when the side is ${side} cm?`,
        2 * side * rate,
        { unit: "cm² per second", hint: "dA/dt = 2s · ds/dt" },
      );
    },
  ],

  // ── 4.6 Linearisation ──
  "math/ap-calculus-ab/unit-4/4.6": [
    (r) => {
      const at = r.int(1, 6);
      const value = r.int(-9, 9);
      const slope = r.coefficient(6);
      const step = r.pick([1, 2]);
      return fill(
        `f(${at}) = ${value} and f'(${at}) = ${slope}. Use the tangent line to estimate f(${at + step}).`,
        value + slope * step,
        { hint: "Value plus slope times step" },
      );
    },
  ],

  // ── 5.1 The Mean Value Theorem ──
  "math/ap-calculus-ab/unit-5/5.1": [
    (r) => {
      const a = r.int(0, 4);
      const b = a + 2 * r.int(1, 4);
      // For x², the MVT point is the midpoint of the interval.
      return fill(
        `f(x) = x^2 on [${a}, ${b}]. At what c does f'(c) equal the average rate of change?`,
        (a + b) / 2,
        { hint: "Set 2c equal to the average rate" },
      );
    },
  ],

  // ── 5.4 The First Derivative Test ──
  "math/ap-calculus-ab/unit-5/5.4": [
    (r) => {
      const critical = r.nonzero(-6, 6);
      const minimum = r.bool();
      return among(
        `f' is ${minimum ? "negative before" : "positive before"} x = ${critical} and ${minimum ? "positive after" : "negative after"}. What is at x = ${critical}?`,
        minimum ? "A relative minimum" : "A relative maximum",
        [
          "A relative minimum",
          "A relative maximum",
          "A point of inflection",
          "Nothing in particular",
        ],
        r,
      );
    },
  ],

  // ── 5.5 The Candidates Test ──
  "math/ap-calculus-ab/unit-5/5.5": [
    (r) => {
      const a = r.int(1, 4);
      const b = r.int(2, 6);
      // f = ax² on [0, b] climbs, so the absolute maximum is at the right end.
      return fill(
        `f(x) = ${a === 1 ? "" : a}x^2 on [0, ${b}].   What is its greatest value?`,
        a * b * b,
        { hint: "Check the critical point and both ends" },
      );
    },
  ],

  // ── 5.6 Concavity ──
  "math/ap-calculus-ab/unit-5/5.6": [
    (r) => {
      const a = r.coefficient(4);
      const b = 3 * r.nonzero(-4, 4);
      const c = r.nonzero(-9, 9);
      // f = ax³ + bx² + cx has f'' = 6ax + 2b, zero at -b/(3a).
      return ask(
        `Where does   ${poly([[a, 3], [b, 2], [c, 1]])}   change concavity?`,
        `x = ${frac(-b, 3 * a)}`,
        [`x = ${frac(b, 3 * a)}`, `x = ${frac(-b, a)}`, "x = 0", `x = ${frac(-c, b)}`, `x = ${frac(-b, 6 * a)}`],
        r,
      );
    },
  ],

  // ── 5.8 Sketching a function and its derivative ──
  "math/ap-calculus-ab/unit-5/5.8": [
    (r) => {
      const at = r.nonzero(-6, 6);
      return among(
        `The graph of f has a horizontal tangent at x = ${at}. What does the graph of f' do there?`,
        "It crosses or touches the x-axis",
        [
          "It crosses or touches the x-axis",
          "It has a vertical asymptote",
          "It has a maximum",
          "It is undefined",
        ],
        r,
      );
    },
  ],

  // ── 5.9 Connecting f, f' and f'' ──
  "math/ap-calculus-ab/unit-5/5.9": [
    (r) => {
      const at = r.nonzero(-6, 6);
      const positive = r.bool();
      return among(
        `f'(${at}) = 0 and f''(${at}) is ${positive ? "positive" : "negative"}. What is at x = ${at}?`,
        positive ? "A relative minimum" : "A relative maximum",
        [
          "A relative minimum",
          "A relative maximum",
          "A point of inflection",
          "The test says nothing",
        ],
        r,
      );
    },
  ],

  // ── 5.10 Setting up an optimisation ──
  "math/ap-calculus-ab/unit-5/5.10": [
    (r) => {
      const perimeter = r.int(2, 30) * 4;
      return fill(
        `A rectangle has perimeter ${perimeter}. What is its greatest possible area?`,
        (perimeter / 4) ** 2,
        { hint: "A square beats every other rectangle" },
      );
    },
  ],

  // ── 5.11 Solving an optimisation ──
  "math/ap-calculus-ab/unit-5/5.11": [
    (r) => {
      const total = r.int(2, 40) * 2;
      return fill(
        `Two numbers add to ${total}. What is their greatest possible product?`,
        (total / 2) ** 2,
        { hint: "Write the product in one variable and differentiate" },
      );
    },
  ],

  // ── 5.12 Behaviour of implicit relations ──
  "math/ap-calculus-ab/unit-5/5.12": [
    (r) => {
      const radius = r.int(2, 12);
      return ask(
        `On x² + y² = ${radius * radius}, where is the tangent horizontal?`,
        `At (0, ±${radius})`,
        [`At (±${radius}, 0)`, "At the origin", `At (${radius}, ${radius})`, `At (0, ${radius * radius})`],
        r,
      );
    },
  ],

  // ── 6.1 Accumulation of change ──
  "math/ap-calculus-ab/unit-6/6.1": [
    (r) => {
      const rate = r.int(2, 20);
      const hours = r.int(2, 9);
      const start = r.int(0, 50);
      return fill(
        `A tank holds ${start} litres and fills at a steady ${rate} litres an hour. How much is in it after ${hours} hours?`,
        start + rate * hours,
        { unit: "litres", hint: "Start plus what accumulated" },
      );
    },
  ],

  // ── 6.2 Riemann sums ──
  "math/ap-calculus-ab/unit-6/6.2": [
    (r) => {
      const a = r.int(1, 5);
      const n = r.int(2, 4);
      // Left sum for f = ax on [0, n] with unit widths: a(0 + 1 + … + n-1).
      const sum = (a * (n - 1) * n) / 2;
      return fill(
        `Estimate the area under   y = ${a === 1 ? "" : a}x   from 0 to ${n} with ${n} left-hand rectangles of width 1.`,
        sum,
        { hint: "Height at the left edge of each strip" },
      );
    },
  ],

  // ── 6.3 Riemann sums and notation ──
  "math/ap-calculus-ab/unit-6/6.3": [
    (r) => {
      const a = r.int(1, 4);
      const b = a + r.int(1, 6);
      return among(
        `What does   ∫ from ${a} to ${b} of f(x) dx   stand for?`,
        "The limit of Riemann sums as the strips get thinner",
        [
          "The limit of Riemann sums as the strips get thinner",
          "The antiderivative of f",
          "The slope of f between the two ends",
          "The average of f at the two ends",
        ],
        r,
      );
    },
  ],

  // ── 6.4 Accumulation functions ──
  "math/ap-calculus-ab/unit-6/6.4": [
    (r) => {
      const a = r.coefficient(6);
      const at = r.nonzero(-5, 5);
      return fill(
        `F(x) = ∫ from 0 to x of (${head(a, "t")}) dt.   What is F'(${at})?`,
        a * at,
        { hint: "The Fundamental Theorem hands it straight back" },
      );
    },
  ],

  // ── 6.5 Reading an accumulation function ──
  "math/ap-calculus-ab/unit-6/6.5": [
    (r) => {
      const at = r.int(1, 8);
      const positive = r.bool();
      return among(
        `F(x) = ∫ from 0 to x of f(t) dt, and f is ${positive ? "positive" : "negative"} on [0, ${at}]. What is F doing there?`,
        positive ? "Increasing" : "Decreasing",
        ["Increasing", "Decreasing", "Constant", "Changing direction"],
        r,
      );
    },
  ],

  // ── 6.6 Properties of definite integrals ──
  "math/ap-calculus-ab/unit-6/6.6": [
    (r) => {
      const first = r.nonzero(-20, 20);
      const second = r.nonzero(-20, 20);
      const a = r.int(0, 3);
      const b = a + r.int(1, 4);
      const c = b + r.int(1, 4);
      return fill(
        `∫ from ${a} to ${b} of f = ${first} and ∫ from ${b} to ${c} of f = ${second}.   What is ∫ from ${a} to ${c} of f?`,
        first + second,
        { hint: "Integrals join end to end" },
      );
    },
  ],

  // ── 6.10 Long division before integrating ──
  "math/ap-calculus-ab/unit-6/6.10": [
    (r) => {
      const a = r.int(2, 9);
      return ask(
        `Rewrite   (x${signed(a)})/x   before integrating.`,
        `1 + ${a}/x`,
        [`x + ${a}`, `${a}/x`, `1 - ${a}/x`, `x/${a} + 1`, `${a}x`],
        r,
      );
    },
  ],

  // ── 6.14 Choosing a technique ──
  "math/ap-calculus-ab/unit-6/6.14": [
    (r) => {
      const n = r.int(2, 6);
      const kind = r.int(0, 2);
      const shown = [`∫ 2x(x² + ${n})^${n} dx`, `∫ x^${n} dx`, `∫ (x${signed(n)})/x dx`][kind];
      const names = ["Substitution", "The Power Rule", "Long division first", "Integration by parts"];
      return among(`Which technique fits   ${shown} ?`, names[kind], names, r);
    },
  ],

  // ── 7.1 Modelling with a differential equation ──
  "math/ap-calculus-ab/unit-7/7.1": [
    (r) => {
      const k = r.int(2, 9);
      return ask(
        `"A population grows at a rate proportional to its size." Which equation says that?`,
        `dP/dt = ${k}P`,
        [`dP/dt = ${k}`, `dP/dt = ${k}t`, `dP/dt = P/${k}t`, `P = ${k}t`],
        r,
      );
    },
  ],

  // ── 7.2 Verifying a solution ──
  "math/ap-calculus-ab/unit-7/7.2": [
    (r) => {
      const k = r.int(2, 9);
      return among(
        `Is   y = e^(${k}t)   a solution of   dy/dt = ${k}y ?`,
        "Yes — differentiating gives exactly that",
        [
          "Yes — differentiating gives exactly that",
          "No — the derivative is off by a factor of t",
          "No — the derivative is zero",
          "Only when t = 0",
        ],
        r,
      );
    },
  ],

  // ── 7.3 Slope fields ──
  "math/ap-calculus-ab/unit-7/7.3": [
    (r) => {
      const at = r.nonzero(-5, 5);
      return among(
        `For   dy/dx = x,   what do the slope marks along the line x = ${at} look like?`,
        `All of slope ${at}`,
        [
          `All of slope ${at}`,
          "All horizontal",
          "All vertical",
          `All of slope ${-at}`,
        ],
        r,
      );
    },
  ],

  // ── 7.4 Reading a slope field ──
  "math/ap-calculus-ab/unit-7/7.4": [
    (r) => {
      const value = r.nonzero(-6, 6);
      return among(
        `A slope field for   dy/dx = y   is horizontal along one line. Which?`,
        "y = 0",
        [`y = ${value}`, `x = ${value}`, "y = 0", "x = 0"],
        r,
      );
    },
  ],

  // ── 7.6 Separation of variables ──
  "math/ap-calculus-ab/unit-7/7.6": [
    (r) => {
      const k = r.int(2, 9);
      return ask(
        `Solve:   dy/dx = ${k}y`,
        `y = Ce^(${k}x)`,
        [`y = ${k}e^x`, `y = Ce^(x/${k})`, `y = ${k}x + C`, `y = Cx^${k}`],
        r,
      );
    },
  ],

  // ── 7.7 Particular solutions ──
  "math/ap-calculus-ab/unit-7/7.7": [
    (r) => {
      const a = r.int(2, 9);
      const start = r.nonzero(-9, 9);
      const at = r.int(1, 5);
      // dy/dx = a, so y = ax + start.
      return fill(
        `dy/dx = ${a} and y = ${start} when x = 0.   What is y when x = ${at}?`,
        a * at + start,
        { hint: "Integrate, then use the initial condition" },
      );
    },
  ],

  // ── 7.8 Exponential models ──
  "math/ap-calculus-ab/unit-7/7.8": [
    (r) => {
      const start = r.int(2, 40);
      const k = r.int(2, 4);
      return ask(
        `dP/dt = ${k}P and P(0) = ${start}.   What is P(t)?`,
        `${start}e^(${k}t)`,
        [`${start}e^(t/${k})`, `${start}e^(-${k}t)`, `${start} + ${k}t`, `${start}t^${k}`],
        r,
      );
    },
  ],

  // ── 8.2 Position, velocity and acceleration ──
  "math/ap-calculus-ab/unit-8/8.2": [
    (r) => {
      const a = r.int(1, 6);
      const t = r.int(1, 5);
      const start = r.nonzero(-9, 9);
      // v = 2at, so the displacement to time t is at².
      return fill(
        `A particle starts at position ${start} with velocity v(t) = ${2 * a}t. Where is it at t = ${t}?`,
        start + a * t * t,
        { hint: "Integrate the velocity and add where it started" },
      );
    },
  ],

  // ── 8.3 Accumulation in context ──
  "math/ap-calculus-ab/unit-8/8.3": [
    (r) => {
      const rate = r.int(2, 12);
      const hours = r.int(2, 6);
      return fill(
        `Water flows in at r(t) = ${2 * rate}t litres an hour. How much arrives in the first ${hours} hours?`,
        rate * hours * hours,
        { unit: "litres", hint: "Integrate the rate" },
      );
    },
  ],

  // ── 8.5 Area between curves in y ──
  "math/ap-calculus-ab/unit-8/8.5": [
    (r) => {
      const width = r.int(2, 9);
      const height = r.int(2, 9);
      return fill(
        `The region between x = ${width} and x = 0, from y = 0 to y = ${height}, is integrated with respect to y. What is its area?`,
        width * height,
        { hint: "Right curve minus left, integrated in y" },
      );
    },
  ],

  // ── 8.6 Curves that cross more than twice ──
  "math/ap-calculus-ab/unit-8/8.6": [
    (r) => {
      const a = r.int(2, 6);
      return among(
        `y = x³ and y = ${a * a}x meet at three points. How should the area between them be found?`,
        "As two integrals, one for each side of the middle crossing",
        [
          "As two integrals, one for each side of the middle crossing",
          "As one integral across the whole span",
          "By subtracting the areas under each curve separately",
          "It cannot be found",
        ],
        r,
      );
    },
  ],

  // ── 8.7 Volumes with square cross sections ──
  "math/ap-calculus-ab/unit-8/8.7": [
    (r) => {
      const side = r.int(2, 9);
      const length = r.int(2, 9);
      return fill(
        `A solid has square cross sections of side ${side} at every point along a base of length ${length}. What is its volume?`,
        side * side * length,
        { hint: "Add up the areas of the squares" },
      );
    },
  ],

  // ── 8.8 Other cross sections ──
  "math/ap-calculus-ab/unit-8/8.8": [
    (r) => {
      const side = r.int(2, 12);
      const triangle = r.bool();
      return ask(
        `A cross section is ${triangle ? "an equilateral triangle" : "a semicircle"} on a base of ${side}. What is its area?`,
        triangle ? `${side * side}√3/4` : `${side * side}π/8`,
        [
          triangle ? `${side * side}π/8` : `${side * side}√3/4`,
          `${side * side}`,
          `${side * side}/2`,
          `${side * side}π/4`,
          `${side * side}√3/2`,
        ],
        r,
      );
    },
  ],

  // ── 8.9 The disc method ──
  "math/ap-calculus-ab/unit-8/8.9": [
    (r) => {
      const radius = r.int(2, 9);
      const height = r.int(2, 9);
      return ask(
        `Rotating the rectangle under y = ${radius} from x = 0 to x = ${height} about the x-axis gives what volume?`,
        `${radius * radius * height}π`,
        [
          `${radius * height}π`,
          `${radius * radius * height}`,
          `${2 * radius * height}π`,
          `${radius * radius}π`,
          `${radius * height * height}π`,
          `${radius * radius * height + 1}π`,
          `${2 * radius * radius * height}π`,
        ],
        r,
      );
    },
  ],

  // ── 8.10 Discs about another axis ──
  "math/ap-calculus-ab/unit-8/8.10": [
    (r) => {
      const shift = r.int(1, 6);
      const radius = r.int(2, 9);
      return ask(
        `The region under y = ${radius + shift} from x = 0 to x = 1 is rotated about y = ${shift}. What radius does the disc have?`,
        `${radius}`,
        [
          `${radius + shift}`,
          `${shift}`,
          `${radius + 2 * shift}`,
          `${radius * shift}`,
          `${radius + 1}`,
          `${2 * radius}`,
          `${radius + shift + 1}`,
        ],
        r,
      );
    },
  ],

  // ── 8.11 The washer method ──
  "math/ap-calculus-ab/unit-8/8.11": [
    (r) => {
      const outer = r.int(4, 12);
      const inner = r.int(1, outer - 1);
      const length = r.int(2, 6);
      return ask(
        `Rotating the strip between y = ${inner} and y = ${outer}, from x = 0 to x = ${length}, about the x-axis gives what volume?`,
        `${(outer * outer - inner * inner) * length}π`,
        [
          `${(outer - inner) ** 2 * length}π`,
          `${(outer * outer + inner * inner) * length}π`,
          `${(outer - inner) * length}π`,
          `${outer * outer * length}π`,
          `${(outer * outer - inner * inner) * length}`,
        ],
        r,
      );
    },
  ],

  // ── 8.12 Washers about another axis ──
  "math/ap-calculus-ab/unit-8/8.12": [
    (r) => {
      const axis = r.int(1, 6);
      const outer = axis + r.int(3, 9);
      const inner = axis + r.int(1, 2);
      return ask(
        `A washer runs from y = ${inner} to y = ${outer}, rotated about y = ${axis}. What are its two radii?`,
        `${outer - axis} and ${inner - axis}`,
        [
          `${outer} and ${inner}`,
          `${outer + axis} and ${inner + axis}`,
          `${outer - inner} and ${axis}`,
          `${axis} and ${outer - inner}`,
        ],
        r,
      );
    },
  ],
};
