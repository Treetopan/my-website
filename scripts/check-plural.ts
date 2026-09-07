/**
 * No question says "1 units".
 *
 * Every generator builds its prompt out of numbers it has just rolled, and a
 * range that reaches down to one will eventually produce "1 units up",
 * "1 blocks east", "1 columns". It reads as a typo in the question rather than
 * as a question, on a screen where the student is being asked to trust that
 * the question is right.
 *
 * A grep cannot find these — the text is assembled at run time — so this rolls
 * every generator a few thousand times and reads what actually comes out.
 * `plural()` in the kit is the fix.
 *
 * Run with `npm run check:plural`.
 */

import { GENERATED, instanceId } from "../lib/templates";
import { resolveInstance } from "../lib/templates.server";

const ROLLS = 3000;

/** "1 somethings", where the something is not a verb or a preposition. */
const SUSPECT = /(?:^|[^\d.])1 ([a-z]+s)\b/g;

/**
 * Words that end in s without being plurals. Everything here is a verb or a
 * preposition that happens to follow a number — "y = x + 1 passes through",
 * "the digit 1 sits in", "1 as an addition". A word only belongs here because
 * it cannot be a count of anything.
 */
const NOT_A_COUNT = new Set([
  "as",
  "converges",
  "cross",
  "crosses",
  "diverges",
  "factors",
  "gives",
  "goes",
  "has",
  "is",
  "less",
  "lies",
  "meets",
  "minus",
  "passes",
  "plus",
  "sits",
  "times",
  "versus",
  "was",
]);

let failures = 0;

for (const [subunitId, topics] of Object.entries(GENERATED)) {
  topics.forEach((_topic, generator) => {
    let reported = false;

    for (let seed = 1; seed <= ROLLS && !reported; seed++) {
      const made = resolveInstance(instanceId(subunitId, generator, seed));
      if (!made) continue;

      const question = made.question;
      const texts = [
        question.prompt,
        ...(question.kind === "choice" ? question.options : []),
        ...(question.kind === "order" ? question.items : []),
      ];

      for (const text of texts) {
        for (const hit of text.matchAll(SUSPECT)) {
          // No English plural ends in a double s, so "success" and "across"
          // are never a miscount however they got there.
          if (NOT_A_COUNT.has(hit[1]) || /ss$/.test(hit[1])) continue;
          failures++;
          reported = true;
          console.error(`  ${subunitId} #${generator}: "1 ${hit[1]}"\n      ${text}`);
          break;
        }
        if (reported) break;
      }
    }
  });
}

if (failures > 0) {
  console.error(
    `\n${failures} generator${failures === 1 ? "" : "s"} count one of something in the plural.`,
  );
  process.exit(1);
}

console.log("No generator says 1 of anything in the plural.");
