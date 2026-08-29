/**
 * Hammers every question generator.
 *
 * Generated questions fail differently from written ones. A bank question is
 * either right or wrong the day it is authored and stays that way; a generator
 * is right for most of its parameter range and wrong for the corner of it
 * nobody tried — the seed where two distractors collapse into the same value,
 * or where a coefficient of 1 renders as "1x", or where a denominator goes to
 * zero. Those only surface under volume, so: volume.
 *
 * Run with `npm run check:templates`.
 */

import {
  GENERATED,
  instanceId,
  parseInstanceId,
  spatialGenerators,
} from "../lib/templates";
import { resolveInstance } from "../lib/templates.server";
import { getSubunit, type Question } from "../lib/curriculum";
import type { Answer } from "../lib/grading.server";

const SEEDS_PER_GENERATOR = 20_000;

/** The kinds answered by placing something rather than typing or choosing. */
const PLACED = new Set(["point", "slider", "line", "order"]);

/**
 * Seeds are swept deterministically rather than rolled at random. A check that
 * explores a different corner of the parameter space on every run reports a
 * failure nobody can reproduce and then hides it again on the retry — so the
 * same seeds every time, spread by Knuth multiplicative hashing.
 */
function sweepSeed(generator: number, i: number): number {
  return (Math.imul(generator * SEEDS_PER_GENERATOR + i, 2654435761) >>> 0);
}

type Failure = { where: string; seed: number; why: string; detail?: string };

/**
 * Everything a student will actually read on a question, whatever kind it is.
 * The rendering checks care about text on the screen, and where that text
 * lives differs by kind — options for multiple choice, the revealed answer for
 * the rest.
 */
function visibleText(question: Question, answer: Answer): string[] {
  const out: string[] = [];
  if (question.figure?.caption) out.push(question.figure.caption);
  if (question.kind === "choice") out.push(...question.options);
  if (question.kind === "fill" && question.hint) out.push(question.hint);
  if (question.kind === "slider" || question.kind === "fill") {
    if (question.unit) out.push(question.unit);
  }
  if (answer.kind === "fill") out.push(answer.show, ...answer.accept);
  if (answer.kind === "slider") out.push(String(answer.value));
  if (answer.kind === "point") out.push(`(${answer.at.x}, ${answer.at.y})`);
  if (answer.kind === "line") {
    out.push(String(answer.slope), String(answer.intercept));
  }
  // Every step of an ordering is on the screen from the moment it is asked, so
  // all of them are read for the same smells as an option would be.
  if (question.kind === "order") out.push(...question.items);
  return out;
}

/** One line showing what the answer is, in whatever form the kind takes. */
function sampleAnswer(question: Question, answer: Answer): string {
  switch (answer.kind) {
    case "choice":
      return question.kind === "choice"
        ? question.options
            .map((o, i) => (i === answer.index ? `[*${o}]` : `[ ${o}]`))
            .join(" ")
        : "?";
    case "fill":
      return `= ${answer.show}   (also accepts ${answer.accept.join(", ")})`;
    case "slider":
      return question.kind === "slider"
        ? `= ${answer.value}   on [${question.min}, ${question.max}] step ${question.step}, full within ±${answer.full}`
        : `= ${answer.value}`;
    case "point":
      return `= (${answer.at.x}, ${answer.at.y})   on a ±${question.kind === "point" ? question.span : "?"} grid`;
    case "line":
      return `= y = ${answer.slope}x ${answer.intercept < 0 ? "-" : "+"} ${Math.abs(answer.intercept)}`;
    case "order":
      return question.kind === "order"
        ? answer.order.map((i, at) => `${at + 1}. ${question.items[i]}`).join("  ")
        : "?";
  }
}

const failures: Failure[] = [];
let checked = 0;

