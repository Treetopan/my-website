/**
 * Checks that every question can explain itself.
 *
 * A student only ever sees this at the worst moment — they have just got one
 * wrong — so a topic with no method on file is a silent hole rather than a
 * loud one: the reveal still works, it just says less. This makes the hole
 * loud, and it is the only thing standing between a newly added generator and
 * a subunit that never explains anything.
 *
 * It also runs the client-side diagnosis over real seeds and real wrong
 * answers, because that half is arithmetic rather than prose and can be wrong
 * in ways proofreading will not catch.
 *
 * Run with `npm run check:coaching`.
 */

import { GENERATED, instanceId, spatialGenerators } from "../lib/templates";
import { resolveInstance } from "../lib/templates.server";
import { coachingFor, methodFor } from "../lib/coaching.server";
import { diagnose } from "../lib/coaching";
import { grade } from "../lib/grading.server";
import { emptyResponse, isBlank, type Response } from "../lib/questions";

const SEEDS_PER_GENERATOR = 40;

const missing: string[] = [];
const broken: string[] = [];
let checked = 0;
let diagnosed = 0;

/**
 * A wrong answer of the right kind, chosen to exercise the diagnosis rather
 * than to look plausible. The point is that every branch of `diagnose` runs
 * against a real reveal, including the ones that only fire on a sign slip or a
 * point in the wrong quadrant.
 */
function wrongAnswers(kind: Response["kind"]): Response[] {
  switch (kind) {
    case "choice":
      return [{ kind: "choice", choice: 0 }, { kind: "choice", choice: 3 }];
    case "fill":
      return [
        { kind: "fill", text: "0" },
        { kind: "fill", text: "-7" },
        { kind: "fill", text: "1/2" },
        { kind: "fill", text: "not a number" },
      ];
    case "slider":
      return [{ kind: "slider", value: 0 }, { kind: "slider", value: -3.5 }];
    case "point":
      return [
        { kind: "point", at: { x: 0, y: 0 } },
        { kind: "point", at: { x: -5, y: 6 } },
      ];
    case "line":
      return [
        {
          kind: "line",
          through: [
            { x: -4, y: -4 },
            { x: 4, y: 4 },
          ],
        },
        {
          kind: "line",
          through: [
            { x: 2, y: -6 },
            { x: 2, y: 6 },
          ],
        },
      ];
  }
}

for (const [subunitId, topics] of Object.entries(GENERATED)) {
  const spatial = new Set(spatialGenerators(subunitId));

  for (let g = 0; g < topics.length; g++) {
    const topic = topics[g];
    checked++;

    if (!methodFor(topic, subunitId)) {
      missing.push(`${subunitId} [${g}] ${topic}`);
    }

    for (let i = 0; i < SEEDS_PER_GENERATOR; i++) {
      const seed = Math.imul(g * SEEDS_PER_GENERATOR + i, 2654435761) >>> 0;
      const made = resolveInstance(instanceId(subunitId, g, seed));
      if (!made) {
        broken.push(`${subunitId} [${g}] would not build at seed ${seed}`);
        break;
      }

      const { question, answer } = made;
      const attempts = [...wrongAnswers(question.kind), emptyResponse(question.kind)];

      for (const attempt of attempts) {
        const { correct, reveal } = grade(answer, attempt);
        // A "wrong" answer that happens to be right on this seed proves
        // nothing about the explanation, so it is not one of these.
        if (correct) continue;

        const steps = coachingFor(made.steps, question.topic, subunitId);
        if (!steps?.length) {
          broken.push(`${subunitId} [${g}] a miss produced no explanation`);
          break;
        }

        let said: string | null;
        try {
          said = diagnose(question, reveal, attempt);
        } catch (e) {
          broken.push(
            `${subunitId} [${g}] diagnose threw at seed ${seed}: ${(e as Error).message}`,
          );
          break;
        }

        if (said !== null) {
          diagnosed++;
          if (!said.trim() || /NaN|Infinity|undefined/.test(said)) {
            broken.push(`${subunitId} [${g}] said "${said}" at seed ${seed}`);
            break;
          }
        } else if (spatial.has(g) && !isBlank(attempt)) {
          // A placed answer that lands nowhere near the target and still has
          // nothing to say means the diagnosis has stopped measuring. A blank
          // one is exempt: there is no placement to describe, and the method
          // line above is the whole of what a timeout deserves to be told.
          broken.push(`${subunitId} [${g}] had nothing to say about a placed miss`);
          break;
        }
      }
    }
  }
}

console.log("");
console.log(`Generators checked        ${checked}`);
console.log(`Diagnoses produced        ${diagnosed}`);
console.log(`Topics with no method     ${missing.length}`);

for (const m of missing.slice(0, 20)) console.log(`  no method: ${m}`);
for (const b of broken.slice(0, 20)) console.log(`  ${b}`);

if (missing.length || broken.length) {
  console.log("");
  console.log(
    `${missing.length + broken.length} problem(s). Every generator must be able to explain a miss.`,
  );
  process.exit(1);
}

console.log("");
console.log("Every generator explains a miss.");
