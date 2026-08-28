import "server-only";

import {
  among,
  ask,
  dot,
  fill,
  frac,
  graph,
  line,
  order,
  piFrac,
  plot,
  point,
  radical,
  signed,
  slider,
  type Built,
  type Rng,
} from "./kit";

/**
 * Geometry generators.
 *
 * Geometry resists generation more than the algebra courses do: much of it is
 * proof, construction, and classification, none of which reduce to numbers a
 * generator can roll. Most of this file is the computational spine — segments,
 * angles, triangles, circles, solids.
 *
 * The rest is asked in the shape it actually has. A proof is a sequence, so it
 * is asked as one, with the `order` kind and the tables above the record; that
 * is the honest form for a two-column proof, a construction, and an indirect
 * argument alike, and it is what those subunits were waiting for. What is left
 * on four options is the handful of subunits where naming the criterion really
 * is the skill — SSS against SAS, a rhombus against a rectangle — and there
 * the options are the question rather than a way of dodging it.
 */

/**
 * The cases the proof and construction generators roll over.
 *
 * These sit outside the generator record because a generator picks one of them
 * per seed and offers the rest as the wrong answers — the list is both the
 * question bank and the distractor pool, which is only safe while every entry
 * is genuinely distinct from every other. Adding a near-duplicate here would
 * put two correct answers on the board, so keep them separated by meaning.
 */

/** Compass constructions: what the steps make, and why they make it. */
const CONSTRUCTIONS = [
  {
    name: "a perpendicular bisector",
    steps: "equal arcs from each end of a segment, crossing above and below it, and the crossings joined",
    makes: "The perpendicular bisector of the segment",
    why: "Both crossings are equidistant from the two endpoints",
  },
  {
    name: "an angle bisector",
    steps: "an arc across both sides of an angle, then equal arcs from where it cut them, joined back to the vertex",
    makes: "The bisector of the angle",
    why: "The two triangles the arcs make are congruent by SSS",
  },
  {
    name: "a copied angle",
    steps: "an arc across an angle, the same arc drawn from a point on a fresh ray, and the opening between the cuts carried over",
    makes: "A copy of the angle on the new ray",
    why: "Carrying the opening across makes the two arcs' chords equal",
  },
  {
    name: "a copied segment",
    steps: "the compass opened to a segment and that opening struck once from a point on a fresh ray",
    makes: "A copy of the segment on the new ray",
    why: "The compass opening is the length, and it never changed",
  },
  {
    name: "an equilateral triangle",
    steps: "an arc of the segment's own length from each of its endpoints, meeting above it",
    makes: "An equilateral triangle on the segment",
    why: "Every arc was drawn at the same radius, so all three sides match",
  },
];

/** Lines of a two-column proof, and the reason each one is entitled to. */
const PROOF_STEPS = [
  { line: "AB = AB", reason: "Reflexive Property" },
  { line: "If AB = CD then CD = AB", reason: "Symmetric Property" },
  { line: "AB = CD and CD = EF, so AB = EF", reason: "Transitive Property" },
  { line: "B lies between A and C, so AB + BC = AC", reason: "Segment Addition Postulate" },
  { line: "D lies inside ∠ABC, so m∠ABD + m∠DBC = m∠ABC", reason: "Angle Addition Postulate" },
  { line: "2x + 4 = 10, so 2x = 6", reason: "Subtraction Property of Equality" },
  { line: "2x = 6, so x = 3", reason: "Division Property of Equality" },
  { line: "∠1 and ∠3 are vertical, so ∠1 ≅ ∠3", reason: "Vertical Angles Theorem" },
  { line: "M is the midpoint of AB, so AM = MB", reason: "Definition of a midpoint" },
];

/** What a paragraph proof is and is not. */
const PARAGRAPH = [
  {
    prompt: "What makes a paragraph proof a proof rather than a description?",
    answer: "Every claim in it is followed by the reason it holds",
    wrong: [
      "It is written in complete sentences",
      "It refers to a labelled diagram",
      "It states the conclusion first",
      "It avoids symbols entirely",
      "It is shorter than a two-column proof",
    ],
  },
  {
    prompt: "A paragraph proof and a two-column proof of the same theorem differ in what?",
    answer: "Only the way they are laid out",
    wrong: [
      "The theorems they are able to prove",
      "Whether reasons have to be given",
      "Whether the given may be used",
      "How many steps they are allowed",
      "Whether a diagram is required",
    ],
  },
  {
    prompt: "Where does the given information belong in a paragraph proof?",
    answer: "Stated at the start, before anything is deduced from it",
    wrong: [
      "In the final sentence, as the conclusion",
      "Left out, since it is already known",
      "Only in the diagram",
      "Wherever it is first needed, unannounced",
      "In a separate paragraph after the proof",
    ],
  },
];

