import "server-only";

import {
  among,
  ask,
  dot,
  fill,
  frac,
  graph,
  line,
  piFrac,
  plot,
  point,
  signed,
  slider,
  type Built,
  type Rng,
} from "./kit";

/**
 * Geometry generators.
 *
 * Geometry resists generation more than the algebra courses do: most of its
 * subunits are proof, construction, and classification, none of which reduce
 * to numbers a generator can roll. What is here is the computational spine —
 * segments, angles, triangles, circles, solids — and the rest of the course is
 * left for written questions, which is the honest answer for those topics.
 */
export const GEOMETRY: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.3 Segment addition and midpoint ──
  "math/geometry/unit-1/1.3": [
    (r) => {
      const ab = r.int(4, 30);
      const bc = r.int(4, 30);
      return fill(
        `B lies between A and C. If AB = ${ab} and BC = ${bc}, what is AC?`,
        ab + bc,
        { hint: "a number" },
      );
    },
  ],

  // ── 1.4 Angle pair relationships ──
  "math/geometry/unit-1/1.4": [
    (r) => {
      const angle = r.int(15, 75);
      const complement = r.bool();
      return fill(
        `What is the measure of the ${complement ? "complement" : "supplement"} of a ${angle}° angle?`,
        `${complement ? 90 - angle : 180 - angle}°`,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 1.2 Angle measure ──
  "math/geometry/unit-1/1.2": [
    // Dragging to an angle is a different skill from naming one, and the
    // scoring says how far out you were rather than just that you were.
    (r) => {
      const angle = r.int(10, 170);
      return slider(`Set the slider to an angle of ${angle}°.`, {
        min: 0,
        max: 180,
        step: 1,
        value: angle,
        unit: "degrees",
        full: 3,
        zero: 30,
      });
    },
  ],

  // ── 1.5 Distance and midpoint on the coordinate plane ──
  "math/geometry/unit-1/1.5": [
    // Midpoint, placed rather than picked. Rolled from the midpoint outwards
    // so it lands on a grid point, and drawn as two loose ends rather than as
    // a segment — with the segment there the answer is its middle, which the
    // eye finds without doing any of the arithmetic.
    (r) => {
      const span = 9;
      const mx = r.int(-6, 6);
      const my = r.int(-6, 6);
      const across = r.nonzero(-3, 3);
      const up = r.nonzero(-3, 3);
      const x1 = mx - across;
      const y1 = my - up;
      const x2 = mx + across;
      const y2 = my + up;
      return point(
        `Place the midpoint of the segment from (${x1}, ${y1}) to (${x2}, ${y2}).`,
        {
          span,
          x: mx,
          y: my,
          zero: 2,
          figure: graph({ span, curves: [], marks: [dot(x1, y1), dot(x2, y2)] }),
        },
      );
    },
    // Distance, over Pythagorean triples so the root comes out whole.
    (r) => {
      const [a, b] = r.pick([
        [3, 4],
        [6, 8],
        [5, 12],
        [8, 15],
        [9, 12],
        [7, 24],
      ]);
      const x1 = r.int(-6, 6);
      const y1 = r.int(-6, 6);
      return fill(
        `What is the distance from (${x1}, ${y1}) to (${x1 + a}, ${y1 + b})?`,
        Math.round(Math.sqrt(a * a + b * b)),
        { hint: "a number" },
      );
    },
  ],

  // ── 5.1 Triangle classification and the angle sum theorem ──
  "math/geometry/unit-5/5.1": [
    (r) => {
      const first = r.int(20, 90);
      const second = r.int(20, 150 - first);
      const third = 180 - first - second;
      return fill(
        `Two angles of a triangle measure ${first}° and ${second}°. What is the third?`,
        `${third}°`,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 5.2 The exterior angle theorem ──
  "math/geometry/unit-5/5.2": [
    (r) => {
      const a = r.int(25, 80);
      const b = r.int(25, 80);
      return fill(
        `Two remote interior angles of a triangle measure ${a}° and ${b}°. What is the exterior angle at the third vertex?`,
        `${a + b}°`,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 6.5 The midsegment theorem ──
  "math/geometry/unit-6/6.5": [
    (r) => {
      const base = r.int(6, 40) * 2;
      return fill(
        `The midsegment of a triangle is parallel to a side of length ${base}. How long is the midsegment?`,
        base / 2,
        { hint: "a number" },
      );
    },
  ],

  // ── 6.6 The triangle inequality theorem ──
  "math/geometry/unit-6/6.6": [
    (r) => {
      const a = r.int(4, 15);
      const b = r.int(4, 15);
      // The third side is strictly between the difference and the sum.
      const low = Math.abs(a - b);
      const high = a + b;
      const valid = r.int(low + 1, high - 1);
      const options = [valid, low, high, high + r.int(1, 6)];
      return among(
        `Two sides of a triangle measure ${a} and ${b}. Which could be the third side?`,
        String(valid),
        options.map(String),
        r,
      );
    },
  ],

  // ── 7.2 Similar polygons ──
  "math/geometry/unit-7/7.2": [
    (r) => {
      const k = r.int(2, 5);
      const side = r.int(3, 12);
      return fill(
        `Two similar figures have a scale factor of ${k}. If a side of the smaller is ${side}, what is the matching side of the larger?`,
        side * k,
        { hint: "a number" },
      );
    },
  ],

  // ── 7.7 Perimeter and area ratios of similar figures ──
  "math/geometry/unit-7/7.7": [
    (r) => {
      const a = r.int(2, 7);
      let b = r.int(2, 9);
      while (b === a) b = r.int(2, 9);
      return fill(
        `Two similar figures have sides in the ratio ${a}:${b}. What is the ratio of their areas?`,
        `${a * a}:${b * b}`,
        { hint: "e.g. 9:16" },
      );
    },
  ],

  // ── 8.1 The Pythagorean theorem ──
  "math/geometry/unit-8/8.1": [
    (r) => {
      const [a, b] = r.pick([
        [3, 4],
        [6, 8],
        [5, 12],
        [8, 15],
        [7, 24],
        [9, 40],
        [20, 21],
      ]);
      const k = r.pick([1, 1, 1, 2]);
      const legs = [a * k, b * k];
      const c = Math.round(Math.sqrt(legs[0] ** 2 + legs[1] ** 2));
      return fill(
        `A right triangle has legs ${legs[0]} and ${legs[1]}. How long is the hypotenuse?`,
        c,
        { hint: "a number" },
      );
    },
  ],

  // ── 8.2 Pythagorean triples ──
  "math/geometry/unit-8/8.2": [
    (r) => {
      const [a, b] = r.pick([
        [3, 4],
        [6, 8],
        [5, 12],
        [8, 15],
        [7, 24],
        [9, 12],
        [20, 21],
      ]);
      const c = Math.round(Math.sqrt(a * a + b * b));
      return fill(
        `A right triangle has legs ${a} and ${b}. How long is the hypotenuse?`,
        c,
        { hint: "a whole number" },
      );
    },
  ],

  // ── 8.3 Special right triangles ──
  "math/geometry/unit-8/8.3": [
    (r) => {
      const leg = r.int(2, 12);
      if (r.bool()) {
        return ask(
          `In a 45–45–90 triangle, each leg measures ${leg}. How long is the hypotenuse?`,
          `${leg}√2`,
          [`${leg}√3`, `${2 * leg}`, `${leg}`, `${leg}√2/2`, `${2 * leg}√2`],
          r,
        );
      }
      const short = leg;
      return ask(
        `In a 30–60–90 triangle, the shorter leg measures ${short}. How long is the longer leg?`,
        `${short}√3`,
        [`${short}√2`, `${2 * short}`, `${short}`, `${2 * short}√3`, `${short}√3/2`],
        r,
      );
    },
  ],

  // ── 8.4 Sine, cosine and tangent ratios ──
  "math/geometry/unit-8/8.4": [
    (r) => {
      const [a, b] = r.pick([
        [3, 4],
        [6, 8],
        [5, 12],
        [8, 15],
        [7, 24],
      ]);
      const c = Math.round(Math.sqrt(a * a + b * b));
      const ratio = r.pick(["sin", "cos", "tan"] as const);
      // θ is the angle opposite the side of length a.
      const correct =
        ratio === "sin" ? frac(a, c) : ratio === "cos" ? frac(b, c) : frac(a, b);
      return fill(
        `A right triangle has legs ${a} and ${b} and hypotenuse ${c}. If θ is opposite the leg of length ${a}, what is ${ratio} θ?`,
        correct,
        { hint: "a fraction" },
      );
    },
  ],

  // ── 9.1 Polygon interior and exterior angle sums ──
  "math/geometry/unit-9/9.1": [
    (r) => {
      const n = r.int(5, 14);
      const wantInterior = r.bool();
      return fill(
        wantInterior
          ? `What is the sum of the interior angles of a ${n}-gon?`
          : `What is the measure of one exterior angle of a regular ${n}-gon?`,
        wantInterior ? `${180 * (n - 2)}°` : `${frac(360, n)}°`,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 10.3 Arcs and central angles ──
  "math/geometry/unit-10/10.3": [
    (r) => {
      const central = r.int(20, 160);
      const inscribed = r.bool();
      return fill(
        inscribed
          ? `An inscribed angle subtends an arc of ${2 * central}°. What is the inscribed angle?`
          : `A central angle measures ${central}°. What is the measure of its intercepted arc?`,
        `${central}°`,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 10.9 The equation of a circle ──
  "math/geometry/unit-10/10.9": [
    (r) => {
      const h = r.nonzero(-8, 8);
      const k = r.nonzero(-8, 8);
      const radius = r.int(2, 11);
      const circle = (a: number, b: number, rr: number) =>
        `(x${signed(-a)})^2 + (y${signed(-b)})^2 = ${rr}`;
      return ask(
        `Write the equation of the circle with centre (${h}, ${k}) and radius ${radius}.`,
        circle(h, k, radius * radius),
        [
          circle(h, k, radius), // radius not squared
          circle(-h, -k, radius * radius), // signs of the centre not flipped
          circle(-h, -k, radius),
          circle(k, h, radius * radius),
          circle(h, k, radius * 2),
        ],
        r,
      );
    },
  ],

  // ── 10.10 Areas of sectors ──
  "math/geometry/unit-10/10.10": [
    (r) => {
      const radius = r.int(2, 12);
      const angle = r.pick([30, 45, 60, 90, 120, 135, 180, 270]);
      const area = piFrac(angle * radius * radius, 360);
      return ask(
        `A sector of a circle of radius ${radius} has a central angle of ${angle}°. What is its area, in terms of π?`,
        area,
        [
          piFrac(angle * radius, 360), // radius not squared
          piFrac(radius * radius, 1), // the whole circle
          piFrac(angle * radius * 2, 360), // arc length instead of area
          piFrac(angle * radius * radius, 180),
          piFrac(radius * radius, 360),
        ],
        r,
      );
    },
  ],

  // ── 11.7 Volume of prisms and cylinders ──
  "math/geometry/unit-11/11.7": [
    // Both branches are typed. π is asked for as a multiple rather than as a
    // symbol, because the answer box is a keyboard and π is not on it.
    (r) => {
      const radius = r.int(2, 9);
      const height = r.int(3, 15);
      if (r.bool()) {
        return fill(
          `What is the volume of a cylinder with radius ${radius} and height ${height}? Give the multiple of π.`,
          radius * radius * height,
          { unit: "π units³", hint: "radius squared, times the height" },
        );
      }
      const w = r.int(2, 12);
      const l = r.int(2, 12);
      return fill(
        `What is the volume of a rectangular prism ${l} by ${w} by ${height}?`,
        l * w * height,
        { hint: "a number" },
      );
    },
  ],

  // ── 11.8 Volume of pyramids and cones ──
  "math/geometry/unit-11/11.8": [
    (r) => {
      const radius = r.int(2, 9);
      const height = r.pick([3, 6, 9, 12, 15]);
      return ask(
        `What is the volume of a cone with radius ${radius} and height ${height}, in terms of π?`,
        piFrac(radius * radius * height, 3),
        [
          piFrac(radius * radius * height, 1), // forgot the third
          piFrac(radius * height, 3), // radius not squared
          piFrac(4 * radius ** 3, 3), // sphere formula
          piFrac(radius * radius * height, 2),
          `${radius * radius}π`,
        ],
        r,
      );
    },
  ],

  // ── 11.9 Spheres ──
  "math/geometry/unit-11/11.9": [
    (r) => {
      const radius = r.pick([3, 6, 9, 12]);
      const wantVolume = r.bool();
      return ask(
        `What is the ${wantVolume ? "volume" : "surface area"} of a sphere of radius ${radius}, in terms of π?`,
        wantVolume ? piFrac(4 * radius ** 3, 3) : piFrac(4 * radius * radius, 1),
        [
          wantVolume ? piFrac(4 * radius * radius, 1) : piFrac(4 * radius ** 3, 3),
          piFrac(4 * radius ** 3, 1),
          piFrac(radius ** 3, 3),
          piFrac(radius * radius, 1),
          piFrac(2 * radius * radius, 1),
        ],
        r,
      );
    },
  ],

  // ── 11.11 Similar solids and the effect of scaling ──
  "math/geometry/unit-11/11.11": [
    (r) => {
      const k = r.int(2, 5);
      const wantVolume = r.bool();
      return fill(
        `Two similar solids have corresponding edges in the ratio 1:${k}. What is the ratio of their ${wantVolume ? "volumes" : "surface areas"}?`,
        wantVolume ? `1:${k ** 3}` : `1:${k * k}`,
        { hint: "e.g. 1:8" },
      );
    },
  ],

  // ── 12.2 Permutations and combinations ──
  "math/geometry/unit-12/12.2": [
    (r) => {
      const n = r.int(5, 9);
      const k = r.int(2, 4);
      const permutation = (a: number, b: number) => {
        let out = 1;
        for (let i = 0; i < b; i++) out *= a - i;
        return out;
      };
      const factorial = (a: number) => {
        let out = 1;
        for (let i = 2; i <= a; i++) out *= i;
        return out;
      };
      const ordered = r.bool();
      const p = permutation(n, k);
      const c = p / factorial(k);
      return fill(
        ordered
          ? `In how many ways can ${k} of ${n} people be arranged in order?`
          : `In how many ways can ${k} of ${n} people be chosen, when order does not matter?`,
        ordered ? p : c,
        { hint: "a number" },
      );
    },
  ],

  // ── 12.5 Independent and dependent events ──
  "math/geometry/unit-12/12.5": [
    (r) => {
      const red = r.int(3, 9);
      const blue = r.int(3, 9);
      const total = red + blue;
      const withReplacement = r.bool();
      const correct = withReplacement
        ? frac(red * red, total * total)
        : frac(red * (red - 1), total * (total - 1));
      return fill(
        `A bag holds ${red} red and ${blue} blue marbles. Two are drawn ${withReplacement ? "with" : "without"} replacement. What is the probability both are red?`,
        correct,
        { hint: "a fraction" },
      );
    },
  ],
  // ── 1.1 Points, lines and planes ──
  "math/geometry/unit-1/1.1": [
    (r) => {
      const n = r.int(4, 9);
      const lines = (n * (n - 1)) / 2;
      return fill(
        `No three of ${n} points are collinear. How many different lines do they determine?`,
        lines,
        { hint: "a number" },
      );
    },
  ],

  // ── 1.7 Perimeter, circumference and area ──
  "math/geometry/unit-1/1.7": [
    (r) => {
      const w = r.int(3, 20);
      const h = r.int(3, 20);
      const wantArea = r.bool();
      const area = w * h;
      const perimeter = 2 * (w + h);
      return fill(
        `A rectangle is ${w} by ${h}. What is its ${wantArea ? "area" : "perimeter"}?`,
        wantArea ? area : perimeter,
        { hint: "a number" },
      );
    },
    (r) => {
      const radius = r.int(2, 15);
      return ask(
        `What is the circumference of a circle of radius ${radius}?`,
        `${2 * radius}π`,
        [`${radius * radius}π`, `${radius}π`, `${4 * radius}π`, `${2 * radius}`, `${radius * radius}`],
        r,
      );
    },
  ],

  // ── 2.1 Inductive reasoning ──
  "math/geometry/unit-2/2.1": [
    (r) => {
      const first = r.int(1, 9);
      const d = r.int(2, 9);
      const terms = [0, 1, 2, 3].map((i) => first + i * d);
      const next = first + 4 * d;
      return fill(
        `What comes next in the pattern ${terms.join(", ")}, …?`,
        next,
        { hint: "What is being added each time?" },
      );
    },
  ],

  // ── 2.2 Converse, inverse and contrapositive ──
  "math/geometry/unit-2/2.2": [
    (r) => {
      const n = r.int(2, 12);
      const statement = `If a figure has ${n} equal sides, then it is regular.`;
      const wanted = r.pick(["converse", "inverse", "contrapositive"] as const);
      const forms = {
        converse: `If a figure is regular, then it has ${n} equal sides.`,
        inverse: `If a figure does not have ${n} equal sides, then it is not regular.`,
        contrapositive: `If a figure is not regular, then it does not have ${n} equal sides.`,
      };
      return ask(
        `"${statement}"   What is its ${wanted}?`,
        forms[wanted],
        [forms.converse, forms.inverse, forms.contrapositive, statement],
        r,
      );
    },
  ],

  // ── 2.3 Biconditionals ──
  "math/geometry/unit-2/2.3": [
    (r) => {
      const n = r.int(3, 12);
      return ask(
        `Which is the biconditional of "if a polygon has ${n} sides, then it is an ${n}-gon"?`,
        `A polygon has ${n} sides if and only if it is an ${n}-gon.`,
        [
          `If a polygon is an ${n}-gon, then it has ${n} sides.`,
          `A polygon has ${n} sides or it is an ${n}-gon.`,
          `If a polygon does not have ${n} sides, then it is not an ${n}-gon.`,
          `Every ${n}-gon has ${n} equal sides.`,
        ],
        r,
      );
    },
  ],

  // ── 2.4 The laws of logic ──
  "math/geometry/unit-2/2.4": [
    (r) => {
      const n = r.int(4, 20);
      const detachment = r.bool();
      const given = detachment
        ? `If a shape has ${n} sides then it is a polygon. This shape has ${n} sides.`
        : `If a shape has ${n} sides then it is a polygon. If it is a polygon then it is closed.`;
      return among(
        `${given}   Which law gives the conclusion?`,
        detachment ? "Law of Detachment" : "Law of Syllogism",
        [
          "Law of Detachment",
          "Law of Syllogism",
          "Law of Contrapositives",
          "Law of Converses",
        ],
        r,
      );
    },
  ],

  // ── 2.5 Algebraic proof ──
  "math/geometry/unit-2/2.5": [
    (r) => {
      const a = r.int(2, 15);
      const b = r.int(16, 40);
      const kind = r.int(0, 2);
      const step = [
        `x + ${a} = ${b}, so x = ${b - a}`,
        `x - ${a} = ${b}, so x = ${b + a}`,
        `${a}x = ${a * b}, so x = ${b}`,
      ][kind];
      const answer = [
        "Subtraction Property of Equality",
        "Addition Property of Equality",
        "Division Property of Equality",
      ][kind];
      return among(
        `Which property justifies this step?   ${step}`,
        answer,
        [
          "Subtraction Property of Equality",
          "Addition Property of Equality",
          "Division Property of Equality",
          "Transitive Property of Equality",
        ],
        r,
      );
    },
  ],

  // ── 3.1 Transversals and angle pairs ──
  "math/geometry/unit-3/3.1": [
    (r) => {
      const angle = r.int(25, 155);
      const corresponding = r.bool();
      return fill(
        corresponding
          ? `Two parallel lines are cut by a transversal. One angle is ${angle}°. What is the corresponding angle?`
          : `Two parallel lines are cut by a transversal. One angle is ${angle}°. What is its co-interior (same-side interior) partner?`,
        corresponding ? angle : 180 - angle,
        { unit: "degrees" },
      );
    },
  ],

  // ── 3.2 Angles from parallel lines ──
  "math/geometry/unit-3/3.2": [
    (r) => {
      const angle = r.int(20, 160);
      const kinds = [
        { name: "alternate interior", value: angle },
        { name: "vertical", value: angle },
        { name: "co-interior", value: 180 - angle },
        { name: "linear pair", value: 180 - angle },
      ];
      const kind = r.pick(kinds);
      return fill(
        `One angle measures ${angle}°. What is its ${kind.name} partner?`,
        kind.value,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 3.3 Proving lines parallel ──
  "math/geometry/unit-3/3.3": [
    (r) => {
      const angle = r.int(30, 150);
      return ask(
        `A transversal crosses two lines. Which fact proves the lines are parallel?`,
        `A pair of alternate interior angles both measure ${angle}°`,
        [
          `A pair of co-interior angles both measure ${angle}°`,
          `Two angles on the same line measure ${angle}° and ${180 - angle}°`,
          `A pair of alternate interior angles measure ${angle}° and ${180 - angle}°`,
          `The transversal meets one line at ${angle}°`,
        ],
        r,
      );
    },
  ],

  // ── 3.4 Distance from a point to a line ──
  "math/geometry/unit-3/3.4": [
    (r) => {
      const at = r.nonzero(-9, 9);
      const px = r.nonzero(-9, 9);
      const py = r.nonzero(-9, 9);
      const vertical = r.bool();
      const distance = vertical ? Math.abs(px - at) : Math.abs(py - at);
      return fill(
        `How far is (${px}, ${py}) from the line ${vertical ? "x" : "y"} = ${at}?`,
        distance,
        { hint: "Straight across, at a right angle" },
      );
    },
  ],

  // ── 3.5 Slopes of parallel and perpendicular lines ──
  "math/geometry/unit-3/3.5": [
    (r) => {
      const rise = r.nonzero(-8, 8);
      const run = r.int(2, 8);
      const parallel = r.bool();
      return fill(
        `A line has slope ${frac(rise, run)}. What is the slope of a line ${parallel ? "parallel" : "perpendicular"} to it?`,
        parallel ? frac(rise, run) : frac(-run, rise),
        { hint: "a number or fraction" },
      );
    },
  ],

  // ── 3.6 Equations of parallel and perpendicular lines ──
  "math/geometry/unit-3/3.6": [
    (r) => {
      const span = 8;
      const m = r.pick([-2, -1, 1, 2]);
      const b = r.nonzero(-4, 4);
      const px = r.nonzero(-3, 3);
      const py = r.int(-3, 3);
      // Parallel is a fact about direction, so it is answered by drawing one.
      // Matching a slope across four written equations is a reading exercise.
      return line(
        `Draw the line through (${px}, ${py}) parallel to the one drawn.`,
        {
          span,
          slope: m,
          intercept: py - m * px,
          figure: graph({
            span,
            curves: [
              plot((x) => m * x + b, { span, tone: "second", label: "given" }),
            ],
            marks: [dot(px, py)],
          }),
        },
      );
    },
  ],

  // ── 4.1 Translations ──
  "math/geometry/unit-4/4.1": [
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-6, 6);
      const dx = r.nonzero(-4, 4);
      const dy = r.nonzero(-4, 4);
      return point(
        `Translate (${x}, ${y}) by ⟨${dx}, ${dy}⟩. Place the image.`,
        { span: 10, x: x + dx, y: y + dy },
      );
    },
  ],

  // ── 4.2 Reflections ──
  "math/geometry/unit-4/4.2": [
    (r) => {
      const x = r.nonzero(-8, 8);
      const y = r.nonzero(-8, 8);
      const overX = r.bool();
      return point(
        `Reflect (${x}, ${y}) in the ${overX ? "x" : "y"}-axis. Place the image.`,
        { span: 10, x: overX ? x : -x, y: overX ? -y : y },
      );
    },
  ],

  // ── 4.3 Rotations ──
  "math/geometry/unit-4/4.3": [
    (r) => {
      const x = r.nonzero(-7, 7);
      const y = r.nonzero(-7, 7);
      const turn = r.pick([90, 180, 270]);
      const image =
        turn === 90 ? { x: -y, y: x } : turn === 180 ? { x: -x, y: -y } : { x: y, y: -x };
      return point(
        `Rotate (${x}, ${y}) by ${turn}° anticlockwise about the origin. Place the image.`,
        { span: 10, x: image.x, y: image.y },
      );
    },
  ],

  // ── 4.4 Compositions of transformations ──
  "math/geometry/unit-4/4.4": [
    (r) => {
      const x = r.nonzero(-6, 6);
      const y = r.nonzero(-6, 6);
      const dx = r.nonzero(-3, 3);
      const dy = r.nonzero(-3, 3);
      return point(
        `Translate (${x}, ${y}) by ⟨${dx}, ${dy}⟩, then reflect the result in the x-axis. Place the image.`,
        { span: 10, x: x + dx, y: -(y + dy) },
      );
    },
  ],

  // ── 4.5 Symmetry ──
  "math/geometry/unit-4/4.5": [
    (r) => {
      const n = r.int(3, 12);
      return fill(
        `How many lines of symmetry does a regular ${n}-gon have?`,
        n,
        { hint: "One through every vertex or edge midpoint" },
      );
    },
  ],

  // ── 4.6 Dilations ──
  "math/geometry/unit-4/4.6": [
    (r) => {
      const k = r.int(2, 3);
      const x = r.nonzero(-4, 4);
      const y = r.nonzero(-3, 3);
      return point(
        `Dilate (${x}, ${y}) about the origin by a scale factor of ${k}. Place the image.`,
        { span: 12, x: k * x, y: k * y },
      );
    },
  ],

  // ── 4.7 Rigid motions ──
  "math/geometry/unit-4/4.7": [
    (r) => {
      const k = r.int(2, 6);
      return ask(
        "Which of these does NOT preserve distance?",
        `A dilation by a scale factor of ${k}`,
        [
          `A translation by ⟨${k}, ${r.int(1, 6)}⟩`,
          "A reflection in the y-axis",
          `A rotation of ${r.pick([90, 180, 270])}° about the origin`,
          "A reflection in the x-axis",
        ],
        r,
      );
    },
  ],

  // ── 4.8 Similarity transformations ──
  "math/geometry/unit-4/4.8": [
    (r) => {
      const k = r.int(2, 6);
      const side = r.int(3, 12);
      return fill(
        `A triangle with a side of ${side} is dilated by a scale factor of ${k}. How long is the matching side of the image?`,
        k * side,
        { hint: "Similar, not congruent" },
      );
    },
  ],

  // ── 5.3 Congruent figures and CPCTC ──
  "math/geometry/unit-5/5.3": [
    (r) => {
      const angle = r.int(25, 120);
      return ask(
        `△ABC ≅ △DEF, and ∠B = ${angle}°. Which angle must also be ${angle}°?`,
        "∠E",
        ["∠D", "∠F", "∠A", "∠C"],
        r,
      );
    },
  ],

  // ── 5.4 SSS and SAS ──
  "math/geometry/unit-5/5.4": [
    (r) => {
      const sas = r.bool();
      const a = r.int(3, 12);
      const b = r.int(3, 12);
      const angle = r.int(30, 120);
      return among(
        sas
          ? `Two triangles have sides ${a} and ${b} with the ${angle}° angle between them equal. Which criterion applies?`
          : `Two triangles have all three sides equal, ${a}, ${b} and ${a + b - r.int(1, 2)}. Which criterion applies?`,
        sas ? "SAS" : "SSS",
        ["SSS", "SAS", "ASA", "AAS"],
        r,
      );
    },
  ],

  // ── 5.5 ASA and AAS ──
  "math/geometry/unit-5/5.5": [
    (r) => {
      const asa = r.bool();
      const first = r.int(30, 70);
      const second = r.int(30, 70);
      const side = r.int(4, 15);
      return among(
        asa
          ? `Two triangles share angles of ${first}° and ${second}° with the side of ${side} between them. Which criterion applies?`
          : `Two triangles share angles of ${first}° and ${second}°, and a side of ${side} that is not between them. Which criterion applies?`,
        asa ? "ASA" : "AAS",
        ["ASA", "AAS", "SSS", "SAS"],
        r,
      );
    },
  ],

  // ── 5.6 HL for right triangles ──
  "math/geometry/unit-5/5.6": [
    (r) => {
      const leg = r.int(3, 12);
      const hyp = leg + r.int(2, 9);
      return among(
        `Two right triangles have hypotenuse ${hyp} and one leg ${leg}. Which criterion proves them congruent?`,
        "HL",
        ["HL", "SSA", "AAA", "ASA"],
        r,
      );
    },
  ],

  // ── 5.7 Isosceles and equilateral triangles ──
  "math/geometry/unit-5/5.7": [
    (r) => {
      const base = r.int(20, 80);
      return fill(
        `An isosceles triangle has an apex angle of ${180 - 2 * base}°. What is each base angle?`,
        base,
        { unit: "degrees", hint: "The two base angles are equal" },
      );
    },
  ],

  // ── 6.1 Bisectors ──
  "math/geometry/unit-6/6.1": [
    (r) => {
      const half = r.int(10, 70);
      return fill(
        `A ray bisects an angle of ${2 * half}°. What is each half?`,
        half,
        { unit: "degrees" },
      );
    },
  ],

  // ── 6.2 Circumcenter and incenter ──
  "math/geometry/unit-6/6.2": [
    (r) => {
      const circum = r.bool();
      const n = r.int(3, 9);
      return among(
        circum
          ? `A circle of radius ${n} passes through all three vertices of a triangle. Which point is its centre?`
          : `A circle of radius ${n} touches all three sides of a triangle. Which point is its centre?`,
        circum ? "The circumcenter" : "The incenter",
        ["The circumcenter", "The incenter", "The centroid", "The orthocenter"],
        r,
      );
    },
  ],

  // ── 6.3 Medians and the centroid ──
  "math/geometry/unit-6/6.3": [
    (r) => {
      const third = r.int(2, 9);
      const median = 3 * third;
      return fill(
        `A median is ${median} long. How far is the centroid from the vertex it starts at?`,
        2 * third,
        { hint: "The centroid cuts a median two to one" },
      );
    },
  ],

  // ── 6.4 Altitudes and the orthocenter ──
  "math/geometry/unit-6/6.4": [
    (r) => {
      const base = r.int(4, 20);
      const height = r.int(3, 18);
      return among(
        `An altitude of ${height} is drawn to a side of ${base}. Where do all three altitudes meet?`,
        "At the orthocenter",
        [
          "At the orthocenter",
          "At the centroid",
          "At the incenter",
          "At the circumcenter",
        ],
        r,
      );
    },
  ],

  // ── 6.7 Inequalities in a triangle ──
  "math/geometry/unit-6/6.7": [
    (r) => {
      const small = r.int(20, 40);
      const middle = r.int(41, 60);
      const angles = [small, middle, 180 - small - middle];
      return ask(
        `A triangle has angles ${angles[0]}°, ${angles[1]}° and ${angles[2]}°. Which side is longest?`,
        `The side opposite the ${Math.max(...angles)}° angle`,
        [
          `The side opposite the ${Math.min(...angles)}° angle`,
          `The side opposite the ${angles[1]}° angle`,
          "All three are equal",
          "The side between the two smaller angles",
        ],
        r,
      );
    },
  ],

  // ── 7.1 Ratios and proportions ──
  "math/geometry/unit-7/7.1": [
    (r) => {
      const k = r.int(2, 9);
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return fill(
        `Solve the proportion:   ${a}/${b} = x/${b * k}`,
        a * k,
        { hint: "Cross multiply" },
      );
    },
  ],

  // ── 7.3 Similarity criteria ──
  "math/geometry/unit-7/7.3": [
    (r) => {
      const first = r.int(30, 80);
      const second = r.int(30, 80);
      return among(
        `Two triangles each have angles of ${first}° and ${second}°. Which criterion makes them similar?`,
        "AA",
        ["AA", "SSS similarity", "SAS similarity", "HL"],
        r,
      );
    },
  ],

  // ── 7.4 The triangle proportionality theorem ──
  "math/geometry/unit-7/7.4": [
    (r) => {
      const k = r.int(2, 6);
      const a = r.int(2, 9);
      const c = r.int(2, 9);
      return fill(
        `A line parallel to one side of a triangle cuts the other two. It splits one into ${a} and ${a * k}. If it splits the other into ${c} and x, what is x?`,
        c * k,
        { hint: "The two sides are cut in the same ratio" },
      );
    },
  ],

  // ── 7.5 Proportional segments ──
  "math/geometry/unit-7/7.5": [
    (r) => {
      const k = r.int(2, 5);
      const short = r.int(3, 12);
      return fill(
        `Three parallel lines cut one transversal into ${short} and ${short * k}. They cut a second transversal into x and ${short * k * 2}. What is x?`,
        short * 2,
        { hint: "Same ratio on both transversals" },
      );
    },
  ],

  // ── 7.6 The geometric mean ──
  "math/geometry/unit-7/7.6": [
    (r) => {
      const p = r.int(1, 6);
      const q = r.int(2, 8);
      const a = p * p;
      const b = q * q;
      return fill(
        `The altitude to the hypotenuse of a right triangle splits it into ${a} and ${b}. How long is the altitude?`,
        p * q,
        { hint: "The altitude is the geometric mean of the two pieces" },
      );
    },
  ],

  // ── 8.5 Solving a right triangle ──
  "math/geometry/unit-8/8.5": [
    (r) => {
      const first = r.int(20, 69);
      return fill(
        `A right triangle has an acute angle of ${first}°. What is the other acute angle?`,
        90 - first,
        { unit: "degrees", hint: "The three angles still add to 180°" },
      );
    },
  ],

  // ── 8.6 Inverse trigonometric ratios ──
  "math/geometry/unit-8/8.6": [
    (r) => {
      const cases = [
        { ratio: "sin", value: "1/2", angle: 30 },
        { ratio: "sin", value: "√2/2", angle: 45 },
        { ratio: "sin", value: "√3/2", angle: 60 },
        { ratio: "cos", value: "1/2", angle: 60 },
        { ratio: "cos", value: "√3/2", angle: 30 },
        { ratio: "tan", value: "1", angle: 45 },
        { ratio: "tan", value: "√3", angle: 60 },
      ];
      const c = r.pick(cases);
      return fill(
        `In a right triangle, ${c.ratio} θ = ${c.value}. What is θ?`,
        `${c.angle}°`,
        { hint: "in degrees" },
      );
    },
  ],

  // ── 8.7 Angles of elevation and depression ──
  "math/geometry/unit-8/8.7": [
    (r) => {
      const distance = r.int(5, 60);
      return fill(
        `From ${distance} m away, the angle of elevation to the top of a tower is 45°. How tall is the tower?`,
        distance,
        { unit: "m", hint: "tan 45° = 1" },
      );
    },
  ],

  // ── 8.8 The Law of Sines ──
  "math/geometry/unit-8/8.8": [
    (r) => {
      const side = r.int(4, 30);
      // A 30–90 pair: sin 90° = 1 and sin 30° = 1/2, so the answer is whole
      // and the law is what produces it rather than a calculator.
      return fill(
        `In a triangle, the side opposite the 90° angle is ${2 * side}. How long is the side opposite the 30° angle?`,
        side,
        { hint: "a / sin A is the same for every side" },
      );
    },
  ],

  // ── 8.9 The Law of Cosines ──
  "math/geometry/unit-8/8.9": [
    (r) => {
      const a = r.int(3, 12);
      const b = r.int(3, 12);
      // cos 90° = 0, so the law collapses to Pythagoras — which is the point
      // worth making, and it keeps the root whole.
      const c2 = a * a + b * b;
      const c = Math.sqrt(c2);
      const whole = Number.isInteger(c);
      return fill(
        `Two sides of ${a} and ${b} meet at 90°. Use the Law of Cosines: how long is the third side?`,
        whole ? c : Number(c.toFixed(2)),
        { hint: "cos 90° = 0" },
      );
    },
  ],

  // ── 8.10 Area from two sides and the angle between ──
  "math/geometry/unit-8/8.10": [
    (r) => {
      const a = r.int(1, 6) * 4;
      const b = r.int(2, 12);
      const angle = r.pick([30, 90, 150]);
      const factor = angle === 90 ? 1 : 0.5;
      return fill(
        `Two sides of ${a} and ${b} meet at ${angle}°. What is the area of the triangle?`,
        (a * b * factor) / 2,
        { hint: "Half of ab sin C" },
      );
    },
  ],

  // ── 9.2 Parallelograms ──
  "math/geometry/unit-9/9.2": [
    (r) => {
      const angle = r.int(30, 150);
      const opposite = r.bool();
      return fill(
        `One angle of a parallelogram is ${angle}°. What is the ${opposite ? "opposite" : "adjacent"} angle?`,
        opposite ? angle : 180 - angle,
        { unit: "degrees" },
      );
    },
  ],

  // ── 9.4 Rectangles, rhombuses and squares ──
  "math/geometry/unit-9/9.4": [
    (r) => {
      const side = r.int(3, 15);
      const rhombus = r.bool();
      return among(
        rhombus
          ? `A parallelogram has all four sides ${side} but no right angle. What is it?`
          : `A parallelogram has four right angles and sides of ${side} and ${side + r.int(1, 9)}. What is it?`,
        rhombus ? "A rhombus" : "A rectangle",
        ["A rhombus", "A rectangle", "A square", "A trapezoid"],
        r,
      );
    },
  ],

  // ── 9.5 Trapezoids and kites ──
  "math/geometry/unit-9/9.5": [
    (r) => {
      const a = r.int(2, 20);
      const b = a + 2 * r.int(1, 10);
      return fill(
        `A trapezoid has parallel sides of ${a} and ${b}. How long is its midsegment?`,
        (a + b) / 2,
        { hint: "Halfway between the two bases" },
      );
    },
  ],

  // ── 9.7 The quadrilateral hierarchy ──
  "math/geometry/unit-9/9.7": [
    (r) => {
      const side = r.int(2, 14);
      return ask(
        `A square has sides of ${side}. Which statement is true?`,
        "Every square is a rhombus and a rectangle",
        [
          "Every rhombus is a square",
          "Every rectangle is a square",
          "A square is not a parallelogram",
          "Every trapezoid is a parallelogram",
        ],
        r,
      );
    },
  ],

  // ── 10.1 Parts of a circle ──
  "math/geometry/unit-10/10.1": [
    (r) => {
      const radius = r.int(2, 30);
      return fill(
        `A circle has radius ${radius}. What is its diameter?`,
        2 * radius,
        { hint: "a number" },
      );
    },
  ],

  // ── 10.2 Tangent lines ──
  "math/geometry/unit-10/10.2": [
    (r) => {
      const triples: [number, number, number][] = [
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
      ];
      const [radius, tangent, distance] = r.pick(triples);
      return fill(
        `A tangent of length ${tangent} touches a circle of radius ${radius}. How far is the external point from the centre?`,
        distance,
        { hint: "A tangent meets the radius at a right angle" },
      );
    },
  ],

  // ── 10.4 Arc length ──
  "math/geometry/unit-10/10.4": [
    (r) => {
      const radius = r.int(2, 18);
      const degrees = r.pick([30, 45, 60, 90, 120, 180]);
      return ask(
        `What is the length of a ${degrees}° arc on a circle of radius ${radius}?`,
        piFrac(degrees * 2 * radius, 360),
        [
          piFrac(degrees * radius, 360),
          piFrac(degrees * radius * radius, 360),
          piFrac(degrees * 4 * radius, 360),
          `${2 * radius}π`,
          `${degrees}π`,
        ],
        r,
      );
    },
  ],

  // ── 10.5 Chords ──
  "math/geometry/unit-10/10.5": [
    (r) => {
      const p = r.int(2, 9);
      const q = r.int(2, 9);
      const k = r.int(2, 6);
      return fill(
        `Two chords cross. One is cut into ${p} and ${q * k}; the other into ${q} and x. What is x?`,
        p * k,
        { hint: "The two products are equal" },
      );
    },
  ],

  // ── 10.6 Inscribed angles ──
  "math/geometry/unit-10/10.6": [
    (r) => {
      const inscribed = r.int(10, 88);
      return fill(
        `An inscribed angle measures ${inscribed}°. What is the arc it opens onto?`,
        2 * inscribed,
        { unit: "degrees", hint: "An inscribed angle is half its arc" },
      );
    },
  ],

  // ── 10.7 Secants and tangents ──
  "math/geometry/unit-10/10.7": [
    (r) => {
      const far = r.int(20, 80) * 2;
      const near = r.int(4, 18) * 2;
      return fill(
        `Two secants meet outside a circle, cutting off arcs of ${far}° and ${near}°. What is the angle between them?`,
        (far - near) / 2,
        { unit: "degrees", hint: "Half the difference of the arcs" },
      );
    },
  ],

  // ── 10.8 Segment lengths in circles ──
  "math/geometry/unit-10/10.8": [
    (r) => {
      const p = r.int(2, 9);
      const q = r.int(2, 9);
      const k = r.int(2, 6);
      // p · qk = q · pk, so the missing whole length is whole by construction.
      return fill(
        `Two secants leave one point. The first has outer piece ${p} and whole length ${q * k}; the second has outer piece ${q} and whole length x. What is x?`,
        p * k,
        { hint: "Outer times whole is the same for both" },
      );
    },
  ],

  // ── 11.1 Areas of triangles and quadrilaterals ──
  "math/geometry/unit-11/11.1": [
    (r) => {
      const base = r.int(2, 20) * 2;
      const height = r.int(2, 18);
      return fill(
        `A triangle has base ${base} and height ${height}. What is its area?`,
        (base * height) / 2,
        { hint: "a number" },
      );
    },
  ],

  // ── 11.2 Regular polygons and the apothem ──
  "math/geometry/unit-11/11.2": [
    (r) => {
      const n = r.int(3, 12);
      const side = r.int(2, 12);
      const apothem = r.int(2, 12) * 2;
      return fill(
        `A regular ${n}-gon has side ${side} and apothem ${apothem}. What is its area?`,
        (n * side * apothem) / 2,
        { hint: "Half the apothem times the perimeter" },
      );
    },
  ],

  // ── 11.3 Composite figures ──
  "math/geometry/unit-11/11.3": [
    (r) => {
      const w = r.int(6, 20);
      const h = r.int(6, 20);
      const cut = r.int(2, 5);
      return fill(
        `A ${w} by ${h} rectangle has a ${cut} by ${cut} square cut out of one corner. What area is left?`,
        w * h - cut * cut,
        { hint: "Whole minus hole" },
      );
    },
  ],

  // ── 11.4 Cross sections ──
  "math/geometry/unit-11/11.4": [
    (r) => {
      const radius = r.int(2, 12);
      const cylinder = r.bool();
      return among(
        cylinder
          ? `A cylinder of radius ${radius} is sliced parallel to its base. What shape is the cross section?`
          : `A cylinder of radius ${radius} is sliced straight down through its axis. What shape is the cross section?`,
        cylinder ? "A circle" : "A rectangle",
        ["A circle", "A rectangle", "A triangle", "An ellipse"],
        r,
      );
    },
  ],

  // ── 11.5 Surface area of prisms and cylinders ──
  "math/geometry/unit-11/11.5": [
    (r) => {
      const a = r.int(2, 10);
      const b = r.int(2, 10);
      const c = r.int(2, 10);
      return fill(
        `What is the surface area of a ${a} by ${b} by ${c} box?`,
        2 * (a * b + b * c + a * c),
        { hint: "a number" },
      );
    },
  ],

  // ── 11.6 Surface area of pyramids and cones ──
  "math/geometry/unit-11/11.6": [
    (r) => {
      const radius = r.int(2, 12);
      const slant = radius + r.int(1, 12);
      return ask(
        `A cone has radius ${radius} and slant height ${slant}. What is its total surface area?`,
        `${radius * slant + radius * radius}π`,
        [
          `${radius * slant}π`,
          `${radius * radius}π`,
          `${2 * radius * slant}π`,
          `${radius * slant + 2 * radius * radius}π`,
          `${radius + slant}π`,
        ],
        r,
      );
    },
  ],

  // ── 11.10 Cavalieri's principle ──
  "math/geometry/unit-11/11.10": [
    (r) => {
      const height = r.int(4, 20);
      const area = r.int(4, 30);
      return ask(
        `Two solids of height ${height} have the same cross-sectional area of ${area} at every level. What follows?`,
        "They have equal volumes",
        [
          "They have equal surface areas",
          "They are congruent",
          "They are similar",
          "Nothing follows without their shapes",
        ],
        r,
      );
    },
  ],

  // ── 11.12 Density and modelling ──
  "math/geometry/unit-11/11.12": [
    (r) => {
      const volume = r.int(2, 40);
      const density = r.int(2, 12);
      return fill(
        `A block of volume ${volume} cm³ has density ${density} g/cm³. What is its mass?`,
        volume * density,
        { unit: "g", hint: "Density times volume" },
      );
    },
  ],

  // ── 12.1 The counting principle ──
  "math/geometry/unit-12/12.1": [
    (r) => {
      const shirts = r.int(2, 9);
      const trousers = r.int(2, 9);
      const shoes = r.int(2, 5);
      return fill(
        `${shirts} shirts, ${trousers} pairs of trousers and ${shoes} pairs of shoes. How many outfits?`,
        shirts * trousers * shoes,
        { hint: "a number" },
      );
    },
  ],

  // ── 12.3 Theoretical and experimental probability ──
  "math/geometry/unit-12/12.3": [
    (r) => {
      const trials = r.int(2, 20) * 10;
      const hits = r.int(1, 9) * (trials / 10);
      return fill(
        `A coin lands heads ${hits} times in ${trials} throws. What is the experimental probability of heads?`,
        frac(hits, trials),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 12.4 Geometric probability ──
  "math/geometry/unit-12/12.4": [
    (r) => {
      const side = r.int(4, 12);
      const inner = r.int(1, side - 1);
      return fill(
        `A dart lands at random on a ${side} by ${side} board. What is the chance it lands in a ${inner} by ${inner} square drawn on it?`,
        frac(inner * inner, side * side),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 12.6 Conditional probability ──
  "math/geometry/unit-12/12.6": [
    (r) => {
      const both = r.int(2, 12);
      const firstOnly = r.int(2, 12);
      return fill(
        `${both + firstOnly} students play football, and ${both} of those also play chess. Given a student plays football, what is the chance they play chess?`,
        frac(both, both + firstOnly),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 12.7 Two-way tables and Venn diagrams ──
  "math/geometry/unit-12/12.7": [
    (r) => {
      const onlyA = r.int(2, 20);
      const onlyB = r.int(2, 20);
      const both = r.int(2, 12);
      const neither = r.int(1, 15);
      const total = onlyA + onlyB + both + neither;
      return fill(
        `Of ${total} people, ${onlyA} like tea only, ${onlyB} coffee only, ${both} like both and ${neither} like neither. How many like tea?`,
        onlyA + both,
        { hint: "a number" },
      );
    },
  ],
};
