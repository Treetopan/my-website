"use client";

import type { Question } from "@/lib/curriculum";
import { diagnose } from "@/lib/coaching";
import type { Response, Reveal } from "@/lib/questions";

/**
 * Why the answer was wrong, shown under a missed question.
 *
 * Two lines at most, and they come from two different places on purpose. The
 * first is worked out here, in the browser, from the reveal and the response
 * the client already holds — it costs nothing to send and describes *this*
 * attempt. The second arrives from the server with the verdict and names the
 * rule the question was testing.
 *
 * Nothing renders when there is nothing worth saying. On a multiple-choice
 * question the right option is already lit up on the screen, so the diagnosis
 * stays quiet and only the rule appears; on a question with no rule on file
 * only the diagnosis does; and a correct answer never gets here at all.
 */
export function Feedback({
  question,
  reveal,
  response,
  steps,
  tight,
}: {
  question: Question;
  reveal: Reveal;
  response: Response;
  /** From the server, only ever on a miss. The rule, or worked steps. */
  steps?: string[];
  /** Denser, for the stacked list in the post-game summary. */
  tight?: boolean;
}) {
  const said = diagnose(question, reveal, response);
  const lines = said ? [said, ...(steps ?? [])] : (steps ?? []);
  if (lines.length === 0) return null;

  if (tight) {
    return (
      <ul className="flex flex-col gap-1 border-l-2 border-line pl-3">
        {lines.map((line) => (
          <li key={line} className="text-[13px] leading-snug text-muted">
            {line}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="box mt-6 px-5 py-4">
      <p className="eyebrow mb-2.5">Why</p>
      <ul className="flex flex-col gap-1.5">
        {lines.map((line) => (
          <li key={line} className="text-[14px] leading-snug text-muted">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