/** What a flowchart proof puts in its boxes and on its arrows. */
const FLOWCHART = [
  {
    prompt: "In a flowchart proof, what goes inside a box?",
    answer: "A statement, with its reason written underneath",
    wrong: [
      "A reason on its own",
      "A question to be answered next",
      "One term of the diagram",
      "A statement, with the reason on the arrow",
      "The given, and nothing else",
    ],
  },
  {
    prompt: "In a flowchart proof, what does an arrow mean?",
    answer: "The box it points to follows from the box it leaves",
    wrong: [
      "The two boxes say the same thing",
      "The boxes may be read in either order",
      "The box it points to contradicts the other",
      "The boxes belong to different proofs",
      "One box restates the diagram",
    ],
  },
  {
    prompt: "Why can a flowchart proof have two arrows meeting at one box?",
    answer: "Because a step may need two earlier statements together",
    wrong: [
      "Because the proof branches into two cases",
      "Because the step could be reached either way",
      "Because the diagram has two parts",
      "Because one arrow is the given and one the conclusion",
      "Because the proof is being read backwards",
    ],
  },
];

/** Segment and angle theorems, given the situation that calls for each. */
const ANGLE_THEOREMS = [
  {
    given: "∠1 and ∠2 are supplementary, and so are ∠3 and ∠2.",
    theorem: "Congruent Supplements Theorem",
  },
  {
    given: "∠1 and ∠2 are complementary, and so are ∠3 and ∠2.",
    theorem: "Congruent Complements Theorem",
  },
  {
    given: "∠1 and ∠3 are formed by two intersecting lines and are not adjacent.",
    theorem: "Vertical Angles Theorem",
  },
  {
    given: "∠1 and ∠2 are both right angles.",
    theorem: "Right Angle Congruence Theorem",
  },
  {
    given: "∠1 and ∠2 sit on a line and share a side.",
    theorem: "Linear Pair Postulate",
  },
  {
    given: "M is the midpoint of AB, and a proof needs AM = MB.",
    theorem: "Midpoint Theorem",
  },
];

/**
 * What an indirect proof assumes, which is always the exact negation.
 *
 * Each claim carries its own wrong answers rather than borrowing another
 * claim's, because the mistake worth catching is the boundary: negating "at
 * most one" to "exactly two", or "longest" to "shortest", leaves a case the
 * proof never covers. A distractor lifted from a different claim is eliminated
 * by reading alone and teaches nothing.
 */
const INDIRECT = [
  {
    claim: "the triangle has at most one right angle",
    assume: "That it has two or more right angles",
    wrong: [
      "That it has exactly two right angles",
      "That it has exactly one right angle",
      "That it has no right angles",
      "That it has at most two right angles",
      "That it has three right angles",
    ],
  },
  {
    claim: "the two lines are parallel",
    assume: "That the two lines meet at some point",
    wrong: [
      "That the two lines are perpendicular",
      "That the two lines meet at exactly two points",
      "That the two lines are the same line",
      "That the two lines are parallel",
      "That the two lines never meet",
    ],
  },
  {
    claim: "n is even",
    assume: "That n is odd",
    wrong: [
      "That n is prime",
      "That n is negative",
      "That n is even",
      "That n is zero",
      "That n is not an integer",
    ],
  },
  {
    claim: "AB is the longest side",
    assume: "That some other side is at least as long as AB",
    wrong: [
      "That some other side is strictly longer than AB",
      "That AB is the shortest side",
      "That every other side is shorter than AB",
      "That all three sides are equal",
      "That AB is longer than exactly one other side",
    ],
  },
  {
    claim: "the point lies outside the circle",
    assume: "That the point lies on or inside the circle",
    wrong: [
      "That the point lies strictly inside the circle",
      "That the point lies on the circle",
      "That the point is the centre",
      "That the point lies outside the circle",
      "That the point is not in the plane",
    ],
  },
];

/**
 * Conditions on a quadrilateral, and whether each one is enough.
 *
 * The two that are not enough are the point of the subunit: one pair of
 * parallel sides is a trapezoid, and one pair of congruent sides with one pair
 * parallel can be an isosceles trapezoid, so both are a step short.
 */
