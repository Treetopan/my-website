/**
 * How deep each subunit actually is.
 *
 * A subunit with one generator is not a subunit a student can practise. The
 * session deals its questions round-robin across the generators it has, so one
 * generator means ten rounds of the same template with the digits changed —
 * and the more distinctive the template, the more obvious that is. A subunit
 * whose single generator asks you to place a point is ten rounds of "place a
 * point", which reads as a bug long before it reads as revision.
 *
 * Depth is counted three ways, because each one is easy to satisfy without
 * fixing the next:
 *
 *   · generators per subunit — the raw count.
 *   · forms per subunit — how many genuinely different *shapes of task* those
 *     generators take. Three templates that all say "solve for x" with
 *     different digits are three generators and one form.
 *   · the deal — what a ten-question session actually looks like. This is the
 *     only one a student experiences. A subunit can hold three forms and still
 *     deal six rounds of one of them, which is what happens when the deal
 *     follows the inventory instead of the forms.
 *
 * A form is a question kind, split further where one kind hosts two different
 * asks: a `fill` that computes a result and a `fill` that recovers a
 * coefficient from the result are the same kind and not the same question, so
 * the prompt is fingerprinted rather than the kind alone.
 *
 * Run with `npm run check:depth`.
 */

import { SUBJECTS, type Course } from "../lib/curriculum";
import { GENERATED, instanceId } from "../lib/templates";
import {
  mintInstances,
  questionShape,
  resolveInstance,
} from "../lib/templates.server";

/** Enough seeds to see a generator that branches between two shapes. */
const SEEDS = 16;

/**
 * The agreed floor for a course, where there is one.
 *
 * A course is listed here once it has actually been brought up to depth, so
 * the number is a ratchet rather than an aspiration: the check fails if
 * anything slips back under it. Courses not listed are reported and not gated.
 */
const FLOORS: Record<string, { generators: number; forms: number }> = {
  "math/grade-5": { generators: 3, forms: 3 },
  "math/grade-6": { generators: 3, forms: 3 },
  "math/grade-7": { generators: 3, forms: 3 },
  "math/grade-8": { generators: 3, forms: 3 },
  "math/algebra-1": { generators: 3, forms: 3 },
  "math/geometry": { generators: 3, forms: 3 },
};

/**
 * What a generator asks, reduced to something comparable.
 *
 * The kind, plus a rough shape of the prompt: the leading words carry the verb
 * ("Solve", "Place", "What is the slope of") and that is what distinguishes
 * one ask from another. Numbers are stripped, because rolling new digits is
 * exactly the thing that must not count as a new form.
 */
/**
 * The shapes one generator can produce, over enough seeds to catch a branch.
 *
 * Deliberately the same rule the dealer groups on — imported rather than
 * reimplemented, because a check that measures forms differently from the way
 * the deal groups them will happily report three forms while the session
 * serves one.
 */
function forms(subunitId: string, generator: number): string[] {
  const shapes = new Set<string>();

  for (let i = 0; i < SEEDS; i++) {
    const seed = Math.imul(generator * 7919 + i, 2654435761) >>> 0;
    const made = resolveInstance(instanceId(subunitId, generator, seed));
    if (made) shapes.add(questionShape(made.question));
  }

  return [...shapes];
}

/** Enough deals that one lucky rotation does not flatter a subunit. */
const DEALS = 10;

/** The length of session the deal is measured over. */
const SESSION = 10;

/**
 * The share a ten-question session gives to its commonest shape.
 *
 * 1.0 means every question was the same shape — the thing that reads as a bug
 * rather than as revision. This measures the dealer and the inventory
 * together, which is the point: it is what the student gets.
 */
function dealShare(subunitId: string): number {
  let total = 0;
  for (let i = 0; i < DEALS; i++) {
    const dealt = mintInstances(subunitId, SESSION);
    if (!dealt.length) return 1;
    const counts = new Map<string, number>();
    for (const q of dealt) {
      const key = questionShape(q);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    total += Math.max(...counts.values()) / dealt.length;
  }
  return total / DEALS;
}

type Row = {
  course: Course;
  subunits: {
    id: string;
    name: string;
    generators: number;
    forms: number;
    deal: number;
  }[];
};

const rows: Row[] = [];

for (const subject of SUBJECTS) {
  for (const course of subject.courses) {
    const subunits = course.units
      .flatMap((u) => u.subunits)
      .map((su) => {
        const count = GENERATED[su.id]?.length ?? 0;
        const shapes = new Set<string>();
        for (let g = 0; g < count; g++) {
          for (const shape of forms(su.id, g)) shapes.add(shape);
        }
        return {
          id: su.id,
          name: su.name,
          generators: count,
          // A subunit stocked from a written bank rather than generators has
          // as many forms as it has questions, which is not comparable; it is
          // reported as one and excluded from the floors below.
          forms: count === 0 ? 0 : shapes.size,
          deal: count === 0 ? 1 : dealShare(su.id),
        };
      })
      .filter((s) => s.generators > 0);

    if (subunits.length) rows.push({ course, subunits });
  }
}

const bucket = (n: number) => (n >= 3 ? "3+" : String(n));

console.log("");
console.log(
  "course".padEnd(17) +
    "subunits".padStart(9) +
    "gens".padStart(6) +
    "    generators per subunit      forms per subunit    deal",
);
console.log(
  " ".repeat(17) +
    " ".repeat(9) +
    " ".repeat(6) +
    "      1     2    3+            1     2    3+   commonest",
);

const failures: string[] = [];

for (const { course, subunits } of rows) {
  const gens = { "1": 0, "2": 0, "3+": 0 } as Record<string, number>;
  const forms = { "1": 0, "2": 0, "3+": 0 } as Record<string, number>;

  for (const s of subunits) {
    gens[bucket(s.generators)]++;
    forms[bucket(s.forms)]++;
  }

  const floor = FLOORS[course.id];
  const short = floor
    ? subunits.filter(
        (s) => s.generators < floor.generators || s.forms < floor.forms,
      )
    : [];

  console.log(
    course.name.padEnd(17) +
      String(subunits.length).padStart(9) +
      String(subunits.reduce((n, s) => n + s.generators, 0)).padStart(6) +
      String(gens["1"]).padStart(7) +
      String(gens["2"]).padStart(6) +
      String(gens["3+"]).padStart(6) +
      String(forms["1"]).padStart(13) +
      String(forms["2"]).padStart(6) +
      String(forms["3+"]).padStart(6) +
      `${Math.round(
        (subunits.reduce((n, s) => n + s.deal, 0) / subunits.length) * 100,
      )}%`.padStart(11) +
      (floor ? (short.length ? "   under floor" : "   at floor") : ""),
  );

  for (const s of short) {
    failures.push(
      `${s.id}  ${s.generators} generator(s), ${s.forms} form(s) — floor is ${floor!.generators} and ${floor!.forms}  · ${s.name}`,
    );
  }
}

console.log("");

if (failures.length) {
  for (const f of failures.slice(0, 40)) console.log(`  ${f}`);
  if (failures.length > 40) console.log(`  … and ${failures.length - 40} more`);
  console.log("");
  console.log(
    `${failures.length} subunit(s) under the floor their course has committed to.`,
  );
  process.exit(1);
}

const gated = Object.keys(FLOORS).length;
console.log(
  gated
    ? `Every course with an agreed floor is at it. ${gated} of ${rows.length} are gated.`
    : "No course has an agreed floor yet — this run is a report only.",
);
