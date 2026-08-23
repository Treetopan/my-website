import "server-only";

import type { Question } from "./curriculum";
import {
  GENERATED,
  instanceId,
  parseInstanceId,
  type InstanceRef,
} from "./templates";
import { rng, type Built, type Rng } from "./generators/kit";
import { ALGEBRA_1 } from "./generators/algebra-1";
import { GEOMETRY } from "./generators/geometry";
import { ALGEBRA_2 } from "./generators/algebra-2";
import { PRECALCULUS } from "./generators/precalculus";
import { CALCULUS_AB } from "./generators/calculus-ab";
import { CALCULUS_BC } from "./generators/calculus-bc";

/**
 * Question generators: minting and grading.
 *
 * A bank question is a fixed prompt with its answer filed away in
 * `answers.server.ts`. A generated question is a small program: it rolls its
 * own numbers, works out the answer from them, and builds distractors around
 * it. Nothing is stored — the same seed always rebuilds the same question, so
 * grading re-runs the generator instead of consulting a key.
 *
 * This module and everything under `generators/` must never reach the browser.
 * `server-only` makes that a build error rather than a matter of discipline,
 * and it is not paranoia: a generator that computes the answer is a stronger
 * leak than the answer key itself, since it solves not just the questions asked
 * so far but every one it could ever produce.
 *
 * The generators themselves live per course under `generators/`. This file only
 * assembles them, mints instances, and grades them.
 */

type Generator = (r: Rng) => Built;

/** Every course's generators, keyed by subunit id. */
const GENERATORS: Record<string, Generator[]> = {
  ...ALGEBRA_1,
  ...GEOMETRY,
  ...ALGEBRA_2,
  ...PRECALCULUS,
  ...CALCULUS_AB,
  ...CALCULUS_BC,
};

// ─── Minting and grading ─────────────────────────────────

/** A generated question plus the answer, which stays on this side of the wire. */
type Resolved = { question: Question; answer: number };

function build(ref: InstanceRef): Resolved | null {
  const generator = GENERATORS[ref.subunitId]?.[ref.generator];
  if (!generator) return null;

  const built = generator(rng(ref.seed));
  return {
    question: {
      id: instanceId(ref.subunitId, ref.generator, ref.seed),
      prompt: built.prompt,
      options: built.options,
      topic: GENERATED[ref.subunitId][ref.generator],
    },
    answer: built.answer,
  };
}

/**
 * Rebuilds the question an instance id names, and works out its answer again.
 *
 * This is why generated questions need no storage: grading is a re-derivation,
 * not a lookup. A session that has been sitting for an hour grades exactly as
 * it would have at kick-off.
 */
export function resolveInstance(id: string): Resolved | null {
  const ref = parseInstanceId(id);
  return ref ? build(ref) : null;
}

/**
 * Mints `want` fresh questions for a subunit.
 *
 * Generators are dealt round-robin from a random offset so a short game still
 * samples across the topics rather than leaning on one generator, and every
 * instance gets its own seed — two students on the same subunit, or the same
 * student twice, never see the same numbers.
 */
export function mintInstances(subunitId: string, want: number): Question[] {
  const generators = GENERATORS[subunitId];
  if (!generators?.length) return [];

  const offset = Math.floor(Math.random() * generators.length);
  const out: Question[] = [];

  for (let i = 0; i < want; i++) {
    const generator = (offset + i) % generators.length;
    const seed = Math.floor(Math.random() * 0xffffffff);
    const made = build({ subunitId, generator, seed });
    if (made) out.push(made.question);
  }

  return out;
}

export function hasGenerators(subunitId: string): boolean {
  return (GENERATORS[subunitId]?.length ?? 0) > 0;
}

// ─── Drift guard ─────────────────────────────────────────

/**
 * The public manifest and the generators are two halves of one thing, split
 * only so the answers stay server-side. If they disagree, instance ids point at
 * the wrong generator and questions get graded against another topic's answer —
 * so disagree loudly, at load, rather than quietly at play.
 */
for (const [subunitId, topics] of Object.entries(GENERATED)) {
  const generators = GENERATORS[subunitId];
  if (!generators) {
    throw new Error(
      `templates: ${subunitId} is listed in GENERATED but has no generators.`,
    );
  }
  if (generators.length !== topics.length) {
    throw new Error(
      `templates: ${subunitId} lists ${topics.length} topics but has ${generators.length} generators.`,
    );
  }
}

for (const subunitId of Object.keys(GENERATORS)) {
  if (!GENERATED[subunitId]) {
    throw new Error(
      `templates: ${subunitId} has generators but is missing from GENERATED.`,
    );
  }
}
