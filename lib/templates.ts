/**
 * The public half of generated questions.
 *
 * A generated subunit has no question bank. It has generators: little programs
 * that invent a fresh question each time they run and work out the answer
 * rather than looking it up. This file says only which subunits have them and
 * what each one asks about — enough for the library to describe a subunit
 * honestly, and nothing a student could answer a question with.
 *
 * The generators themselves live under `generators/`, behind `server-only`,
 * for the same reason the answer key does: a generator that computes the
 * answer IS the answer key. Ship it to the browser and every question it could
 * ever produce is solved. `templates.server.ts` checks itself against this list
 * at load, so the two cannot drift apart.
 */

/**
 * Subunit id → the topic each of its generators drills, in order. A generator's
 * position here is its id: index 2 is generator `2` forever, so an instance id
 * minted last week still resolves today. Insert in the middle and old ids point
 * at the wrong generator — append instead.
 *
 * Coverage is deliberately partial. A subunit earns a generator when its
 * questions are genuinely parameterised — when rolling new numbers makes a new
 * question rather than the same question wearing a hat. Proof, construction,
 * and interpretation subunits are absent on purpose; they need written
 * questions, and pretending otherwise would produce four-option trivia about
 * topics that deserve better.
 */
export const GENERATED: Record<string, string[]> = {
  // ─── Algebra 1 ─────────────────────────────────────────
  "math/algebra-1/unit-1/1.1": ["Classifying real numbers"],
  "math/algebra-1/unit-1/1.6": [
    "Product rule",
    "Quotient rule",
    "Power of a power",
    "Negative exponents",
  ],
  "math/algebra-1/unit-1/1.7": ["Scientific notation"],
  "math/algebra-1/unit-2/2.1": [
    "One-step equations",
    "Two-step equations",
    "Negative coefficients",
  ],
  "math/algebra-1/unit-2/2.2": [
    "Variables on both sides",
    "Distributing before solving",
  ],
  "math/algebra-1/unit-2/2.8": ["Absolute value equations"],
  "math/algebra-1/unit-3/3.3": ["Evaluating a function"],
  "math/algebra-1/unit-4/4.1": [
    "Slope from two points",
    "Reading the sign of a slope",
  ],
  "math/algebra-1/unit-4/4.2": [
    "Slope and intercept from an equation",
    "Evaluating a linear function",
  ],
  "math/algebra-1/unit-4/4.6": ["Parallel and perpendicular slopes"],
  "math/algebra-1/unit-5/5.3": ["Systems by elimination"],
  "math/algebra-1/unit-6/6.3": ["Multiplying binomials"],
  "math/algebra-1/unit-6/6.4": [
    "Difference of squares",
    "Perfect square trinomials",
  ],
  "math/algebra-1/unit-6/6.6": ["Factoring trinomials"],
  "math/algebra-1/unit-7/7.8": ["Solving with the quadratic formula"],
  "math/algebra-1/unit-7/7.9": [
    "Computing the discriminant",
    "The nature of the roots",
  ],
  "math/algebra-1/unit-8/8.1": ["Finding the nth term"],
  "math/algebra-1/unit-9/9.1": ["Simplifying radicals"],
  "math/algebra-1/unit-10/10.1": ["Mean and median"],

  // ─── Geometry ──────────────────────────────────────────
  "math/geometry/unit-1/1.3": ["Segment addition"],
  "math/geometry/unit-1/1.4": ["Complements and supplements"],
  "math/geometry/unit-1/1.5": ["Midpoint", "Distance"],
  "math/geometry/unit-5/5.1": ["The triangle angle sum"],
  "math/geometry/unit-5/5.2": ["The exterior angle theorem"],
  "math/geometry/unit-6/6.5": ["The midsegment theorem"],
  "math/geometry/unit-6/6.6": ["The triangle inequality"],
  "math/geometry/unit-7/7.2": ["Scale factor"],
  "math/geometry/unit-7/7.7": ["Area ratios of similar figures"],
  "math/geometry/unit-8/8.1": ["The Pythagorean theorem"],
  "math/geometry/unit-8/8.3": ["Special right triangles"],
  "math/geometry/unit-8/8.4": ["Trigonometric ratios"],
  "math/geometry/unit-9/9.1": ["Polygon angle sums"],
  "math/geometry/unit-10/10.3": ["Central and inscribed angles"],
  "math/geometry/unit-10/10.9": ["The equation of a circle"],
  "math/geometry/unit-10/10.10": ["Area of a sector"],
  "math/geometry/unit-11/11.7": ["Volume of prisms and cylinders"],
  "math/geometry/unit-11/11.8": ["Volume of cones"],
  "math/geometry/unit-11/11.9": ["Spheres"],
  "math/geometry/unit-11/11.11": ["Scaling solids"],
  "math/geometry/unit-12/12.2": ["Permutations and combinations"],
  "math/geometry/unit-12/12.5": ["Independent and dependent events"],

  // ─── Algebra 2 ─────────────────────────────────────────
  "math/algebra-2/unit-1/1.5": ["Matrix multiplication"],
  "math/algebra-2/unit-1/1.6": ["Determinants"],
  "math/algebra-2/unit-2/2.5": ["Powers of i"],
  "math/algebra-2/unit-2/2.6": ["Multiplying complex numbers"],
  "math/algebra-2/unit-2/2.7": ["Complex conjugates"],
  "math/algebra-2/unit-3/3.5": ["The Remainder Theorem"],
  "math/algebra-2/unit-3/3.7": ["The Rational Root Theorem"],
  "math/algebra-2/unit-4/4.5": ["Horizontal asymptotes"],
  "math/algebra-2/unit-5/5.2": ["Rational exponents"],
  "math/algebra-2/unit-5/5.8": ["Function composition"],
  "math/algebra-2/unit-5/5.9": ["Inverse functions"],
  "math/algebra-2/unit-6/6.6": ["Properties of logarithms"],
  "math/algebra-2/unit-6/6.8": ["Solving exponential equations"],
  "math/algebra-2/unit-7/7.1": ["Degrees to radians"],
  "math/algebra-2/unit-7/7.2": ["The unit circle"],
  "math/algebra-2/unit-7/7.7": ["Amplitude and period"],
  "math/algebra-2/unit-8/8.2": ["Arithmetic sequences"],
  "math/algebra-2/unit-8/8.3": ["Arithmetic series"],
  "math/algebra-2/unit-8/8.6": ["Infinite geometric series"],
  "math/algebra-2/unit-9/9.4": ["Ellipses"],
  "math/algebra-2/unit-10/10.5": ["z-scores"],

  // ─── Precalculus ───────────────────────────────────────
  "math/precalculus/unit-1/1.4": ["Average rate of change"],
  "math/precalculus/unit-1/1.8": ["Function composition"],
  "math/precalculus/unit-2/2.7": ["Vertical asymptotes"],
  "math/precalculus/unit-3/3.6": ["Properties of logarithms"],
  "math/precalculus/unit-3/3.7": ["Solving exponential equations"],
  "math/precalculus/unit-4/4.2": ["Arc length"],
  "math/precalculus/unit-4/4.5": ["Sinusoidal transformations"],
  "math/precalculus/unit-4/4.11": ["Pythagorean identities"],
  "math/precalculus/unit-5/5.2": ["Vector magnitude"],
  "math/precalculus/unit-5/5.4": ["The dot product"],
  "math/precalculus/unit-5/5.7": ["Eliminating the parameter"],
  "math/precalculus/unit-6/6.4": ["Eccentricity"],
  "math/precalculus/unit-7/7.2": ["Geometric series"],
  "math/precalculus/unit-7/7.5": ["The Binomial Theorem"],
  "math/precalculus/unit-7/7.9": ["Evaluating limits algebraically"],
  "math/precalculus/unit-7/7.10": ["One-sided limits"],
  "math/precalculus/unit-7/7.12": ["The difference quotient"],

  // ─── AP Calculus AB ────────────────────────────────────
  "math/ap-calculus-ab/unit-1/1.6": ["Limits by algebraic manipulation"],
  "math/ap-calculus-ab/unit-1/1.15": ["Limits at infinity"],
  "math/ap-calculus-ab/unit-2/2.5": ["The Power Rule"],
  "math/ap-calculus-ab/unit-2/2.8": ["The Product Rule"],
  "math/ap-calculus-ab/unit-2/2.9": ["The Quotient Rule"],
  "math/ap-calculus-ab/unit-3/3.1": ["The Chain Rule"],
  "math/ap-calculus-ab/unit-3/3.6": ["Higher-order derivatives"],
  "math/ap-calculus-ab/unit-4/4.2": ["Straight-line motion"],
  "math/ap-calculus-ab/unit-4/4.5": ["Related rates"],
  "math/ap-calculus-ab/unit-4/4.7": ["L'Hospital's Rule"],
  "math/ap-calculus-ab/unit-5/5.3": ["Increasing and decreasing intervals"],
  "math/ap-calculus-ab/unit-5/5.7": ["The Second Derivative Test"],
  "math/ap-calculus-ab/unit-6/6.7": ["Definite integrals"],
  "math/ap-calculus-ab/unit-6/6.8": ["Antiderivatives"],
  "math/ap-calculus-ab/unit-6/6.9": ["Integration by substitution"],
  "math/ap-calculus-ab/unit-8/8.1": ["Average value"],
  "math/ap-calculus-ab/unit-8/8.4": ["Area between curves"],

  // ─── AP Calculus BC ────────────────────────────────────
  // Units 1–5 are shared with AB, and so are its generators — a BC student
  // drilling the Chain Rule does it in the AB course rather than in a second
  // copy of it here.
  "math/ap-calculus-bc/unit-6/6.11": ["Integration by parts"],
  "math/ap-calculus-bc/unit-6/6.13": ["Improper integrals"],
  "math/ap-calculus-bc/unit-7/7.5": ["Euler's method"],
  "math/ap-calculus-bc/unit-8/8.13": ["Arc length"],
  "math/ap-calculus-bc/unit-9/9.1": ["Parametric derivatives"],
  "math/ap-calculus-bc/unit-9/9.8": ["Area of a polar region"],
  "math/ap-calculus-bc/unit-10/10.2": ["Geometric series"],
  "math/ap-calculus-bc/unit-10/10.5": ["p-series"],
  "math/ap-calculus-bc/unit-10/10.8": ["The Ratio Test"],
  "math/ap-calculus-bc/unit-10/10.11": ["Taylor coefficients"],
  "math/ap-calculus-bc/unit-10/10.13": ["Radius of convergence"],
};