const PARALLELOGRAM_TESTS = [
  {
    given: "both pairs of opposite sides are congruent.",
    verdict: "Yes — congruent opposite sides force it",
  },
  {
    given: "both pairs of opposite angles are congruent.",
    verdict: "Yes — congruent opposite angles force it",
  },
  {
    given: "the diagonals bisect each other.",
    verdict: "Yes — bisecting diagonals force it",
  },
  {
    given: "one pair of sides is both parallel and congruent.",
    verdict: "Yes — one pair that is both is enough",
  },
  {
    given: "one pair of opposite sides is parallel.",
    verdict: "No — that describes any trapezoid",
  },
  {
    given: "one pair of opposite sides is congruent and the other pair is parallel.",
    verdict: "No — an isosceles trapezoid does that too",
  },
];

/**
 * The sequences the ordering questions are built from.
 *
 * Each one has to be genuinely determined end to end — if two steps could be
 * carried out in either order, the question has two right answers and marks one
 * of them wrong. That is the whole authoring rule here, and it is why the
 * proofs below fold "given" statements into a single line rather than listing
 * them separately: two lines both reading "(Given)" are interchangeable, and a
 * student who spots that is right to.
 */

/** Compass constructions, step by step. */
const CONSTRUCTION_STEPS = [
  {
    name: "the perpendicular bisector of a segment",
    sequence: [
      "Open the compass to more than half the segment",
      "Draw an arc from one endpoint, reaching above and below the segment",
      "Draw an arc of the same radius from the other endpoint",
      "Join the two points where the arcs cross",
    ],
  },
  {
    name: "the bisector of an angle",
    sequence: [
      "Draw an arc from the vertex, cutting both sides of the angle",
      "From each cut, draw an arc of equal radius inside the angle",
      "Mark the point where those two arcs cross",
      "Draw the ray from the vertex through that point",
    ],
  },
  {
    name: "a copy of an angle",
    sequence: [
      "Draw a ray to carry the copy",
      "Draw one arc across the original angle, and the same arc from the new ray",
      "Open the compass to the gap between the original arc and the two sides",
      "Strike that gap from where the new arc meets the ray, and join it to the endpoint",
    ],
  },
  {
    name: "an equilateral triangle on a segment",
    sequence: [
      "Open the compass to the full length of the segment",
      "Draw an arc from one endpoint",
      "Draw an arc of the same radius from the other endpoint",
      "Join both endpoints to the point where the arcs meet",
    ],
  },
];

/** The two constructions that make a right angle or a parallel. */
const LINE_CONSTRUCTIONS = [
  {
    name: "a perpendicular from a point down to a line",
    sequence: [
      "From the point, draw an arc that cuts the line in two places",
      "From each cut, draw arcs of equal radius on the far side of the line",
      "Mark where those two arcs cross",
      "Draw the line through the original point and that crossing",
    ],
  },
  {
    name: "a line through a point parallel to a given line",
    sequence: [
      "Draw a transversal through the point, crossing the given line",
      "Draw an arc at the angle the given line makes with the transversal",
      "Copy that same arc up at the point, on the matching side of the transversal",
      "Draw the line through the point at the copied angle",
    ],
  },
];

/** Chains of implications, for the Law of Syllogism. */
const CHAINS = [
  [
    "If it rains, the field floods.",
    "If the field floods, the match is called off.",
    "If the match is called off, the tickets are refunded.",
    "If the tickets are refunded, the club loses money.",
  ],
  [
    "If a number is divisible by 6, it is divisible by 3.",
    "If a number is divisible by 3, its digits sum to a multiple of 3.",
    "If its digits sum to a multiple of 3, the sum is not 1.",
    "If the sum is not 1, the number is not a power of 10.",
  ],
  [
    "If a quadrilateral is a square, it is a rhombus.",
    "If it is a rhombus, it is a parallelogram.",
    "If it is a parallelogram, its opposite sides are parallel.",
    "If its opposite sides are parallel, it is a trapezoid under the inclusive definition.",
  ],
];

/** Two-column proofs, one line per row, reason included. */
const TWO_COLUMN = [
  {
    claim: "Given AB = CD, with B and C between A and D, prove AC = BD",
    sequence: [
      "AB = CD (Given)",
      "BC = BC (Reflexive Property)",
      "AB + BC = CD + BC (Addition Property of Equality)",
      "AB + BC = AC and CD + BC = BD (Segment Addition Postulate)",
      "AC = BD (Substitution)",
    ],
  },
  {
    claim: "Prove that vertical angles 1 and 3 are congruent",
    sequence: [
      "Lines m and n intersect, forming angles 1, 2 and 3 (Given)",
      "Angles 1 and 2 are a linear pair, and so are angles 2 and 3 (Definition of a linear pair)",
      "m∠1 + m∠2 = 180° and m∠2 + m∠3 = 180° (Linear Pair Postulate)",
      "m∠1 + m∠2 = m∠2 + m∠3 (Substitution)",
      "m∠1 = m∠3 (Subtraction Property of Equality)",
    ],
  },
];

