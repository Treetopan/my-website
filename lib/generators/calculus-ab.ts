import "server-only";

import {
  among,
  ask,
  dot,
  frac,
  graph,
  head,
  fill,
  line,
  plot,
  point,
  poly,
  signed,
  slider,
  slopeField,
  stroke,
  vertical,
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
 *
 * Two things govern which kind a question takes. The first is that this is a
 * subject about pictures: an inflection point, a jump, an interval where f
 * falls, the shape of f' — every one of those is something to see, and four
 * lines of text describing a graph is a worse question than the graph. So the
 * spatial kinds carry a fifth of the course, and about as many again are asked
 * over a figure the student has to read.
 *
 * The second is that multiple choice is a poor fit for a game against a clock.
 * Four visible options reward elimination, which is a real exam skill and not
 * the skill this is meant to build — under time pressure it is the *only*
 * skill, because working the answer out is slower than ruling three out. So
 * choice is kept for the questions whose answer really is a statement: which
 * theorem applies, what kind of discontinuity, which rule to reach for first.
 * Everything whose answer is a number the student ought to be able to produce
 * is typed, dragged or placed instead.
 */
export const CALCULUS_AB: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.6 Determining limits using algebraic manipulation ──
  "math/ap-calculus-ab/unit-1/1.6": [
    (r) => {
      const root = r.nonzero(-6, 6);
      let other = r.nonzero(-6, 6);
      while (other === root) other = r.nonzero(-6, 6);
      // A 0/0 form that cancels to (x - other), so the limit is a number the
      // student produces by cancelling rather than one they spot in a list.
      return fill(
        `Evaluate:   lim(x→${root}) (${poly([[1, 2], [-(root + other), 1], [root * other, 0]])}) / (x${signed(-root)})`,
        root - other,
        { hint: "Factor and cancel first" },
      );
    },
  ],

  // ── 1.15 Limits at infinity and horizontal asymptotes ──
  "math/ap-calculus-ab/unit-1/1.15": [
    // No figure here, deliberately. The grid is square, so a horizontal
    // asymptote at 3/8 is drawn a third of a unit above the axis and reads as
    // "zero" — the picture would teach the wrong answer. The limit at infinity
    // is one of the few things about a function that a window this size cannot
    // show.
    (r) => {
      const a = r.coefficient(8);
      const b = r.coefficient(8);
      // Only the two cases with a finite answer, so the answer is a number the
      // student writes down rather than a phrase they pick out.
      const bottomBigger = r.bool();
      const bottom = bottomBigger ? 3 : 2;
      return fill(
        `Evaluate:   lim(x→∞) (${head(a, "x^2")} + 1) / (${head(b, `x^${bottom}`)} + 1)`,
        bottomBigger ? "0" : frac(a, b),
        { hint: "Compare the top and bottom degrees" },
      );
    },
  ],

  // ── 2.5 The Power Rule ──
  "math/ap-calculus-ab/unit-2/2.5": [
    // Asked at a point rather than as an expression: reading "12x^3 - 6x" off a
    // list of four is a matching exercise, and producing f'(2) is not.
    (r) => {
      const a = r.coefficient(5);
      const n = r.int(2, 4);
      const b = r.coefficient(5);
      const m = r.int(1, n - 1);
      const c = r.nonzero(-9, 9);
      const at = r.pick([1, 2]);
      return fill(
        `f(x) = ${poly([[a, n], [b, m], [c, 0]])}.   What is f'(${at})?`,
        a * n * at ** (n - 1) + b * m * at ** (m - 1),
        { hint: "Differentiate, then substitute" },
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
      const at = r.pick([0, 1]);
      return fill(
        `f(x) = (${head(a, "x")}${signed(b)})(${head(c, "x")}${signed(d)}).   What is f'(${at})?`,
        2 * a * c * at + a * d + b * c,
        { hint: "Product rule, then substitute" },
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
      const n = r.int(2, 6);
      const at = r.int(-3, 3);
      // b is chosen so the inside is exactly 1 at the point asked about, which
      // leaves n·a — the chain rule and nothing else.
      const b = 1 - a * at;
      return fill(
        `f(x) = (${head(a, "x")}${signed(b)})^${n}.   What is f'(${at})?`,
        n * a,
        { hint: "Work out the inside first" },
      );
    },
  ],

  // ── 3.6 Higher-order derivatives ──
  "math/ap-calculus-ab/unit-3/3.6": [
    (r) => {
      const a = r.coefficient(6);
      const n = r.int(3, 5);
      const b = r.coefficient(6);
      const at = r.pick([1, 2]);
      // f = ax^n + bx², so f'' = a·n(n-1)x^(n-2) + 2b.
      return fill(
        `f(x) = ${poly([[a, n], [b, 2]])}.   What is f''(${at})?`,
        a * n * (n - 1) * at ** (n - 2) + 2 * b,
        { hint: "Differentiate twice" },
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
      const wantVelocity = r.bool();
      // Position s(t) = at² + bt + c, so velocity is 2at + b and acceleration
      // is the constant 2a.
      return fill(
        `A particle has position s(t) = ${poly([[a, 2], [b, 1], [c, 0]], "t")}. What is its ${wantVelocity ? "velocity" : "acceleration"} at t = ${at}?`,
        wantVelocity ? 2 * a * at + b : 2 * a,
        { hint: wantVelocity ? "Differentiate once" : "Differentiate twice" },
      );
    },
  ],

  // ── 4.5 Related rates ──
  "math/ap-calculus-ab/unit-4/4.5": [
    (r) => {
      const rate = r.int(2, 9);
      const radius = r.int(2, 12);
      // A = πr², so dA/dt = 2πr·dr/dt.
      return fill(
        `A circle's radius grows at ${rate} units per second. How fast is its area growing when r = ${radius}? Give the multiple of π.`,
        2 * radius * rate,
        { unit: "π units² per second", hint: "dA/dt = 2πr · dr/dt" },
      );
    },
  ],

  // ── 4.7 L'Hospital's Rule ──
  "math/ap-calculus-ab/unit-4/4.7": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.coefficient(6);
      const n = r.int(2, 4);
      const c = r.coefficient(6);
      const d = r.coefficient(6);
      // Both parts vanish at zero, and the ratio of the linear coefficients is
      // what survives one round of differentiating.
      return fill(
        `Evaluate:   lim(x→0) (${poly([[a, n], [c, 1]])}) / (${poly([[b, n], [d, 1]])})`,
        frac(c, d),
        { hint: "a fraction is fine" },
      );
    },
  ],

  // ── 5.3 Increasing and decreasing intervals ──
  "math/ap-calculus-ab/unit-5/5.3": [
    (r) => {
      const span = 8;
      const p = r.nonzero(-6, 6);
      let q = r.nonzero(-6, 6);
      while (q === p) q = r.nonzero(-6, 6);
      const low = Math.min(p, q);
      const high = Math.max(p, q);
      // f' = (x - p)(x - q) dips below the axis between its roots, so f falls
      // on exactly that interval. Both endpoints are asked for at once: the
      // grid is the closest thing here to dragging the ends of an interval,
      // and producing both beats recognising one.
      return point(
        `The graph of f' is drawn. f is decreasing on exactly one interval (a, b) — place the point (a, b).`,
        {
          span,
          x: low,
          y: high,
          zero: 2,
          figure: graph({
            span,
            curves: [
              plot((x) => (x - p) * (x - q), { span, label: "f'" }),
            ],
            caption: "The curve drawn is f', not f. Left endpoint across, right endpoint up.",
          }),
        },
      );
    },
  ],

  // ── 5.2 Critical points ──
  "math/ap-calculus-ab/unit-5/5.2": [
    // Typed, because a critical point is a number the student finds rather
    // than one they spot among four — and read off f', because that is the
    // graph the answer is actually visible on.
    (r) => {
      const span = 8;
      const root = r.nonzero(-5, 5);
      const a = r.coefficient(4);
      return fill(
        `The graph of f' is drawn. At what x does f have its only critical point?`,
        root,
        {
          hint: "a number",
          figure: graph({
            span,
            curves: [
              plot((x) => 2 * a * (x - root), { span, label: "f'" }),
            ],
            caption: `f'(x) = ${poly([[2 * a, 1], [-2 * a * root, 0]])}`,
          }),
        },
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
      const n = r.int(2, 4);
      const a = (n + 1) * r.coefficient(4); // divides evenly by n + 1
      const b = r.coefficient(6) * 2;
      const at = r.pick([1, 2]);
      // Pinning F(0) = 0 turns "+ C" from something to remember into
      // something to use, and turns the answer into a number.
      return fill(
        `F is the antiderivative of f(x) = ${poly([[a, n], [b, 1]])} with F(0) = 0.   What is F(${at})?`,
        (a / (n + 1)) * at ** (n + 1) + (b / 2) * at ** 2,
        { hint: "Raise the power, divide by the new one" },
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
      return fill(
        `Evaluate:   ∫ from 0 to ${upper} of (${poly([[a, 2], [b, 1]])}) dx`,
        (a / 3) * upper ** 3 + (b / 2) * upper ** 2,
        { hint: "Antidifferentiate, then take the ends" },
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
      return fill(
        `What is the average value of f(x) = ${head(a, "x^2")} on [0, ${upper}]?`,
        (a * upper * upper) / 3,
        { hint: "The integral, divided by the width" },
      );
    },
  ],

  // ── 8.4 The area between curves ──
  "math/ap-calculus-ab/unit-8/8.4": [
    (r) => {
      const m = r.int(2, 8);
      // Between y = mx and y = x² the curves meet at 0 and m, and the area is
      // m³/6.
      return fill(
        `What is the area enclosed between y = ${head(m, "x")} and y = x²?`,
        frac(m ** 3, 6),
        { hint: "a fraction is fine" },
      );
    },
  ],
  // ── 1.1 Change at an instant ──
  "math/ap-calculus-ab/unit-1/1.1": [
    (r) => {
      const span = 8;
      const time = r.int(3, 7);
      const distance = r.int(2, 8);
      // s climbs as a parabola, so the chord across the interval and the
      // steepness at any single instant genuinely differ — which is the whole
      // distinction the question is drawing, and the reason it is drawn.
      const s = (t: number) => (distance / (time * time)) * t * t;
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
        graph({
          span,
          xLabel: "t",
          yLabel: "s",
          curves: [
            plot(s, { span, from: 0, to: time, label: "s" }),
            stroke(
              [
                { x: 0, y: 0 },
                { x: time, y: distance },
              ],
              { tone: "guide", dashed: true },
            ),
          ],
          caption: "The dashed chord spans the whole interval.",
        }),
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
      const span = 8;
      const at = r.int(-4, 4);
      const limit = r.int(-4, 4);
      const hole = limit + r.pick([-3, -2, 2, 3]);
      const slope = r.sign();
      return fill(
        `Read the limit off the graph:   lim as x → ${at} of f(x)`,
        limit,
        {
          hint: "The limit does not look at the point itself",
          figure: graph({
            span,
            curves: [plot((x) => limit + slope * (x - at), { span, label: "f" })],
            marks: [dot(at, limit, { open: true }), dot(at, hole)],
            caption: `f(${at}) is defined, and it is not where the curve is heading.`,
          }),
        },
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
      const span = 8;
      const at = r.int(-4, 4);
      const left = r.int(-4, 4);
      const step = r.pick([3, 4]);
      // Away from zero, so the two levels never coincide and both stay on the
      // grid whichever way the roll goes.
      const right = left > 0 ? left - step : left + step;
      return point(
        `The graph jumps at x = ${at}. Place the point f approaches as x → ${at} from the left.`,
        {
          span,
          x: at,
          y: left,
          zero: 2,
          figure: graph({
            span,
            curves: [
              stroke([
                { x: -span, y: left },
                { x: at, y: left },
              ]),
              stroke(
                [
                  { x: at, y: right },
                  { x: span, y: right },
                ],
                { label: "f" },
              ),
            ],
            caption: "A one-sided limit is read off one side only.",
          }),
        },
      );
    },
  ],

  // ── 1.10 Types of discontinuity ──
  "math/ap-calculus-ab/unit-1/1.10": [
    (r) => {
      const span = 8;
      const at = r.nonzero(-3, 3);
      const kind = r.int(0, 2);
      const shown = [
        `f(x) = (x^2 - ${at * at})/(x${signed(-at)})`,
        `f(x) = 1/(x${signed(-at)})`,
        `f(x) = ${at} for x < ${at} and ${at + 1} for x ≥ ${at}`,
      ][kind];
      const names = ["Removable", "Infinite", "Jump", "None — it is continuous"];

      // Each kind is drawn as what it actually looks like, because "removable"
      // and "infinite" are names for two pictures before they are names for
      // two algebraic forms.
      const drawn = [
        graph({
          span,
          curves: [plot((x) => x + at, { span, label: "f" })],
          marks: [dot(at, 2 * at, { open: true })],
        }),
        graph({
          span,
          curves: [
            plot((x) => 1 / (x - at), { span, label: "f" }),
            vertical(at, span),
          ],
        }),
        graph({
          span,
          curves: [
            stroke([
              { x: -span, y: at },
              { x: at, y: at },
            ]),
            stroke(
              [
                { x: at, y: at + 1 },
                { x: span, y: at + 1 },
              ],
              { label: "f" },
            ),
          ],
        }),
      ][kind];

      return among(
        `What kind of discontinuity does this have at x = ${at}?   ${shown}`,
        names[kind],
        names,
        r,
        drawn,
      );
    },
  ],

  // ── 1.11 Continuity at a point ──
  "math/ap-calculus-ab/unit-1/1.11": [
    (r) => {
      const span = 10;
      const at = r.int(1, 3);
      const a = r.nonzero(-2, 2);
      const b = r.nonzero(-4, 4);
      // f(x) = ax + b for x < at, and k for x ≥ at. Continuity fixes k.
      return fill(
        `f(x) = ${head(a, "x")}${signed(b)} for x < ${at}, and f(x) = k for x ≥ ${at}. What k makes f continuous?`,
        a * at + b,
        {
          hint: "The two pieces have to meet",
          figure: graph({
            span,
            curves: [plot((x) => a * x + b, { span, to: at, label: "f" })],
            caption: "Only the left-hand piece is drawn. The right-hand piece is the constant k.",
          }),
        },
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
      const span = 8;
      const hole = r.int(-4, 4);
      const other = hole + r.int(1, 4);
      // The gap is drawn but the point is not, so filling it means extending
      // the line rather than reading a dot off the picture.
      return point(
        `f(x) = ((x${signed(-hole)})(x${signed(-other)}))/(x${signed(-hole)}) has a hole at x = ${hole}. Place the point that would fill it.`,
        {
          span,
          x: hole,
          y: hole - other,
          zero: 2,
          figure: graph({
            span,
            curves: [
              plot((x) => x - other, { span, to: hole - 0.4 }),
              plot((x) => x - other, { span, from: hole + 0.4, label: "f" }),
            ],
            caption: "The break in the line is the hole.",
          }),
        },
      );
    },
  ],

  // ── 1.14 Infinite limits ──
  "math/ap-calculus-ab/unit-1/1.14": [
    (r) => {
      const span = 6;
      const pole = r.nonzero(-4, 4);
      return slider(
        `Drag to the x where   f(x) = 1/(x${signed(-pole)})^2   has its vertical asymptote.`,
        {
          min: -span,
          max: span,
          step: 1,
          value: pole,
          full: 0.25,
          zero: 2,
          figure: graph({
            span,
            curves: [
              plot((x) => 1 / ((x - pole) * (x - pole)), { span, label: "f" }),
            ],
            caption: "Both branches run off the top of the grid.",
          }),
        },
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
      return slider(
        `A table gives f(${at - step}) = ${value - slope * step} and f(${at + step}) = ${value + slope * step}. Drag to f'(${at}).`,
        {
          min: -10,
          max: 10,
          step: 1,
          value: slope,
          full: 0.25,
          zero: 2,
        },
      );
    },
  ],

  // ── 2.4 Differentiability and continuity ──
  "math/ap-calculus-ab/unit-2/2.4": [
    (r) => {
      const span = 8;
      const at = r.nonzero(-4, 4);
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
        graph({
          span,
          curves: [plot((x) => Math.abs(x - at), { span, label: "f" })],
        }),
      );
    },
  ],

  // ── 2.6 The sum and constant multiple rules ──
  "math/ap-calculus-ab/unit-2/2.6": [
    (r) => {
      const a = r.coefficient(6);
      const b = r.coefficient(6);
      const c = r.nonzero(-9, 9);
      const at = r.pick([1, 2]);
      return fill(
        `f(x) = ${poly([[a, 3], [b, 2], [c, 0]])}.   What is f'(${at})?`,
        3 * a * at * at + 2 * b * at,
        { hint: "The constant contributes nothing" },
      );
    },
  ],

  // ── 2.7 Derivatives of the standard functions ──
  "math/ap-calculus-ab/unit-2/2.7": [
    (r) => {
      const cases = [
        { f: "sin x", d: "cos x", accept: ["cos(x)"] },
        { f: "cos x", d: "-sin x", accept: ["-sin(x)"] },
        { f: "e^x", d: "e^x", accept: ["e^(x)", "exp(x)"] },
        { f: "ln x", d: "1/x", accept: ["x^-1", "x^(-1)"] },
      ];
      const c = r.pick(cases);
      return fill(`Differentiate:   ${c.f}`, c.d, {
        accept: c.accept,
        hint: "an expression in x",
      });
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
      // Pythagorean points, so the slope is a fraction the student can write
      // rather than a decimal they have to round.
      const [px, py, radius] = r.pick([
        [3, 4, 5],
        [4, 3, 5],
        [6, 8, 10],
        [8, 6, 10],
        [5, 12, 13],
        [12, 5, 13],
      ]);
      const x = px * r.sign();
      const y = py * r.sign();
      const span = radius + 2;
      return fill(
        `x² + y² = ${radius * radius}.   What is dy/dx at (${x}, ${y})?`,
        frac(-x, y),
        {
          hint: "Differentiate both sides first",
          figure: graph({
            span,
            curves: [
              plot((t) => Math.sqrt(radius * radius - t * t), {
                span,
                from: -radius,
                to: radius,
              }),
              plot((t) => -Math.sqrt(radius * radius - t * t), {
                span,
                from: -radius,
                to: radius,
              }),
            ],
            marks: [dot(x, y)],
          }),
        },
      );
    },
  ],

  // ── 3.3 Derivatives of inverse functions ──
  "math/ap-calculus-ab/unit-3/3.3": [
    (r) => {
      const slope = r.int(2, 9) * r.sign();
      const at = r.nonzero(-6, 6);
      const image = r.nonzero(-6, 6);
      return fill(
        `f(${at}) = ${image} and f'(${at}) = ${slope}.   What is (f⁻¹)'(${image})?`,
        frac(1, slope),
        { hint: "a fraction is fine" },
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
      const span = 8;
      const at = r.int(-3, 3);
      const value = r.int(-4, 4);
      const slope = r.pick([-2, -1, 1, 2]);
      const step = r.pick([1, 2]);
      // A gentle curvature, so the tangent and the curve visibly part company
      // and the estimate is visibly an estimate.
      const f = (x: number) => value + slope * (x - at) + 0.25 * (x - at) ** 2;
      return fill(
        `Use the tangent line drawn at x = ${at} to estimate f(${at + step}).`,
        value + slope * step,
        {
          hint: "Value plus slope times step",
          figure: graph({
            span,
            curves: [
              plot(f, { span, label: "f" }),
              plot((x) => value + slope * (x - at), {
                span,
                tone: "guide",
                dashed: true,
              }),
            ],
            marks: [dot(at, value)],
            caption: "The dashed line is the tangent at the marked point.",
          }),
        },
      );
    },
  ],

  // ── 5.1 The Mean Value Theorem ──
  "math/ap-calculus-ab/unit-5/5.1": [
    (r) => {
      const span = 10;
      const at = r.pick([-4, -2, 0, 2, 4]);
      const reach = r.pick([1, 2]);
      const a = at - reach;
      const b = at + reach;
      // f = x²/4, whose mean-value point is the midpoint of the interval — and
      // whose values stay on the grid, which x² does not.
      const f = (x: number) => (x * x) / 4;
      return point(
        `The chord over [${a}, ${b}] is drawn. Place the point on the curve where the tangent is parallel to it.`,
        {
          span,
          x: at,
          y: (at * at) / 4,
          zero: 2,
          figure: graph({
            span,
            curves: [
              plot(f, { span, label: "f" }),
              stroke(
                [
                  { x: a, y: f(a) },
                  { x: b, y: f(b) },
                ],
                { tone: "guide", dashed: true },
              ),
            ],
            caption: "The Mean Value Theorem says such a point exists.",
          }),
        },
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
      const span = 8;
      const at = r.int(-4, 4);
      const height = r.int(-4, 4);
      // A cubic with a turning point either side, so the change of concavity
      // is the visible middle of the S rather than something to take on trust.
      const f = (x: number) =>
        (x - at) ** 3 / 6 - 1.5 * (x - at) + height;
      return point(
        `Place the point of inflection.`,
        {
          span,
          x: at,
          y: height,
          zero: 2,
          figure: graph({
            span,
            curves: [plot(f, { span, label: "f" })],
            caption: "Concavity changes exactly once.",
          }),
        },
      );
    },
  ],

  // ── 5.8 Sketching a function and its derivative ──
  "math/ap-calculus-ab/unit-5/5.8": [
    (r) => {
      const span = 8;
      const a = r.pick([-2, -1, 1, 2]);
      const at = r.int(-2, 2);
      const height = r.int(-4, 4);
      // f is a parabola, so f' is a line — the one derivative a student can
      // actually draw, and the one sketch worth grading.
      return line(
        `The graph of f is drawn. Draw the graph of f'.`,
        {
          span,
          slope: 2 * a,
          intercept: -2 * a * at,
          figure: graph({
            span,
            curves: [
              plot((x) => a * (x - at) ** 2 + height, { span, label: "f" }),
            ],
            caption: "Where f turns, f' crosses zero.",
          }),
        },
      );
    },
  ],

  // ── 5.9 Connecting f, f' and f'' ──
  "math/ap-calculus-ab/unit-5/5.9": [
    (r) => {
      const span = 8;
      const at = r.nonzero(-5, 5);
      const steep = r.int(1, 3);
      // f' crosses from positive to negative at `at`, which is a maximum of f
      // — and is the sort of thing that is obvious on the graph of f' and
      // invisible in a list of four phrases.
      return slider(
        `The graph of f' is drawn. At what x does f have a relative maximum?`,
        {
          min: -6,
          max: 6,
          step: 1,
          value: at,
          full: 0.25,
          zero: 2,
          figure: graph({
            span,
            curves: [
              plot((x) => steep * (at - x), { span, label: "f'" }),
            ],
            caption: "This is f', not f.",
          }),
        },
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
      const span = 8;
      const radius = r.int(2, 4);
      const cx = r.int(-3, 3);
      const cy = r.int(-3, 3);
      return point(
        `(x${signed(-cx)})² + (y${signed(-cy)})² = ${radius * radius}. Place the point where the tangent is horizontal and y is greatest.`,
        {
          span,
          x: cx,
          y: cy + radius,
          zero: 2,
          figure: graph({
            span,
            curves: [
              plot((t) => cy + Math.sqrt(Math.max(0, radius * radius - (t - cx) ** 2)), {
                span,
                from: cx - radius,
                to: cx + radius,
              }),
              plot((t) => cy - Math.sqrt(Math.max(0, radius * radius - (t - cx) ** 2)), {
                span,
                from: cx - radius,
                to: cx + radius,
              }),
            ],
          }),
        },
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
      const span = 8;
      const a = r.int(1, 2);
      const n = r.int(2, 4);
      // Left sum for f = ax on [0, n] with unit widths: a(0 + 1 + … + n-1).
      const strips = Array.from({ length: n }, (_, i) =>
        stroke(
          [
            { x: i, y: 0 },
            { x: i, y: a * i },
            { x: i + 1, y: a * i },
            { x: i + 1, y: 0 },
          ],
          { tone: "guide" },
        ),
      );
      return fill(
        `Estimate the area under   y = ${a === 1 ? "" : a}x   from 0 to ${n} with ${n} left-hand rectangles of width 1.`,
        (a * (n - 1) * n) / 2,
        {
          hint: "Height at the left edge of each strip",
          figure: graph({
            span,
            curves: [plot((x) => a * x, { span, label: "y" }), ...strips],
            caption: "The first rectangle has no height at all.",
          }),
        },
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
      const span = 8;
      const at = r.nonzero(-5, 5);
      const steep = r.int(1, 2);
      // F accumulates f, so F stops climbing exactly where f stops being
      // positive. The graph shown is f; the question is about F.
      return slider(
        `F(x) = ∫ from 0 to x of f(t) dt, and the graph of f is drawn. At what x is F greatest?`,
        {
          min: -6,
          max: 6,
          step: 1,
          value: at,
          full: 0.25,
          zero: 2,
          figure: graph({
            span,
            curves: [plot((x) => steep * (at - x), { span, label: "f" })],
            caption: "F climbs while f is above the axis.",
          }),
        },
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
      const span = 6;
      const slope = r.pick([-2, -1, 1, 2]);
      const through = r.int(-4, 4);
      // A constant slope field, so every solution is a line and the one asked
      // for is the line the student can actually draw. Reading the field is
      // the skill; the initial condition picks out which solution.
      return line(
        `The slope field for   dy/dx = ${slope}   is drawn. Draw the solution through (0, ${through}).`,
        {
          span,
          slope,
          intercept: through,
          figure: graph({
            span,
            // A uniform field reads the same at seven dashes across as at
            // twelve, and every one of them is written to the room.
            curves: [slopeField(() => slope, { span, step: 1.5 })],
            marks: [dot(0, through)],
          }),
        },
      );
    },
  ],

  // ── 7.4 Reading a slope field ──
  "math/ap-calculus-ab/unit-7/7.4": [
    (r) => {
      const span = 5;
      const level = r.nonzero(-4, 4);
      // dy/dx = y - level is flat along one horizontal line and steepens away
      // from it, which is a thing to see rather than a thing to be told.
      return slider(
        `A slope field for   dy/dx = y${signed(-level)}   is drawn. The marks are horizontal along one line, y = ?`,
        {
          min: -5,
          max: 5,
          step: 1,
          value: level,
          full: 0.25,
          zero: 2,
          figure: graph({
            span,
            curves: [slopeField((_x, y) => y - level, { span })],
          }),
        },
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
      return fill(
        `Rotating the rectangle under y = ${radius} from x = 0 to x = ${height} about the x-axis gives what volume? Give the multiple of π.`,
        radius * radius * height,
        { unit: "π units³", hint: "A cylinder, radius times radius times length" },
      );
    },
  ],

  // ── 8.10 Discs about another axis ──
  "math/ap-calculus-ab/unit-8/8.10": [
    (r) => {
      const shift = r.int(1, 6);
      const radius = r.int(2, 9);
      return fill(
        `The region under y = ${radius + shift} from x = 0 to x = 1 is rotated about y = ${shift}. What radius does the disc have?`,
        radius,
        { hint: "Distance from the curve to the axis" },
      );
    },
  ],

  // ── 8.11 The washer method ──
  "math/ap-calculus-ab/unit-8/8.11": [
    (r) => {
      const outer = r.int(4, 12);
      const inner = r.int(1, outer - 1);
      const length = r.int(2, 6);
      return fill(
        `Rotating the strip between y = ${inner} and y = ${outer}, from x = 0 to x = ${length}, about the x-axis gives what volume? Give the multiple of π.`,
        (outer * outer - inner * inner) * length,
        { unit: "π units³", hint: "Outer disc minus inner disc" },
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