/** How many generators back a subunit. Zero for an ordinary question bank. */
export function generatorCount(subunitId: string): number {
  return GENERATED[subunitId]?.length ?? 0;
}

/**
 * Instance ids look like `<subunitId>/gen/<generator>/<seed>`, which keeps them
 * distinguishable from bank ids (`<subunitId>/q<n>`) and self-describing: the
 * grader can rebuild the exact question from the id alone, so a generated
 * question needs no more server state than a bank one.
 */
export function instanceId(
  subunitId: string,
  generator: number,
  seed: number,
): string {
  return `${subunitId}/gen/${generator}/${seed.toString(36)}`;
}

export type InstanceRef = {
  subunitId: string;
  generator: number;
  seed: number;
};

/** Reads an instance id back apart. Null if it is not one, or is malformed. */
export function parseInstanceId(id: string): InstanceRef | null {
  const parts = id.split("/");
  if (parts.length < 4) return null;

  const [seedText, generatorText, marker] = [
    parts[parts.length - 1],
    parts[parts.length - 2],
    parts[parts.length - 3],
  ];
  if (marker !== "gen") return null;

  const generator = Number(generatorText);
  const seed = Number.parseInt(seedText, 36);
  if (!Number.isInteger(generator) || !Number.isInteger(seed)) return null;

  const subunitId = parts.slice(0, -3).join("/");
  if (generator < 0 || generator >= generatorCount(subunitId)) return null;

  return { subunitId, generator, seed };
}

export function isInstanceId(id: string): boolean {
  return parseInstanceId(id) !== null;
}
