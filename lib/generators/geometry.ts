import "server-only";

import {
  among,
  ask,
  fill,
  frac,
  nearMisses,
  piFrac,
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
      return ask(
        `B lies between A and C. If AB = ${ab} and BC = ${bc}, what is AC?`,
        ab + bc,
        [Math.abs(ab - bc), ab * bc, frac(ab + bc, 2), ab, bc],
        r,
      );
    },
  ],

  // ── 1.4 Angle pair relationships ──
  "math/geometry/unit-1/1.4": [
    (r) => {
      const angle = r.int(15, 75);
      const complement = r.bool();
      return ask(
        `What is the measure of the ${complement ? "complement" : "supplement"} of a ${angle}° angle?`,
        `${complement ? 90 - angle : 180 - angle}°`,
        [
          `${complement ? 180 - angle : 90 - angle}°`, // did the other one
          `${angle}°`,
          `${90 + angle}°`,
          `${360 - angle}°`,
          `${2 * angle}°`,
        ],
        r,
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
    // Midpoint. Kept on odd sums half the time so halving is a real step.
    (r) => {
      const x1 = r.int(-9, 9);
      const x2 = r.int(-9, 9);
      const y1 = r.int(-9, 9);
      let y2 = r.int(-9, 9);
      while (x1 === x2 && y1 === y2) y2 = r.int(-9, 9);
      const mid = `(${frac(x1 + x2, 2)}, ${frac(y1 + y2, 2)})`;
      return ask(
        `What is the midpoint of the segment from (${x1}, ${y1}) to (${x2}, ${y2})?`,
        mid,
        [
          `(${frac(x2 - x1, 2)}, ${frac(y2 - y1, 2)})`, // halved the difference
          `(${x1 + x2}, ${y1 + y2})`, // never halved
          `(${frac(x1 + y1, 2)}, ${frac(x2 + y2, 2)})`, // paired the wrong coordinates
          `(${x2 - x1}, ${y2 - y1})`,
          `(${frac(y1 + y2, 2)}, ${frac(x1 + x2, 2)})`,
          `(${x1}, ${y1})`, // an endpoint
          `(${x2}, ${y2})`,
          `(${x2}, ${y1})`, // coordinates paired across the points
        ],
        r,
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
      const c = Math.round(Math.sqrt(a * a + b * b));
      return ask(
        `What is the distance from (${x1}, ${y1}) to (${x1 + a}, ${y1 + b})?`,
        c,
        [a + b, Math.abs(b - a), a * b, c * c, frac(a + b, 2)],
        r,
      );
    },
  ],

  // ── 5.1 Triangle classification and the angle sum theorem ──
  "math/geometry/unit-5/5.1": [
    (r) => {
      const first = r.int(20, 90);
      const second = r.int(20, 150 - first);
      const third = 180 - first - second;
      return ask(
        `Two angles of a triangle measure ${first}° and ${second}°. What is the third?`,
        `${third}°`,
        [
          `${360 - first - second}°`, // used 360 instead of 180
          `${first + second}°`,
          `${180 - first}°`,
          `${90 - Math.min(first, second)}°`,
          `${third + 10}°`,
        ],
        r,
      );
    },
  ],

  // ── 5.2 The exterior angle theorem ──
  "math/geometry/unit-5/5.2": [
    (r) => {
      const a = r.int(25, 80);
      const b = r.int(25, 80);
      return ask(
        `Two remote interior angles of a triangle measure ${a}° and ${b}°. What is the exterior angle at the third vertex?`,
        `${a + b}°`,
        [
          `${180 - a - b}°`, // gave the third interior angle
          `${180 - a}°`,
          `${180 - b}°`,
          `${Math.abs(a - b)}°`,
          `${360 - a - b}°`,
        ],
        r,
      );
    },
  ],

  // ── 6.5 The midsegment theorem ──
  "math/geometry/unit-6/6.5": [
    (r) => {
      const base = r.int(6, 40) * 2;
      return ask(
        `The midsegment of a triangle is parallel to a side of length ${base}. How long is the midsegment?`,
        base / 2,
        [base, base * 2, frac(base, 3), frac(base, 4), base - 2],
        r,
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
      return ask(
        `Two similar figures have a scale factor of ${k}. If a side of the smaller is ${side}, what is the matching side of the larger?`,
        side * k,
        [frac(side, k), side + k, side * k * k, side, side * (k + 1)],
        r,
      );
    },
  ],

  // ── 7.7 Perimeter and area ratios of similar figures ──
  "math/geometry/unit-7/7.7": [
    (r) => {
      const a = r.int(2, 7);
      let b = r.int(2, 9);
      while (b === a) b = r.int(2, 9);
      return ask(
        `Two similar figures have sides in the ratio ${a}:${b}. What is the ratio of their areas?`,
        `${a * a}:${b * b}`,
        [
          `${a}:${b}`, // never squared
          `${2 * a}:${2 * b}`, // doubled instead of squaring
          `${a ** 3}:${b ** 3}`, // cubed, which is the volume ratio
          `${b * b}:${a * a}`,
          `${a + a}:${b + b}`,
        ],
        r,
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
      return ask(
        `A right triangle has legs ${legs[0]} and ${legs[1]}. How long is the hypotenuse?`,
        c,
        [
          legs[0] + legs[1], // added the legs
          Math.abs(legs[1] - legs[0]),
          c * c,
          Math.round(Math.sqrt(Math.abs(legs[1] ** 2 - legs[0] ** 2))), // solved for a leg
          c + 1,
        ],
        r,
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
      return ask(
        `A right triangle has legs ${a} and ${b} and hypotenuse ${c}. If θ is opposite the leg of length ${a}, what is ${ratio} θ?`,
        correct,
        [frac(a, c), frac(b, c), frac(a, b), frac(b, a), frac(c, a), frac(c, b)],
        r,
      );
    },
  ],

  // ── 9.1 Polygon interior and exterior angle sums ──
  "math/geometry/unit-9/9.1": [
    (r) => {
      const n = r.int(5, 14);
      const wantInterior = r.bool();
      return ask(
        wantInterior
          ? `What is the sum of the interior angles of a ${n}-gon?`
          : `What is the measure of one exterior angle of a regular ${n}-gon?`,
        wantInterior ? `${180 * (n - 2)}°` : `${frac(360, n)}°`,
        wantInterior
          ? [`${180 * n}°`, `${360 * (n - 2)}°`, `${frac(180 * (n - 2), n)}°`, `360°`, `${180 * (n - 1)}°`]
          : [`${frac(180 * (n - 2), n)}°`, `${frac(360, n - 2)}°`, `${360 / 2}°`, `${180 * (n - 2)}°`, `${frac(180, n)}°`],
        r,
      );
    },
  ],

  // ── 10.3 Arcs and central angles ──
  "math/geometry/unit-10/10.3": [
    (r) => {
      const central = r.int(20, 160);
      const inscribed = r.bool();
      return ask(
        inscribed
          ? `An inscribed angle subtends an arc of ${2 * central}°. What is the inscribed angle?`
          : `A central angle measures ${central}°. What is the measure of its intercepted arc?`,
        `${central}°`,
        [
          `${2 * central}°`, // doubled rather than halved, or vice versa
          `${frac(central, 2)}°`,
          `${180 - central}°`,
          `${360 - central}°`,
          `${90 - central}°`,
        ],
        r,
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
    (r) => {
      const radius = r.int(2, 9);
      const height = r.int(3, 15);
      if (r.bool()) {
        return ask(
          `What is the volume of a cylinder with radius ${radius} and height ${height}, in terms of π?`,
          `${radius * radius * height}π`,
          [
            `${radius * height}π`, // radius not squared
            `${2 * radius * height}π`, // lateral surface area
            piFrac(radius * radius * height, 3), // the cone formula
            `${radius * radius}π`,
            `${2 * radius * radius * height}π`,
          ],
          r,
        );
      }
      const w = r.int(2, 12);
      const l = r.int(2, 12);
      return ask(
        `What is the volume of a rectangular prism ${l} by ${w} by ${height}?`,
        l * w * height,
        [
          2 * (l * w + l * height + w * height), // surface area
          l + w + height,
          l * w,
          frac(l * w * height, 3),
          ...nearMisses(l * w * height),
        ],
        r,
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
      return ask(
        `Two similar solids have corresponding edges in the ratio 1:${k}. What is the ratio of their ${wantVolume ? "volumes" : "surface areas"}?`,
        wantVolume ? `1:${k ** 3}` : `1:${k * k}`,
        [
          wantVolume ? `1:${k * k}` : `1:${k ** 3}`, // used the other power
          `1:${k}`, // never raised it at all
          `1:${3 * k}`,
          `1:${2 * k}`,
          `1:${k ** 4}`,
        ],
        r,
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
      return ask(
        ordered
          ? `In how many ways can ${k} of ${n} people be arranged in order?`
          : `In how many ways can ${k} of ${n} people be chosen, when order does not matter?`,
        ordered ? p : c,
        [
          ordered ? c : p, // used the other one
          n ** k,
          n * k,
          factorial(n) / factorial(k),
          p + c,
        ],
        r,
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
      return ask(
        `A bag holds ${red} red and ${blue} blue marbles. Two are drawn ${withReplacement ? "with" : "without"} replacement. What is the probability both are red?`,
        correct,
        [
          withReplacement
            ? frac(red * (red - 1), total * (total - 1))
            : frac(red * red, total * total), // ignored the replacement rule
          frac(red, total), // only one draw
          frac(2 * red, total),
          frac(red * red, total),
          frac(red + red, total + total),
        ],
        r,
      );
    },
  ],
};
