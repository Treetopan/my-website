"use client";

import { Feedback } from "@/components/feedback";
import { MathText } from "@/components/math-text";
import { answerOf, givenOf, ranOut, type AnswerDetail } from "@/lib/review";

/**
 * The questions to go back to, with the right answer beside what was given.
 *
 * Shared by every end-of-session screen. A missed question reads the same way
 * whether it was missed in a race, at a table or on a practice set — the game
 * is what happened around it, not what was wrong with the answer.
 */
export function ReviewList({
  details,
  open,
}: {
  /** Only the missed ones. A caller that passes everything gets everything. */
  details: AnswerDetail[];
  open?: boolean;
}) {
  if (details.length === 0) return null;

  return (
    <details className="box px-5 py-4" open={open}>
      <summary className="cursor-pointer text-[14px] font-medium">
        {details.length} question{details.length === 1 ? "" : "s"} to review
      </summary>

      <ul className="mt-5 flex flex-col gap-5">
        {details.map((d) => (
          <li key={d.questionId} className="flex flex-col gap-2">
            <p className="text-[14.5px] leading-snug">
              <MathText text={d.question.prompt} />
            </p>

            <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
              <span className="eyebrow text-correct">Answer</span>
              <span className="text-ink">
                <MathText text={answerOf(d)} />
              </span>
            </p>

            <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
              <span className="eyebrow text-out">
                {ranOut(d) ? "Ran out" : "You said"}
              </span>
              <span className="text-muted">
                {ranOut(d) ? "no answer given" : <MathText text={givenOf(d)} />}
              </span>

              {/* A part-marked answer was not simply wrong, and a review that
                  lists it beside a blank one says the wrong thing. */}
              {d.score > 0 && (
                <span className="font-mono text-[11px] text-muted tnum">
                  · {Math.round(d.score * 100)}% of the marks
                </span>
              )}
            </p>

            {/* The same explanation the reveal gave, still here at the end of
                the session — a student who was watching the clock the first
                time reads it properly now. */}
            <Feedback
              question={d.question}
              reveal={d.reveal}
              response={d.response}
              steps={d.steps}
              tight
            />

            <span className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">
              {d.topic}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