/** The same material as boxes on a flowchart. */
const FLOW_PROOF = {
  claim: "m ∥ n, cut by transversal t. Prove ∠1 ≅ ∠3",
  sequence: [
    "m ∥ n, cut by transversal t (Given)",
    "∠1 ≅ ∠2 (Corresponding Angles Postulate)",
    "∠2 ≅ ∠3 (Vertical Angles Theorem)",
    "∠1 ≅ ∠3 (Transitive Property)",
  ],
};

/** The Congruent Supplements Theorem, written out. */
const SUPPLEMENTS_PROOF = {
  claim: "∠1 and ∠2 are supplementary, and so are ∠3 and ∠2. Prove ∠1 ≅ ∠3",
  sequence: [
    "∠1 and ∠2 are supplementary; ∠3 and ∠2 are supplementary (Given)",
    "m∠1 + m∠2 = 180° and m∠3 + m∠2 = 180° (Definition of supplementary)",
    "m∠1 + m∠2 = m∠3 + m∠2 (Substitution)",
    "m∠1 = m∠3 (Subtraction Property of Equality)",
    "∠1 ≅ ∠3 (Definition of congruent angles)",
  ],
};

/** A congruence proof that finishes on CPCTC. */
const CONGRUENCE_PROOF = {
  claim: "AB ≅ DE, AC ≅ DF and ∠A ≅ ∠D. Prove BC ≅ EF",
  sequence: [
    "AB ≅ DE, AC ≅ DF and ∠A ≅ ∠D (Given)",
    "∠A lies between AB and AC, and ∠D between DE and DF (Definition of an included angle)",
    "△ABC ≅ △DEF (SAS)",
    "BC ≅ EF (CPCTC)",
  ],
};

/** How a coordinate proof is set up and finished. */
const COORDINATE_PROOF = {
  claim: "Prove that the triangle with a base on the x-axis is isosceles",
  sequence: [
    "Place the figure with one vertex at the origin and a side along the x-axis",
    "Name the vertices (0, 0), (2a, 0) and (a, b)",
    "Work out the two side lengths with the distance formula",
    "Show the two lengths are equal, and state the conclusion",
  ],
};

/** A full proof that a quadrilateral is a parallelogram. */
const PARALLELOGRAM_PROOF = {
  claim: "AB ∥ CD and AB ≅ CD. Prove ABCD is a parallelogram",
  sequence: [
    "AB ∥ CD and AB ≅ CD (Given)",
    "Draw diagonal AC (Construction)",
    "∠BAC ≅ ∠DCA (Alternate Interior Angles Theorem)",
    "AC ≅ CA (Reflexive Property)",
    "△ABC ≅ △CDA (SAS)",
    "AD ≅ CB (CPCTC), so both pairs of opposite sides are congruent",
  ],
};

/** Indirect proofs, written the way one actually runs. */
const INDIRECT_PROOFS = [
  {
    claim: "a triangle has at most one right angle",
    sequence: [
      "Assume instead that the triangle has two right angles",
      "Those two angles alone already sum to 180°",
      "The third angle would then have to measure 0°",
      "But no angle of a triangle can measure 0°, so the assumption fails",
      "Therefore a triangle has at most one right angle",
    ],
  },
  {
    claim: "if two lines are cut by a transversal making congruent corresponding angles, the lines are parallel",
    sequence: [
      "Assume instead that the two lines meet at some point P",
      "Then the two lines and the transversal enclose a triangle",
      "One of the congruent angles is an exterior angle of that triangle",
      "An exterior angle is greater than either remote interior angle, so the two cannot be congruent",
      "The lines therefore never meet, so they are parallel",
    ],
  },
];

