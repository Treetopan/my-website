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
 * Empty at the moment: every stocked course is generated, and a generated
 * question carries its answer in its id rather than in a key (see
 * `lib/templates.server.ts`). The key stays because a written bank is still a
 * shape the grader accepts — add rows here when one is written.
 */
export const ANSWERS: Record<string, number> = {};

export function answerFor(questionId: string): number | undefined {
  return ANSWERS[questionId];
}
