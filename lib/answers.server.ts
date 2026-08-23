import "server-only";

/**
 * The answer key. This module must never reach the browser.
 *
 * The `server-only` import makes that a build error rather than a code-review
 * question: importing this from a Client Component fails the build. Question
 * text and options stay in `lib/curriculum.ts` because they are public — a
 * student is meant to read them. Only the index of the correct option lives
 * here, and it is never serialised to the client.
 *
 * Generated from the curriculum. Regenerate if question order ever changes.
 */
export const ANSWERS: Record<string, number> = {
  "science/ap-biology/unit-1/1.1/q0": 0,
  "science/ap-biology/unit-1/1.1/q1": 1,
  "science/ap-biology/unit-1/1.1/q2": 1,
  "science/ap-biology/unit-1/1.1/q3": 1,
  "science/ap-biology/unit-1/1.1/q4": 1,
  "science/ap-biology/unit-1/1.2/q0": 0,
  "science/ap-biology/unit-1/1.2/q1": 1,
  "science/ap-biology/unit-1/1.2/q2": 0,
  "science/ap-biology/unit-1/1.2/q3": 1,
  "science/ap-biology/unit-1/1.2/q4": 2,
  "science/ap-biology/unit-1/1.3/q0": 1,
  "science/ap-biology/unit-1/1.3/q1": 1,
  "science/ap-biology/unit-1/1.3/q2": 0,
  "science/ap-biology/unit-1/1.3/q3": 1,
  "science/ap-biology/unit-1/1.3/q4": 1,
  "science/ap-biology/unit-2/2.1/q0": 0,
  "science/ap-biology/unit-2/2.1/q1": 1,
  "science/ap-biology/unit-2/2.1/q2": 1,
  "science/ap-biology/unit-2/2.1/q3": 0,
  "science/ap-biology/unit-2/2.1/q4": 1,
  "science/ap-biology/unit-2/2.2/q0": 0,
  "science/ap-biology/unit-2/2.2/q1": 1,
  "science/ap-biology/unit-2/2.2/q2": 2,
  "science/ap-biology/unit-2/2.2/q3": 3,
  "science/ap-biology/unit-2/2.2/q4": 0,
  "science/ap-biology/unit-2/2.3/q0": 1,
  "science/ap-biology/unit-2/2.3/q1": 1,
  "science/ap-biology/unit-2/2.3/q2": 1,
  "science/ap-biology/unit-2/2.3/q3": 1,
  "science/ap-biology/unit-2/2.3/q4": 1,
  "history/ap-world/unit-1/1.1/q0": 1,
  "history/ap-world/unit-1/1.1/q1": 1,
  "history/ap-world/unit-1/1.1/q2": 1,
  "history/ap-world/unit-1/1.1/q3": 1,
  "history/ap-world/unit-1/1.1/q4": 0,
  "history/ap-world/unit-1/1.2/q0": 1,
  "history/ap-world/unit-1/1.2/q1": 1,
  "history/ap-world/unit-1/1.2/q2": 1,
  "history/ap-world/unit-1/1.2/q3": 0,
  "history/ap-world/unit-1/1.2/q4": 1,
  "history/ap-world/unit-1/1.3/q0": 1,
  "history/ap-world/unit-1/1.3/q1": 0,
  "history/ap-world/unit-1/1.3/q2": 1,
  "history/ap-world/unit-1/1.3/q3": 1,
  "history/ap-world/unit-1/1.3/q4": 0,
  "history/ap-world/unit-2/2.1/q0": 1,
  "history/ap-world/unit-2/2.1/q1": 0,
  "history/ap-world/unit-2/2.1/q2": 0,
  "history/ap-world/unit-2/2.1/q3": 1,
  "history/ap-world/unit-2/2.1/q4": 1,
  "history/ap-world/unit-2/2.2/q0": 1,
  "history/ap-world/unit-2/2.2/q1": 1,
  "history/ap-world/unit-2/2.2/q2": 1,
  "history/ap-world/unit-2/2.2/q3": 1,
  "history/ap-world/unit-2/2.2/q4": 0,
  "history/ap-world/unit-2/2.3/q0": 1,
  "history/ap-world/unit-2/2.3/q1": 0,
  "history/ap-world/unit-2/2.3/q2": 1,
  "history/ap-world/unit-2/2.3/q3": 1,
  "history/ap-world/unit-2/2.3/q4": 1,
  "math/ap-statistics/unit-1/1.1/q0": 1,
  "math/ap-statistics/unit-1/1.1/q1": 1,
  "math/ap-statistics/unit-1/1.1/q2": 0,
  "math/ap-statistics/unit-1/1.1/q3": 1,
  "math/ap-statistics/unit-1/1.1/q4": 1,
  "math/ap-statistics/unit-1/1.2/q0": 1,
  "math/ap-statistics/unit-1/1.2/q1": 1,
  "math/ap-statistics/unit-1/1.2/q2": 1,
  "math/ap-statistics/unit-1/1.2/q3": 1,
  "math/ap-statistics/unit-1/1.2/q4": 1,
  "math/ap-statistics/unit-1/1.3/q0": 0,
  "math/ap-statistics/unit-1/1.3/q1": 0,
  "math/ap-statistics/unit-1/1.3/q2": 0,
  "math/ap-statistics/unit-1/1.3/q3": 0,
  "math/ap-statistics/unit-1/1.3/q4": 2,
};

export function answerFor(questionId: string): number | undefined {
  return ANSWERS[questionId];
}