/** Families of quadrilaterals, most general first. */
const HIERARCHIES = [
  ["Quadrilateral", "Parallelogram", "Rectangle", "Square"],
  ["Quadrilateral", "Parallelogram", "Rhombus", "Square"],
  ["Quadrilateral", "Trapezoid", "Isosceles trapezoid"],
  ["Polygon", "Quadrilateral", "Parallelogram", "Rhombus"],
];

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
    // The bounds themselves, rather than a valid value picked from four.
    (r) => {
      const a = r.int(4, 15);
      const b = r.int(4, 15);
      const largest = r.bool();
      return fill(
        `Two sides of a triangle measure ${a} and ${b}. What is the ${largest ? "largest" : "smallest"} whole number the third side can be?`,
        largest ? a + b - 1 : Math.abs(a - b) + 1,
        { hint: "a whole number" },
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
    // Typed rather than chosen: the ratio is the answer, and four options with
    // one radical in them hand it over.
    (r) => {
      const leg = r.int(2, 12);
      if (r.bool()) {
        return fill(
          `In a 45–45–90 triangle each leg measures ${leg}. How long is the hypotenuse?`,
          radical(2, leg),
          { hint: "a number times a root" },
        );
      }
      return fill(
        `In a 30–60–90 triangle the shorter leg measures ${leg}. How long is the longer leg?`,
        radical(3, leg),
        { hint: "a number times a root" },
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
    // The centre, placed. Reading (h, k) off the equation is one sign flip, and
    // the flip is the whole mistake — which a grid shows and four options hide.
    (r) => {
      const span = 9;
      const h = r.nonzero(-7, 7);
      const k = r.nonzero(-7, 7);
      const radius = r.int(2, 6);
      return point(
        `Place the centre of the circle (x${signed(-h)})^2 + (y${signed(-k)})^2 = ${radius * radius}.`,
        { span, x: h, y: k, zero: 2 },
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
    (r) => {
      const radius = r.int(2, 14);
      const degrees = r.pick([30, 45, 60, 90, 120, 180, 240]);
      return fill(
        `A sector of a circle of radius ${radius} has a central angle of ${degrees}°. What is its area?`,
        piFrac(degrees * radius * radius, 360),
        { hint: "a multiple of π" },
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
    (r) => {
      const cone = r.bool();
      const radius = r.int(2, 10);
      const height = r.int(2, 12) * 3;
      const side = r.int(2, 12);
      return cone
        ? fill(
            `What is the volume of a cone with radius ${radius} and height ${height}?`,
            piFrac(radius * radius * height, 3),
            { hint: "a multiple of π" },
          )
        : fill(
            `What is the volume of a pyramid with a square base of side ${side} and height ${height}?`,
            (side * side * height) / 3,
            { hint: "a number" },
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
    (r) => {
      const radius = r.int(2, 12);
      const wantVolume = r.bool();
      return fill(
        `What is the ${wantVolume ? "volume" : "surface area"} of a sphere of radius ${radius}?`,
        wantVolume ? piFrac(4 * radius ** 3, 3) : piFrac(4 * radius * radius, 1),
        { hint: "a multiple of π" },
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
    (r) => {
      const chain = r.pick(CHAINS);
      return order(
        "The Law of Syllogism links these into one chain. Put them in order, first premise to last.",
        chain,
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
    // An algebraic proof, with its numbers rolled. Every line is entitled by
    // the one above it, which is exactly what makes the order recoverable.
    (r) => {
      const a = r.int(2, 9);
      const x = r.int(2, 12);
      const b = r.nonzero(-15, 15);
      const c = a * x + b;
      return order(
        `Put this algebraic proof that x = ${x} in order.`,
        [
          `${a}x${signed(b)} = ${c} (Given)`,
          `${a}x = ${c - b} (Subtraction Property of Equality)`,
          `x = ${x} (Division Property of Equality)`,
          `${a}(${x})${signed(b)} = ${c}, so the solution checks (Substitution)`,
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
    // The same theorem as an equation. Corresponding angles are congruent only
    // when the lines are parallel, so setting them equal is the condition.
    (r) => {
      const x = r.int(3, 15);
      const a = r.int(2, 6);
      const b = r.nonzero(-20, 20);
      const c = a + r.int(1, 4);
      const d = a * x + b - c * x;
      return fill(
        `Lines m and n are cut by a transversal. The corresponding angles measure (${a}x${signed(b)})° and (${c}x${signed(d)})°. For what x are m and n parallel?`,
        x,
        { hint: "a number" },
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
    // CPCTC as an equation rather than as a definition to recognise.
    (r) => {
      const x = r.int(2, 14);
      const a = r.int(2, 6);
      const b = r.nonzero(-9, 9);
      return fill(
        `△ABC ≅ △XYZ. If m∠A = (${a}x${signed(b)})° and m∠X = ${a * x + b}°, what is x?`,
        x,
        { hint: "a number" },
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
    // The circumcenter is equidistant from the vertices, which is a length
    // equation as soon as one of the distances is written as an expression.
    (r) => {
      const x = r.int(3, 14);
      const a = r.int(2, 5);
      const b = r.nonzero(-9, 9);
      const circum = r.bool();
      return fill(
        circum
          ? `P is the circumcenter of △ABC. If PA = ${a}x${signed(b)} and PB = ${a * x + b}, what is x?`
          : `Q is the incenter of △ABC. Its distance to side AB is ${a}x${signed(b)} and to side BC is ${a * x + b}. What is x?`,
        x,
        { hint: "a number" },
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
    // The altitude to the hypotenuse, over Pythagorean triples so the two legs
    // are whole and only the altitude itself comes out as a fraction.
    (r) => {
      const [a, b, c] = r.pick([
        [3, 4, 5],
        [6, 8, 10],
        [5, 12, 13],
        [8, 15, 17],
        [9, 12, 15],
        [7, 24, 25],
      ]);
      return fill(
        `A right triangle has legs ${a} and ${b} and hypotenuse ${c}. How long is the altitude drawn to the hypotenuse?`,
        frac(a * b, c),
        { hint: "a number or a fraction" },
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
    // The theorem is an ordering, so it is asked as one. Angles are rolled to
    // be distinct, because two equal angles would make two orders correct.
    (r) => {
      const first = r.int(20, 40);
      const second = r.int(45, 65);
      const third = 180 - first - second;
      const sides = [
        { angle: first, name: "a" },
        { angle: second, name: "b" },
        { angle: third, name: "c" },
      ].sort((p, q) => p.angle - q.angle);
      return order(
        `A triangle has angles ${first}°, ${second}° and ${third}°. Put the sides opposite them in order, shortest first.`,
        sides.map((s) => `The side opposite the ${s.angle}° angle`),
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
    (r) => {
      const family = r.pick(HIERARCHIES);
      return order(
        "Put these in order, most general first.",
        family,
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
    (r) => {
      const radius = r.int(2, 18);
      const degrees = r.pick([30, 45, 60, 90, 120, 180]);
      return fill(
        `What is the length of a ${degrees}° arc on a circle of radius ${radius}?`,
        piFrac(degrees * 2 * radius, 360),
        { hint: "a multiple of π" },
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
    (r) => {
      const radius = r.int(2, 12);
      const slant = radius + r.int(1, 9);
      return fill(
        `A cone has radius ${radius} and slant height ${slant}. What is its total surface area?`,
        piFrac(radius * (radius + slant), 1),
        { hint: "a multiple of π" },
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
  // ─────────────────────────────────────────────────────
  // Proof and construction
  //
  // These subunits were left empty on the first pass, on the grounds that
  // proof and construction do not reduce to rolled numbers. Half of that was
  // right. What does not parameterise is the *writing* of a proof; what does
  // is everything the writing is made of — which reason justifies a step,
  // what an indirect proof assumes, which condition is enough and which is
  // one short. Those roll over a case rather than over a coefficient. The
  // coordinate proofs roll over numbers like anything else, so they are asked
  // on the grid, where showing that two diagonals bisect each other is the
  // same act as placing the point they share.
  // ─────────────────────────────────────────────────────

  // ── 1.6 Constructions with compass and straightedge ──
  "math/geometry/unit-1/1.6": [
    (r) => {
      const c = r.pick(CONSTRUCTIONS);
      return among(
        `A compass and straightedge draw ${c.steps}. What has been constructed?`,
        c.makes,
        CONSTRUCTIONS.map((k) => k.makes),
        r,
      );
    },
    (r) => {
      const c = r.pick(CONSTRUCTIONS);
      return among(
        `Why does the construction of ${c.name} give exactly what it claims?`,
        c.why,
        CONSTRUCTIONS.map((k) => k.why),
        r,
      );
    },
    // The steps of a construction are the construction. Naming one is recall;
    // sequencing it is the thing a compass actually asks of you.
    (r) => {
      const c = r.pick(CONSTRUCTION_STEPS);
      return order(`Put the steps of constructing ${c.name} in order.`, c.sequence, r);
    },
  ],

  // ── 2.6 Two-column proofs ──
  "math/geometry/unit-2/2.6": [
    (r) => {
      const step = r.pick(PROOF_STEPS);
      return among(
        `A two-column proof reads "${step.line}". What is the reason?`,
        step.reason,
        PROOF_STEPS.map((s) => s.reason),
        r,
      );
    },
    (r) => {
      const first = r.bool();
      return ask(
        first
          ? "What always occupies the first line of a two-column proof?"
          : "What always occupies the last line of a two-column proof?",
        first ? "The given information" : "The statement being proved",
        [
          first ? "The statement being proved" : "The given information",
          "A definition",
          "The diagram",
          "An assumption made for contradiction",
          "The reason column",
        ],
        r,
      );
    },
    (r) => {
      const proof = r.pick(TWO_COLUMN);
      return order(`${proof.claim}. Put the proof in order.`, proof.sequence, r);
    },
  ],

  // ── 2.7 Paragraph and flowchart proofs ──
  "math/geometry/unit-2/2.7": [
    (r) => {
      const q = r.pick(PARAGRAPH);
      return ask(q.prompt, q.answer, q.wrong, r);
    },
    (r) => {
      const q = r.pick(FLOWCHART);
      return ask(q.prompt, q.answer, q.wrong, r);
    },
    (r) =>
      order(
        `${FLOW_PROOF.claim}. Put the boxes of the flowchart in order.`,
        FLOW_PROOF.sequence,
        r,
      ),
  ],

  // ── 2.8 Proving segment and angle theorems ──
  "math/geometry/unit-2/2.8": [
    (r) => {
      const t = r.pick(ANGLE_THEOREMS);
      return among(
        `${t.given} Which theorem finishes the proof?`,
        t.theorem,
        ANGLE_THEOREMS.map((k) => k.theorem),
        r,
      );
    },
    // The Congruent Supplements Theorem applied rather than named: two angles
    // supplementary to the same angle are congruent, so the answer is the one
    // you were handed and the middle angle is there to be seen past.
    (r) => {
      const complement = r.bool();
      const first = complement ? r.int(20, 70) : r.int(20, 160);
      return fill(
        complement
          ? `∠1 and ∠2 are complementary, and ∠3 and ∠2 are complementary. If m∠1 = ${first}°, what is m∠3?`
          : `∠1 and ∠2 are supplementary, and ∠3 and ∠2 are supplementary. If m∠1 = ${first}°, what is m∠3?`,
        first,
        { unit: "degrees" },
      );
    },
    (r) =>
      order(
        `${SUPPLEMENTS_PROOF.claim}. Put the proof in order.`,
        SUPPLEMENTS_PROOF.sequence,
        r,
      ),
  ],

  // ── 3.7 Constructing parallel and perpendicular lines ──
  "math/geometry/unit-3/3.7": [
    (r) => {
      const fromOutside = r.bool();
      return ask(
        fromOutside
          ? "To drop a perpendicular from a point down to a line, what is the first compass step?"
          : "To erect a perpendicular at a point that is already on the line, what is the first compass step?",
        fromOutside
          ? "Swing one arc from the point that cuts the line twice"
          : "Mark two points equidistant from it along the line",
        [
          fromOutside
            ? "Mark two points equidistant from it along the line"
            : "Swing one arc from the point that cuts the line twice",
          "Bisect the angle at the point",
          "Copy the segment onto a new ray",
          "Measure the distance with a ruler",
          "Draw a second line through the point at a guess",
        ],
        r,
      );
    },
    (r) =>
      ask(
        "Constructing a parallel line copies an angle across a transversal. Which fact makes the two lines parallel?",
        "Congruent corresponding angles",
        [
          "Congruent vertical angles",
          "Supplementary alternate interior angles",
          "Equal segment lengths",
          "A shared perpendicular bisector",
          "Congruent adjacent angles",
        ],
        r,
      ),
    (r) => {
      const c = r.pick(LINE_CONSTRUCTIONS);
      return order(`Put the steps of constructing ${c.name} in order.`, c.sequence, r);
    },
  ],

  // ── 5.8 Proofs using congruent triangles ──
  "math/geometry/unit-5/5.8": [
    // CPCTC with numbers in it. Once the triangles are congruent a matching
    // pair of parts is an equation, and writing that equation is the step.
    (r) => {
      const x = r.int(2, 12);
      const coefficient = r.int(2, 6);
      const shift = r.nonzero(-9, 9);
      return fill(
        `△ABC ≅ △DEF. Side AB measures ${coefficient}x${signed(shift)} and side DE measures ${coefficient * x + shift}. What is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) =>
      ask(
        "A proof has shown △ABC ≅ △DEF. What does CPCTC let you write on the next line?",
        "That any matching pair of sides or angles is congruent",
        [
          "That the two triangles are similar",
          "That the triangles have equal area only",
          "That a third triangle is congruent to both",
          "That the two triangles are the same triangle",
          "That the corresponding sides are proportional",
        ],
        r,
      ),
    (r) =>
      order(
        `${CONGRUENCE_PROOF.claim}. Put the proof in order.`,
        CONGRUENCE_PROOF.sequence,
        r,
      ),
  ],

  // ── 5.9 Coordinate proofs ──
  "math/geometry/unit-5/5.9": [
    // An isosceles triangle placed the way a coordinate proof places one: base
    // on the x-axis from the origin, apex above its midpoint. Rolled over
    // Pythagorean triples so the two equal sides come out whole.
    (r) => {
      const [half, height] = r.pick([
        [3, 4],
        [6, 8],
        [5, 12],
        [8, 15],
        [9, 12],
      ]);
      return fill(
        `A triangle has vertices (0, 0), (${2 * half}, 0) and (${half}, ${height}). A coordinate proof shows it is isosceles. How long are the two equal sides?`,
        Math.round(Math.sqrt(half * half + height * height)),
        { hint: "a number" },
      );
    },
    (r) =>
      ask(
        "Where should a figure be placed to make a coordinate proof easiest?",
        "One vertex at the origin, with a side along an axis",
        [
          "Centred on the origin and tilted 45°",
          "Inside the first quadrant, clear of both axes",
          "Anywhere, since the placement cannot matter",
          "With every vertex on the same axis",
          "With the centroid at the origin",
        ],
        r,
      ),
    (r) =>
      order(
        `${COORDINATE_PROOF.claim}. Put the steps in order.`,
        COORDINATE_PROOF.sequence,
        r,
      ),
  ],

  // ── 6.8 Indirect proof ──
  "math/geometry/unit-6/6.8": [
    (r) => {
      const c = r.pick(INDIRECT);
      return ask(
        `An indirect proof of "${c.claim}" begins by assuming what?`,
        c.assume,
        c.wrong,
        r,
      );
    },
    (r) =>
      ask(
        "An indirect proof ends when the assumption leads to what?",
        "A contradiction of the given or of a known theorem",
        [
          "A statement that cannot be checked",
          "The original claim, restated",
          "A second assumption",
          "A true statement unrelated to the claim",
          "A diagram that looks wrong",
        ],
        r,
      ),
    (r) => {
      const proof = r.pick(INDIRECT_PROOFS);
      return order(
        `Put this indirect proof that ${proof.claim} in order.`,
        proof.sequence,
        r,
      );
    },
  ],

  // ── 9.3 Proving a quadrilateral is a parallelogram ──
  "math/geometry/unit-9/9.3": [
    (r) => {
      const c = r.pick(PARALLELOGRAM_TESTS);
      return among(
        `All that is known about a quadrilateral is that ${c.given} Is that enough to call it a parallelogram?`,
        c.verdict,
        PARALLELOGRAM_TESTS.map((k) => k.verdict),
        r,
      );
    },
    // The diagonals bisect each other, turned into the equation that proves it.
    (r) => {
      const x = r.int(2, 12);
      const coefficient = r.int(2, 6);
      const shift = r.nonzero(-9, 9);
      return fill(
        `The diagonals of quadrilateral ABCD meet at E, and a proof needs AE = EC. If AE = ${coefficient}x${signed(shift)} and EC = ${coefficient * x + shift}, what is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) =>
      order(
        `${PARALLELOGRAM_PROOF.claim}. Put the proof in order.`,
        PARALLELOGRAM_PROOF.sequence,
        r,
      ),
  ],

  // ── 9.6 Coordinate proofs with quadrilaterals ──
  "math/geometry/unit-9/9.6": [
    // Showing that the diagonals bisect each other IS showing that they share a
    // midpoint, so the proof is asked as the placement rather than as a
    // sentence about the placement.
    (r) => {
      const span = 9;
      const mx = r.int(-5, 5);
      const my = r.int(-5, 5);
      const ax = r.nonzero(-4, 4);
      const ay = r.nonzero(-4, 4);
      let bx = r.nonzero(-4, 4);
      let by = r.nonzero(-4, 4);
      // Half-diagonals along one line would flatten the quadrilateral into a
      // segment, and there would be no crossing to place.
      if (ax * by - ay * bx === 0) {
        bx = -ay;
        by = ax;
      }
      const corners: [number, number][] = [
        [mx - ax, my - ay],
        [mx - bx, my - by],
        [mx + ax, my + ay],
        [mx + bx, my + by],
      ];
      return point(
        `ABCD has vertices A(${corners[0][0]}, ${corners[0][1]}), B(${corners[1][0]}, ${corners[1][1]}), C(${corners[2][0]}, ${corners[2][1]}) and D(${corners[3][0]}, ${corners[3][1]}). Its diagonals bisect each other. Place the point where they cross.`,
        {
          span,
          x: mx,
          y: my,
          zero: 2,
          figure: graph({
            span,
            curves: [],
            marks: corners.map(([x, y]) => dot(x, y)),
          }),
        },
      );
    },
    // A rhombus is proved on the grid by its perpendicular diagonals, which is
    // one negative reciprocal.
    (r) => {
      const rise = r.nonzero(-6, 6);
      const run = r.nonzero(-6, 6);
      return fill(
        `A coordinate proof shows ABCD is a rhombus. One diagonal has slope ${frac(rise, run)}. What is the slope of the other?`,
        frac(-run, rise),
        { hint: "a number or a fraction" },
      );
    },
  ],
};
