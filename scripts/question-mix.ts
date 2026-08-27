/**
 * The mix of question kinds, per course.
 *
 * A generator's kind is not always fixed — one that branches on a roll can
 * produce a choice question on one seed and a fill on the next — so the mix is
 * measured by minting rather than by reading the source, and averaged over
 * enough seeds that a rare branch still shows up.
 *
 * The number that matters is the multiple-choice share. Four visible options
 * under a clock reward elimination over solving, so the ceiling is 45%: past
 * that a course is teaching a test-taking habit rather than the subject. Run
 * with `npx tsx --conditions=react-server scripts/question-mix.ts`.
 */

import { GENERATED } from "../lib/templates";
import { resolveInstance } from "../lib/templates.server";
import { instanceId } from "../lib/templates";
import type { QuestionKind } from "../lib/questions";

const SEEDS = 40;
const CEILING = 0.45;

const COURSES: [string, string][] = [
  ["algebra-1", "Algebra 1"],
  ["geometry", "Geometry"],
  ["algebra-2", "Algebra 2"],
  ["precalculus", "Precalculus"],
  ["ap-calculus-ab", "Calculus AB"],
  ["ap-calculus-bc", "Calculus BC"],
];

const KINDS: QuestionKind[] = ["choice", "fill", "slider", "point", "line"];

type Tally = Record<QuestionKind, number> & { total: number; figures: number };

function empty(): Tally {
  return { choice: 0, fill: 0, slider: 0, point: 0, line: 0, total: 0, figures: 0 };
}

const perCourse = new Map<string, Tally>(COURSES.map(([id]) => [id, empty()]));
const offenders: { id: string; share: number }[] = [];

for (const [subunitId, topics] of Object.entries(GENERATED)) {
  const course = COURSES.find(([id]) => subunitId.includes(`/${id}/`))?.[0];
  if (!course) {
    console.log(`unclaimed subunit: ${subunitId}`);
    continue;
  }
  const tally = perCourse.get(course)!;

  for (let generator = 0; generator < topics.length; generator++) {
    const seen = empty();

    for (let i = 0; i < SEEDS; i++) {
      const seed = (Math.imul(generator * 7919 + i, 2654435761) >>> 0);
      const made = resolveInstance(instanceId(subunitId, generator, seed));
      if (!made) continue;
      seen[made.question.kind]++;
      seen.total++;
      if (made.question.figure) seen.figures++;
    }

    // One vote per generator, so a subunit is not weighted by how many seeds
    // happened to land on its odd branch.
    const kind = KINDS.reduce((best, k) => (seen[k] > seen[best] ? k : best), "choice");
    tally[kind]++;
    tally.total++;
    if (seen.figures > seen.total / 2) tally.figures++;

    if (seen.choice > 0 && seen.choice < seen.total) {
      offenders.push({ id: `${subunitId}#${generator}`, share: seen.choice / seen.total });
    }
  }
}

let worst = 0;
console.log("");
for (const [id, name] of COURSES) {
  const tally = perCourse.get(id)!;
  if (!tally.total) continue;
  const share = tally.choice / tally.total;
  worst = Math.max(worst, share);

  const parts = KINDS.map((k) => `${k} ${String(tally[k]).padStart(3)}`).join("  ");
  console.log(
    `${name.padEnd(13)} ${String(tally.total).padStart(4)} generators   ${parts}   ` +
      `figures ${String(tally.figures).padStart(3)}   ` +
      `choice ${(share * 100).toFixed(1).padStart(5)}%  ${share > CEILING ? "OVER" : "ok"}`,
  );
}

if (offenders.length) {
  console.log("\nGenerators that switch kind between seeds:");
  for (const o of offenders) console.log(`  ${o.id}  choice on ${(o.share * 100).toFixed(0)}% of seeds`);
}

console.log("");
if (worst > CEILING) {
  console.log(`Worst course is ${(worst * 100).toFixed(1)}% multiple choice, over the ${CEILING * 100}% ceiling.`);
  process.exit(1);
}
console.log(`Every course is at or under the ${CEILING * 100}% multiple-choice ceiling.`);