/** Ugly output that is technically valid: the difference between working and done. */
const SMELLS: [RegExp, string][] = [
  [/\b1x\b/, "coefficient of 1 written out"],
  [/\+ -|- -|\+\+|--/, "doubled sign"],
  [/\d\.\d{4,}/, "unrounded decimal"],
  [/NaN|Infinity|undefined\^|\^undefined/, "non-numeric value"],
  [/\/0\b/, "division by zero"],
  [/√-|√0\b/, "root of a negative or zero"],
  // "81/2π" reads as 81/(2π). The π belongs in the numerator: "81π/2".
  [/\d\/\d+π/, "fraction written in front of π"],
];

for (const [subunitId, topics] of Object.entries(GENERATED)) {
  // A generator attached to a subunit id that does not exist is invisible: the
  // library never offers it, so it is never played and never noticed.
  if (!getSubunit(subunitId)) {
    failures.push({
      where: subunitId,
      seed: 0,
      why: "no such subunit in the curriculum",
    });
    continue;
  }

  for (let g = 0; g < topics.length; g++) {
    const where = `${subunitId} [${g}] ${topics[g]}`;

    /** How many of this generator's seeds asked for a placed answer. */
    let placed = 0;

    for (let i = 0; i < SEEDS_PER_GENERATOR; i++) {
      const seed = sweepSeed(g, i);
      const id = instanceId(subunitId, g, seed);

      let made;
      try {
        made = resolveInstance(id);
      } catch (e) {
        failures.push({
          where,
          seed,
          why: e instanceof Error ? e.message : String(e),
        });
        continue;
      }

      if (!made) {
        failures.push({ where, seed, why: "did not resolve" });
        continue;
      }

      checked++;
      const { question, answer } = made;
      if (PLACED.has(question.kind)) placed++;
      const fail = (why: string) =>
        failures.push({ where, seed, why, detail: question.prompt });

      if (!question.prompt.trim()) fail("empty prompt");
      if (question.kind !== answer.kind) {
        fail(`${question.kind} question with a ${answer.kind} answer`);
      }

      // Every string a student will read, whatever kind of question it is.
      const shown = [question.prompt, ...visibleText(question, answer)];

      for (const [pattern, why] of SMELLS) {
        const bad = shown.find((t) => pattern.test(t));
        if (bad) fail(`${why}: ${bad}`);
      }

      // Shape, per kind.
      if (question.kind === "choice" && answer.kind === "choice") {
        if (question.options.length !== 4) {
          fail(`${question.options.length} options, expected 4`);
        }
        if (new Set(question.options).size !== question.options.length) {
          fail(`duplicate options: ${question.options.join(" | ")}`);
        }
        if (answer.index < 0 || answer.index >= question.options.length) {
          fail(`answer index ${answer.index} out of range`);
        }
        if (question.options.some((o) => !String(o).trim())) fail("empty option");

        // A distractor orders of magnitude away from the answer is not a
        // distractor — it is a giveaway. Usually it means an exponent got into
        // a wrong option meant to be a slip, not a different calculation.
        const magnitudes = question.options
          .map((o) => Math.abs(Number(o.replace(/[^\d.eE+-]/g, ""))))
          .filter((v) => Number.isFinite(v) && v > 0);
        if (magnitudes.length > 1) {
          const biggest = Math.max(...magnitudes);
          const smallest = Math.min(...magnitudes);
          if (biggest > 1e6 && biggest / smallest > 1e4) {
            fail(`option out of scale: ${question.options.join(" | ")}`);
          }
        }
      }

      if (answer.kind === "fill") {
        if (!answer.show.trim()) fail("nothing to reveal as the answer");
        if (!answer.accept.length) fail("no accepted answers");
        if (!answer.accept.includes(answer.show)) {
          fail(`the revealed answer "${answer.show}" is not itself accepted`);
        }
      }

      if (question.kind === "slider" && answer.kind === "slider") {
        if (question.min >= question.max) fail("slider range is empty");
        if (question.step <= 0) fail("slider step is not positive");
        // An answer off the end of the track cannot be reached at all, and one
        // off the step grid cannot be landed on exactly.
        if (answer.value < question.min || answer.value > question.max) {
          fail(`answer ${answer.value} is outside the slider's range`);
        }
        const offGrid =
          Math.abs(
            (answer.value - question.min) / question.step -
              Math.round((answer.value - question.min) / question.step),
          ) > 1e-9;
        if (offGrid && answer.full < question.step / 2) {
          fail(`answer ${answer.value} is unreachable on a ${question.step} step`);
        }
        if (answer.full >= answer.zero) fail("slider scores nothing anywhere");
      }

      if (question.kind === "point" && answer.kind === "point") {
        if (
          Math.abs(answer.at.x) > question.span ||
          Math.abs(answer.at.y) > question.span
        ) {
          fail(`answer (${answer.at.x}, ${answer.at.y}) is off a ${question.span} grid`);
        }
        if (!Number.isInteger(answer.at.x) || !Number.isInteger(answer.at.y)) {
          fail("answer is not on a whole grid point, but the grid snaps to one");
        }
        if (answer.full >= answer.zero) fail("point scores nothing anywhere");
      }

      if (question.kind === "line" && answer.kind === "line") {
        // The handles snap to whole grid points, so what matters is not
        // whether the line crosses the grid but whether two snappable points
        // sit on it. A steep line can run off both edges and still be perfectly
        // drawable through the middle; a line that only clips one corner is
        // not, however visible it looks.
        const span = question.span;
        let landable = 0;
        for (let x = -span; x <= span; x++) {
          const y = answer.slope * x + answer.intercept;
          if (Number.isInteger(y) && Math.abs(y) <= span) landable++;
        }
        if (landable < 2) {
          fail(`only ${landable} grid point(s) lie on the line, so it cannot be drawn`);
        }
        if (answer.full >= answer.zero) fail("line scores nothing anywhere");
      }

      // Figures. A figure that misses the grid it is drawn on, or that runs to
      // thousands of points, is not wrong in a way any of the checks above can
      // see: the question still grades correctly and the picture is still a
      // picture. It is just the wrong picture, or one too big to send.
      if (question.figure) {
        const figure = question.figure;
        if (figure.span <= 0) fail("figure has no extent");

        // The answer and the drawing have to share one grid, or the point you
        // place is not on the curve you were shown.
        if (
          (question.kind === "point" || question.kind === "line") &&
          figure.span !== question.span
        ) {
          fail(`figure spans ±${figure.span} but the grid spans ±${question.span}`);
        }

        for (const curve of figure.curves) {
          if (curve.points.length < 2) fail("a curve with fewer than two points");
          const wild = curve.points.find(
            (p) => !Number.isFinite(p.x) || !Number.isFinite(p.y),
          );
          if (wild) fail(`a curve leaves the number line: (${wild.x}, ${wild.y})`);
        }

        // Every figure is written into the room at kick-off and read by every
        // player, so a generator that samples enthusiastically is a bandwidth
        // bill on someone's phone. Ten of these is the size of a room.
        const weight = JSON.stringify(figure).length;
        if (weight > 12_000) fail(`figure is ${(weight / 1024).toFixed(1)}KB, too heavy to send`);

        for (const mark of figure.marks ?? []) {
          if (
            Math.abs(mark.at.x) > figure.span ||
            Math.abs(mark.at.y) > figure.span
          ) {
            fail(`mark at (${mark.at.x}, ${mark.at.y}) is off a ±${figure.span} grid`);
          }
        }
      }

      // Determinism — the whole grading model rests on this. If a second run
      // of the same seed differs, the answer handed back at grading time is
      // not the answer to the question that was actually asked.
      const again = resolveInstance(id);
      if (
        !again ||
        JSON.stringify(again.answer) !== JSON.stringify(answer) ||
        JSON.stringify(again.question) !== JSON.stringify(question)
      ) {
        fail("not deterministic for the same seed");
      }

      // Id round-trip, since grading starts from the id and nothing else.
      const ref = parseInstanceId(question.id);
      if (!ref || ref.subunitId !== subunitId || ref.generator !== g || ref.seed !== seed) {
        fail(`id does not round-trip: ${question.id}`);
      }
    }

    // The public list of placed-answer generators, against what this one
    // actually produces. The duel reads that list to decide which subunits it
    // can be played on and which generators to deal from, and the list lives
    // on the public side because the library needs it before a game starts —
    // so it is checked here rather than trusted.
    //
    // All three ways of disagreeing matter. A generator declared and never
    // placed would offer a duel that cannot be settled; one placed and not
    // declared is a duel quietly missing from the library; and one that is
    // placed on some seeds and not others would seed a duel with a question
    // it cannot settle, however it were declared.
    const declared = spatialGenerators(subunitId).includes(g);
    // Seed zero: this is a fact about the generator rather than about any one
    // roll of it, so there is no seed to point at.
    const disagreement =
      placed === 0 && declared
        ? "declared as answered on a grid, but never is"
        : placed === SEEDS_PER_GENERATOR && !declared
          ? "always answered on a grid, but is not declared as such"
          : placed > 0 && placed < SEEDS_PER_GENERATOR
            ? `answered on a grid on only ${placed} of ${SEEDS_PER_GENERATOR} seeds, so it is neither`
            : null;

    if (disagreement) failures.push({ where, seed: 0, why: disagreement });
  }
}

