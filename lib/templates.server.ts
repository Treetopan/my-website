import "server-only";

import type { Question } from "./curriculum";
import {
  GENERATED,
  instanceId,
  parseInstanceId,
  type InstanceRef,
} from "./templates";
import { rng, type Built, type Rng } from "./generators/kit";
import type { Answer } from "./grading.server";
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
export type Resolved = {
  question: Question;
  answer: Answer;
  /**
   * Worked steps for this roll, when the generator supplied them. Never sent
   * with the question — only ever back with a verdict, and only a wrong one.
   */
  steps?: string[];
};

/**
 * Splits what a generator returns into the half that travels and the half that
 * does not. This is the only place the two are ever joined, which is what makes
 * the boundary easy to keep: everything downstream of here has either a
 * question or an answer, never both.
 */
function split(built: Built, id: string, topic: string): Resolved {
  return { ...divide(built, id, topic), steps: built.steps };
}

/** The question and answer halves; `split` re-attaches the steps around them. */
function divide(built: Built, id: string, topic: string): Omit<Resolved, "steps"> {
  switch (built.kind) {
    case "choice":
      return {
        question: {
          kind: "choice",
          id,
          topic,
          prompt: built.prompt,
          options: built.options,
          figure: built.figure,
        },
        answer: { kind: "choice", index: built.answer },
      };

    case "fill":
      return {
        question: {
          kind: "fill",
          id,
          topic,
          prompt: built.prompt,
          unit: built.unit,
          hint: built.hint,
          figure: built.figure,
        },
        answer: {
          kind: "fill",
          accept: built.accept,
          show: built.show,
          tolerance: built.tolerance,
        },
      };

    case "slider":
      return {
        question: {
          kind: "slider",
          id,
          topic,
          prompt: built.prompt,
          min: built.min,
          max: built.max,
          step: built.step,
          unit: built.unit,
          figure: built.figure,
        },
        answer: {
          kind: "slider",
          value: built.value,
          full: built.full,
          zero: built.zero,
        },
      };

    case "point":
      return {
        question: {
          kind: "point",
          id,
          topic,
          prompt: built.prompt,
          span: built.span,
          figure: built.figure,
        },
        answer: { kind: "point", at: built.at, full: built.full, zero: built.zero },
      };

    case "line":
      return {
        question: {
          kind: "line",
          id,
          topic,
          prompt: built.prompt,
          span: built.span,
          figure: built.figure,
        },
        answer: {
          kind: "line",
          slope: built.slope,
          intercept: built.intercept,
          span: built.span,
          full: built.full,
          zero: built.zero,
        },
      };

    case "order":
      return {
        question: {
          kind: "order",
          id,
          topic,
          prompt: built.prompt,
          items: built.items,
          figure: built.figure,
        },
        answer: {
          kind: "order",
          order: built.answer,
          full: built.full,
          zero: built.zero,
        },
      };
  }
}

function build(ref: InstanceRef): Resolved | null {
  const generator = GENERATORS[ref.subunitId]?.[ref.generator];
  if (!generator) return null;

  return split(
    generator(rng(ref.seed)),
    instanceId(ref.subunitId, ref.generator, ref.seed),
    GENERATED[ref.subunitId][ref.generator],
  );
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
 * What a generator asks, reduced to something two generators can be compared
 * on: the kind, plus the first few plain words of the prompt.
 *
 * Only words made purely of letters survive. Everything algebraic is thrown
 * away, and that is deliberate rather than lazy — blanking the numbers is not
 * enough, because "solve for x: 4x + 14 = -18" and "solve for x: -7x - 6 = 19"
 * still differ in their signs and operators once the digits are gone. Grouping
 * on that split three ways of writing "solve for x" into three forms and left
 * the deal exactly as lopsided as it was before.
 *
 * Erring coarse is the safe direction. Two forms wrongly merged still take
 * turns inside one rotation, which is fine; two identical forms wrongly split
 * is the bug this exists to prevent.
 */
export function questionShape(question: Question): string {
  return (
    question.kind +
    " " +
    question.prompt
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => /^[a-z]+$/.test(word))
      .slice(0, 4)
      .join(" ")
  );
}

/**
 * A fixed seed for the probe below. Any seed would do; a fixed one means the
 * grouping is a property of the subunit rather than of the session, so it is
 * worked out once per process and never again.
 */
const PROBE_SEED = 0x5eed;

const shapesBySubunit = new Map<string, string[]>();

/** Each generator's shape, in generator order. Computed once, then cached. */
function shapes(subunitId: string): string[] {
  const cached = shapesBySubunit.get(subunitId);
  if (cached) return cached;

  const generators = GENERATORS[subunitId] ?? [];
  const out = generators.map((_, i) => {
    const made = build({ subunitId, generator: i, seed: PROBE_SEED });
    // A generator that will not build cannot be grouped with anything, so it
    // gets a shape of its own and is dealt as its own form.
    return made ? questionShape(made.question) : `generator ${i}`;
  });

  shapesBySubunit.set(subunitId, out);
  return out;
}

/**
 * Mints `want` fresh questions for a subunit.
 *
 * Dealt round-robin across *forms* rather than across generators, and that
 * distinction is the whole point. A subunit whose five generators are three
 * ways of writing "solve for x", one that runs the equation backwards, and one
 * that puts the answer on a number line has five generators and three forms.
 * Dealing per generator gives a ten-question session six solve-for-x rounds
 * and calls it varied; dealing per form gives roughly three or four of each.
 *
 * Within a form the generators still rotate, so the three solve-for-x
 * templates take turns among themselves rather than one of them being dealt
 * every time. Both rotations start somewhere random, so the same subunit does
 * not open with the same shape twice running.
 *
 * Every instance still gets its own seed: two students on the same subunit, or
 * the same student twice, never see the same numbers.
 *
 * `only` narrows the deal to particular generators, which is how a duel asks
 * for the questions it can settle. The forms are grouped inside that shorter
 * list rather than outside it, so a duel stays balanced across whatever shapes
 * it can actually settle.
 */
export function mintInstances(
  subunitId: string,
  want: number,
  only?: number[],
): Question[] {
  const generators = GENERATORS[subunitId];
  if (!generators?.length) return [];

  const pool = only
    ? only.filter((i) => Number.isInteger(i) && i >= 0 && i < generators.length)
    : generators.map((_, i) => i);
  if (!pool.length) return [];

  const shape = shapes(subunitId);
  const byForm = new Map<string, number[]>();
  for (const g of pool) {
    const key = shape[g] ?? `generator ${g}`;
    const found = byForm.get(key);
    if (found) found.push(g);
    else byForm.set(key, [g]);
  }

  const forms = [...byForm.values()];
  const offset = Math.floor(Math.random() * forms.length);
  // Where each form starts its own rotation, so the first template of a form
  // is not always the same one.
  const turn = forms.map((f) => Math.floor(Math.random() * f.length));

  const out: Question[] = [];

  for (let i = 0; i < want; i++) {
    const at = (offset + i) % forms.length;
    const form = forms[at];
    const generator = form[turn[at]++ % form.length];
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
