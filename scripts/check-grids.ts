/**
 * Every grid shows the answer that goes on it.
 *
 * A `point` or `line` question now declares the window it is drawn on, and a
 * window is a claim about the numbers the generator rolls: `firstQuadrant()`
 * says this template never produces a negative coordinate. Nothing enforces
 * that at the type level, and getting it wrong is not a rendering nit — the
 * answer would sit outside the picture, unreachable, and every round of that
 * subunit would be unanswerable.
 *
 * So the claim is checked the only way it can be: by rolling each generator a
 * few thousand times and looking at where the answer lands. The same pass
 * checks the marks a figure carries, because a labelled point off the edge of
 * its own graph is the same bug wearing different clothes.
 *
 * Run with `npm run check:grids`.
 */

import { frameOf, type Frame, type Question } from "../lib/questions";
import { GENERATED } from "../lib/templates";
import { resolveInstance } from "../lib/templates.server";
import { instanceId } from "../lib/templates";

/** Enough rolls that a range which only rarely goes negative still shows it. */
const ROLLS = 3000;

let failures = 0;

function inside(frame: Frame, x: number, y: number): boolean {
  return x >= frame.minX && x <= frame.maxX && y >= frame.minY && y <= frame.maxY;
}

/** Where a question's answer has to be, and where its figure has to fit. */
function windowOf(question: Question): Frame | null {
  if (question.kind === "point" || question.kind === "line") {
    return frameOf(question.span, question.frame);
  }
  return question.figure ? frameOf(question.figure.span, question.figure.frame) : null;
}

for (const [subunitId, topics] of Object.entries(GENERATED)) {
  topics.forEach((_topic, generator) => {
    /** One complaint per generator: the first bad roll says everything. */
    let reported = false;

    for (let seed = 1; seed <= ROLLS && !reported; seed++) {
      const made = resolveInstance(instanceId(subunitId, generator, seed));
      if (!made) continue;

      const { question, answer } = made;
      const frame = windowOf(question);
      if (!frame) continue;

      const complain = (what: string) => {
        failures++;
        reported = true;
        console.error(
          `  ${subunitId} #${generator}: ${what}\n      ${question.prompt}\n` +
            `      window x ${frame.minX}..${frame.maxX}, y ${frame.minY}..${frame.maxY}`,
        );
      };

      if (answer.kind === "point" && !inside(frame, answer.at.x, answer.at.y)) {
        complain(`answer (${answer.at.x}, ${answer.at.y}) is off the grid`);
        continue;
      }

      if (answer.kind === "line") {
        // A line is drawn by dragging two handles, and a handle can only be
        // put on a lattice point inside the window — so the line is drawable
        // exactly when two of its own lattice points are in view. It may leave
        // the grid at the edges; that is what a line does.
        let reachable = 0;
        for (let x = Math.ceil(frame.minX); x <= frame.maxX; x++) {
          const y = answer.slope * x + answer.intercept;
          if (Number.isInteger(y) && y >= frame.minY && y <= frame.maxY) reachable++;
          if (reachable >= 2) break;
        }
        if (reachable < 2) {
          complain("the line cannot be drawn: fewer than two of its points are on the grid");
          continue;
        }
      }

      for (const mark of question.figure?.marks ?? []) {
        if (!inside(frame, mark.at.x, mark.at.y)) {
          complain(`marked point (${mark.at.x}, ${mark.at.y}) is off the figure`);
          break;
        }
      }
    }
  });
}

if (failures > 0) {
  console.error(`\n${failures} generator${failures === 1 ? "" : "s"} draw off their own grid.`);
  process.exit(1);
}

console.log("Every point, line and mark lands inside the grid it is drawn on.");
