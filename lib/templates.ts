/**
 * The public half of generated questions.
 *
 * A generated subunit has no question bank. It has generators: little programs
 * that invent a fresh question each time they run and work out the answer
 * rather than looking it up. This file says only which subunits have them and
 * what each one asks about — enough for the library to describe a subunit
 * honestly, and nothing a student could answer a question with.
 *
 * The generators themselves live in `templates.server.ts`, for the same reason
 * the answer key does: a generator that computes the answer IS the answer key.
 * Ship it to the browser and every question in it is solved. That module
 * checks itself against this list at load, so the two cannot drift apart.
 */

/**
 * Subunit id → the topic each of its generators drills, in order. A generator's
 * position here is its id: index 2 is generator `2` forever, so an instance id
 * minted last week still resolves today. Insert in the middle and old ids point
 * at the wrong generator — append instead.
 */
export const GENERATED: Record<string, string[]> = {
  "math/algebra-1/unit-1/1.6": [
    "Product rule",
    "Quotient rule",
    "Power of a power",
    "Negative exponents",
  ],
  "math/algebra-1/unit-2/2.1": [
    "One-step equations",
    "Two-step equations",
    "Negative coefficients",
  ],
  "math/algebra-1/unit-2/2.2": [
    "Variables on both sides",
    "Distributing before solving",
  ],
  "math/algebra-1/unit-4/4.1": ["Slope from two points", "Reading the sign of a slope"],
  "math/algebra-1/unit-4/4.2": [
    "Slope and intercept from an equation",
    "Evaluating a linear function",
  ],
  "math/algebra-1/unit-6/6.4": ["Difference of squares", "Perfect square trinomials"],
  "math/algebra-1/unit-7/7.8": ["Solving with the quadratic formula"],
  "math/algebra-1/unit-7/7.9": ["Computing the discriminant", "The nature of the roots"],
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