// Ids that must not resolve. The grader falls through to the bank when an id
// is not an instance, so a bank id passing as one would grade against the
// wrong answer entirely.
const MUST_NOT_RESOLVE = [
  "math/ap-statistics/unit-1/1.1/q0",
  "math/algebra-1/unit-1/1.6/gen/99/abc",
  "math/algebra-1/unit-1/1.6/gen/-1/abc",
  "math/algebra-1/unit-9/9.9/gen/0/abc",
  "gen/0/abc",
  "",
];

for (const id of MUST_NOT_RESOLVE) {
  if (resolveInstance(id)) {
    failures.push({ where: "id validation", seed: 0, why: `resolved: ${id}` });
  }
}

// ─── Report ──────────────────────────────────────────────

const generators = Object.values(GENERATED).reduce((n, t) => n + t.length, 0);

if (failures.length) {
  // Grouped by generator and by kind of failure. One bad parameter combination
  // shows up thousands of times, and a flat list of it buries the other bugs.
  const byGenerator = new Map<string, Map<string, Failure[]>>();
  for (const f of failures) {
    const kind = f.why.replace(/-?\d+/g, "N");
    const kinds = byGenerator.get(f.where) ?? new Map<string, Failure[]>();
    kinds.set(kind, [...(kinds.get(kind) ?? []), f]);
    byGenerator.set(f.where, kinds);
  }

  const rate = ((failures.length / checked) * 100).toFixed(2);
  console.error(
    `\n${failures.length} failure(s) across ${checked} instances (${rate}%):\n`,
  );

  for (const [where, kinds] of byGenerator) {
    console.error(`  ${where}`);
    for (const [kind, hits] of kinds) {
      console.error(`    ${hits.length}x  ${kind}`);
      for (const hit of hits.slice(0, 3)) {
        console.error(`          e.g. seed ${hit.seed}: ${hit.detail ?? hit.why}`);
      }
    }
  }
  console.error("");
  process.exit(1);
}

console.log(
  `\nOK — ${checked} instances from ${generators} generators across ` +
    `${Object.keys(GENERATED).length} subunits.\n`,
);

// A sample of each generator's output, so a human can check the maths rather
// than only the mechanics. The starred option is the one graded correct.
if (process.argv.includes("--samples")) {
  for (const [subunitId, topics] of Object.entries(GENERATED)) {
    for (let g = 0; g < topics.length; g++) {
      const made = resolveInstance(instanceId(subunitId, g, sweepSeed(g, 7)));
      if (!made) continue;
      console.log(`${subunitId} · ${topics[g]}  (${made.question.kind})`);
      console.log(`  ${made.question.prompt}`);
      console.log(`  ${sampleAnswer(made.question, made.answer)}\n`);
    }
  }
}
