import "server-only";

import { GENERATED } from "../templates";
import { CALCULUS_AB } from "./calculus-ab";
import {
  among,
  ask,
  fill,
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
const OWN: Record<string, ((r: Rng) => Built)[]> = {
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
  // ── 6.12 Partial fractions ──
  "math/ap-calculus-bc/unit-6/6.12": [
    (r) => {
      const a = r.int(1, 6);
      const b = a + r.int(1, 6);
      return ask(
        `1/((x - ${a})(x - ${b})) is written as A/(x - ${a}) + B/(x - ${b}).   What is A?`,
        frac(1, a - b),
        [frac(1, b - a), frac(1, a), frac(1, b), frac(1, a + b), frac(a, b)],
        r,
      );
    },
  ],

  // ── 7.9 Logistic models ──
  "math/ap-calculus-bc/unit-7/7.9": [
    (r) => {
      const cap = r.int(2, 40) * 100;
      const k = r.int(2, 9);
      return fill(
        `dP/dt = 0.0${k}P(1 - P/${cap}).   What does P settle at?`,
        cap,
        { hint: "Growth stops where the bracket does" },
      );
    },
  ],

  // ── 9.2 Second derivatives of parametric equations ──
  "math/ap-calculus-bc/unit-9/9.2": [
    (r) => {
      const a = r.int(2, 9);
      return ask(
        `x and y are given in terms of t. Which expression is d²y/dx²?`,
        "(d/dt of dy/dx) ÷ (dx/dt)",
        [
          "(d²y/dt²) ÷ (d²x/dt²)",
          "(d/dt of dy/dx) × (dx/dt)",
          `(d²y/dt²) ÷ ${a}`,
          "(dy/dt) ÷ (d²x/dt²)",
        ],
        r,
      );
    },
  ],

  // ── 9.3 Arc length of a parametric curve ──
  "math/ap-calculus-bc/unit-9/9.3": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
      ];
      const [dx, dy, speed] = r.pick(triples);
      const seconds = r.int(2, 9);
      return fill(
        `x = ${dx}t and y = ${dy}t, from t = 0 to t = ${seconds}. How long is the curve?`,
        speed * seconds,
        { hint: "Constant speed, so length is speed times time" },
      );
    },
  ],

  // ── 9.4 Differentiating a vector-valued function ──
  "math/ap-calculus-bc/unit-9/9.4": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.coefficient(6);
      return ask(
        `Differentiate:   ⟨${head(a, "t^2")}, ${head(b, "t^3")}⟩`,
        `⟨${head(2 * a, "t")}, ${head(3 * b, "t^2")}⟩`,
        [
          `⟨${head(a, "t")}, ${head(b, "t^2")}⟩`,
          `⟨${head(2 * a, "t")}, ${head(3 * b, "t^3")}⟩`,
          `⟨${head(3 * a, "t")}, ${head(2 * b, "t^2")}⟩`,
          `⟨${head(2 * a, "t^2")}, ${head(3 * b, "t^3")}⟩`,
          `⟨${head(a, "t^3")}, ${head(b, "t^4")}⟩`,
        ],
        r,
      );
    },
  ],

  // ── 9.5 Integrating a vector-valued function ──
  "math/ap-calculus-bc/unit-9/9.5": [
    (r) => {
      const a = r.int(2, 6);
      const b = r.int(2, 6);
      return ask(
        `Integrate:   ⟨${2 * a}t, ${3 * b}t^2⟩ dt`,
        `⟨${head(a, "t^2")}, ${head(b, "t^3")}⟩ + C`,
        [
          `⟨${head(2 * a, "t^2")}, ${head(3 * b, "t^3")}⟩ + C`,
          `⟨${head(a, "t")}, ${head(b, "t^2")}⟩ + C`,
          `⟨${2 * a}, ${6 * b}t⟩ + C`,
          `⟨${head(a, "t^3")}, ${head(b, "t^4")}⟩ + C`,
        ],
        r,
      );
    },
  ],

  // ── 9.6 Motion with vector-valued functions ──
  "math/ap-calculus-bc/unit-9/9.6": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ];
      const [vx, vy, speed] = r.pick(triples);
      return fill(
        `A particle has velocity ⟨${vx}, ${vy}⟩. How fast is it going?`,
        speed,
        { hint: "Speed is the length of the velocity vector" },
      );
    },
  ],

  // ── 9.7 Differentiating in polar form ──
  "math/ap-calculus-bc/unit-9/9.7": [
    (r) => {
      const a = r.int(2, 9);
      const cosine = r.bool();
      return ask(
        `r = ${a} ${cosine ? "cos" : "sin"} θ.   What is dr/dθ?`,
        cosine ? `-${a} sin θ` : `${a} cos θ`,
        [
          cosine ? `${a} sin θ` : `-${a} cos θ`,
          cosine ? `${a} cos θ` : `${a} sin θ`,
          `-${a} ${cosine ? "cos" : "sin"} θ`,
          `${a}`,
        ],
        r,
      );
    },
  ],

  // ── 9.9 Area between two polar curves ──
  "math/ap-calculus-bc/unit-9/9.9": [
    (r) => {
      const inner = r.int(1, 6);
      const outer = inner + r.int(1, 6);
      return ask(
        `What is the area between the circles r = ${inner} and r = ${outer}?`,
        `${outer * outer - inner * inner}π`,
        [
          `${(outer - inner) ** 2}π`,
          `${outer * outer + inner * inner}π`,
          `${outer - inner}π`,
          piFrac(outer * outer - inner * inner, 2),
          `${outer * outer}π`,
        ],
        r,
      );
    },
  ],

  // ── 10.1 Convergence and divergence ──
  "math/ap-calculus-bc/unit-10/10.1": [
    (r) => {
      const n = r.int(3, 9);
      return among(
        `What does it mean for an infinite series to converge?`,
        "Its sequence of partial sums has a finite limit",
        [
          "Its sequence of partial sums has a finite limit",
          "Its terms tend to zero",
          `Its first ${n} terms add to something finite`,
          "Its terms are all positive",
        ],
        r,
      );
    },
  ],

  // ── 10.3 The nth Term Test ──
  "math/ap-calculus-bc/unit-10/10.3": [
    (r) => {
      const a = r.int(2, 9);
      const diverges = r.bool();
      const series = diverges ? `Σ ${a}n/(n + ${a})` : `Σ ${a}/n^2`;
      return among(
        `What does the nth Term Test say about   ${series} ?`,
        diverges
          ? "It diverges — the terms do not tend to zero"
          : "Nothing — the terms tend to zero, so the test is inconclusive",
        [
          "It diverges — the terms do not tend to zero",
          "Nothing — the terms tend to zero, so the test is inconclusive",
          "It converges, because the terms tend to zero",
          "The test does not apply to positive series",
        ],
        r,
      );
    },
  ],

  // ── 10.4 The Integral Test ──
  "math/ap-calculus-bc/unit-10/10.4": [
    (r) => {
      const p = r.pick([2, 3, 4]);
      const converges = r.bool();
      const shown = converges ? `Σ 1/n^${p}` : "Σ 1/n";
      return among(
        `The Integral Test is applied to   ${shown}.   What does the improper integral say?`,
        converges ? "It converges, so the series converges" : "It diverges, so the series diverges",
        [
          "It converges, so the series converges",
          "It diverges, so the series diverges",
          "The test cannot be used on this series",
          "It converges, but the series still diverges",
        ],
        r,
      );
    },
  ],

  // ── 10.6 Comparison tests ──
  "math/ap-calculus-bc/unit-10/10.6": [
    (r) => {
      const a = r.int(2, 9);
      return among(
        `Σ 1/(n^2 + ${a}) is compared with Σ 1/n^2. What follows?`,
        "It converges — its terms are smaller than a convergent series'",
        [
          "It converges — its terms are smaller than a convergent series'",
          "It diverges — its terms are smaller than a divergent series'",
          "Nothing — the comparison is the wrong way round",
          "It converges only if a is even",
        ],
        r,
      );
    },
  ],

  // ── 10.7 The Alternating Series Test ──
  "math/ap-calculus-bc/unit-10/10.7": [
    (r) => {
      const a = r.int(1, 9);
      return among(
        `Σ (-1)^n · ${a}/n satisfies which conditions of the Alternating Series Test?`,
        "The terms shrink and tend to zero, so it converges",
        [
          "The terms shrink and tend to zero, so it converges",
          "The terms grow, so it diverges",
          "The test needs positive terms, so it does not apply",
          "The terms tend to a non-zero limit",
        ],
        r,
      );
    },
  ],

  // ── 10.9 Absolute and conditional convergence ──
  "math/ap-calculus-bc/unit-10/10.9": [
    (r) => {
      const power = r.pick([1, 2]);
      const conditional = power === 1;
      return among(
        `Σ (-1)^n / n^${power} converges. Is it absolutely or conditionally convergent?`,
        conditional ? "Conditionally" : "Absolutely",
        [
          "Absolutely",
          "Conditionally",
          "Neither — it diverges",
          "Both at once",
        ],
        r,
      );
    },
  ],

  // ── 10.10 The alternating series error bound ──
  "math/ap-calculus-bc/unit-10/10.10": [
    (r) => {
      const n = r.int(3, 9);
      return ask(
        `An alternating series is cut off after ${n} terms. What bounds the error?`,
        `The size of term ${n + 1}`,
        [
          `The size of term ${n}`,
          `The sum of the first ${n} terms`,
          `The size of term ${n + 2}`,
          "Nothing bounds it",
        ],
        r,
      );
    },
  ],

  // ── 10.12 The Lagrange error bound ──
  "math/ap-calculus-bc/unit-10/10.12": [
    (r) => {
      const n = r.int(2, 6);
      return among(
        `A Taylor polynomial of degree ${n} is used. What does the Lagrange bound involve?`,
        `The largest size of the ${n + 1}th derivative on the interval`,
        [
          `The largest size of the ${n + 1}th derivative on the interval`,
          `The value of the ${n}th derivative at the centre`,
          "The sum of every derivative",
          "Only the distance from the centre",
        ],
        r,
      );
    },
  ],

  // ── 10.14 Taylor and Maclaurin series ──
  "math/ap-calculus-bc/unit-10/10.14": [
    (r) => {
      const cases = [
        { f: "e^x", series: "Σ x^n / n!" },
        { f: "sin x", series: "Σ (-1)^n x^(2n+1) / (2n+1)!" },
        { f: "cos x", series: "Σ (-1)^n x^(2n) / (2n)!" },
        { f: "1/(1 - x)", series: "Σ x^n" },
      ];
      const c = r.pick(cases);
      return ask(
        `What is the Maclaurin series of   ${c.f} ?`,
        c.series,
        cases.filter((one) => one.series !== c.series).map((one) => one.series),
        r,
      );
    },
  ],

  // ── 10.15 Functions as power series ──
  "math/ap-calculus-bc/unit-10/10.15": [
    (r) => {
      const a = r.int(2, 9);
      return ask(
        `Write   1/(1 - ${a}x)   as a power series.`,
        `Σ (${a}x)^n`,
        [`Σ ${a}x^n`, `Σ x^n/${a}`, `Σ (x/${a})^n`, `Σ ${a}^n x`, `Σ (1 - ${a}x)^n`],
        r,
      );
    },
  ],
};

/**
 * The generators behind the shared half of the manifest.
 *
 * Which subunits are shared is decided in `templates.ts` — this reads that
 * decision back rather than restating it, so the two halves cannot drift into
 * disagreeing about it. Pointing at AB's array rather than copying it means one
 * place to fix a bug and one set of distractors to keep honest.
 */
function sharedWithAb(): Record<string, ((r: Rng) => Built)[]> {
  const out: Record<string, ((r: Rng) => Built)[]> = {};

  for (const id of Object.keys(GENERATED)) {
    if (!id.startsWith("math/ap-calculus-bc/") || OWN[id]) continue;

    const twin = CALCULUS_AB[id.replace("/ap-calculus-bc/", "/ap-calculus-ab/")];
    if (twin) out[id] = twin;
  }

  return out;
}

export const CALCULUS_BC: Record<string, ((r: Rng) => Built)[]> = {
  ...OWN,
  ...sharedWithAb(),
};
