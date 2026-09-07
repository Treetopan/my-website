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
              perEntry={d.perEntry}
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

/**
 * The ones that passed without being exact.
 *
 * Deliberately not part of the review list above, which means "you got this
 * wrong" — a near miss folded in there would dilute the one signal on this
 * screen worth acting on first. But it cannot be nothing either: the reveal
 * told the student "Close — 80% of the marks", and until this existed the end
 * screen then showed them a list they were not on and a line saying there was
 * nothing to review.
 *
 * Shorter than the review list on purpose. There is no method to explain — the
 * method worked — so it is the question, the two values, and how far apart
 * they were.
 */
export function CloseList({ details }: { details: AnswerDetail[] }) {
  if (details.length === 0) return null;

  return (
    <details className="box px-5 py-4" open>
      <summary className="cursor-pointer text-[14px] font-medium">
        {details.length} close one{details.length === 1 ? "" : "s"}
      </summary>

      <p className="mt-2 text-[13px] text-muted">
        Marked right, and not quite exact.
      </p>

      <ul className="mt-4 flex flex-col gap-4">
        {details.map((d) => (
          <li key={d.questionId} className="flex flex-col gap-1.5">
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
              <span className="eyebrow text-muted">You said</span>
              <span className="text-muted">
                <MathText text={givenOf(d)} />
              </span>
              <span className="font-mono text-[11px] text-muted tnum">
                · {Math.round(d.score * 100)}% of the marks
              </span>
            </p>

            {/* A close one on a proximity kind has nothing to explain — the
                placement was inside the radius that counts as right. A close
                one on a matrix has three right entries and one wrong, and the
                wrong one is the whole reason this list exists. `Feedback`
                renders nothing when there is nothing on file, so this is the
                distinction rather than a condition on the kind. */}
            <Feedback
              question={d.question}
              reveal={d.reveal}
              response={d.response}
              steps={d.steps}
              perEntry={d.perEntry}
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
