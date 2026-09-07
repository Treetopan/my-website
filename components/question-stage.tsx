"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/lib/curriculum";
import {
  wantsExplaining,
  emptyResponse,
  type Point,
  type Response,
  type Reveal,
} from "@/lib/questions";
import {
  FillAnswer,
  LineAnswer,
  MatrixAnswer,
  OrderAnswer,
  PointAnswer,
  SliderAnswer,
  type Rival,
} from "@/components/answer-inputs";
import { FigureView } from "@/components/graph";
import { MathText } from "@/components/math-text";
import { Feedback } from "@/components/feedback";

/**
 * The question is the hero on both game screens, so it lives in one place and
 * both games hand it the same props. Everything about game state — track,
 * turn order, elimination — is the caller's business and sits in the periphery.
 *
 * The caller holds the draft rather than this component, because the clock
 * lives out there: when time runs out the game submits whatever the draft holds,
 * and that only works if the game can see it.
 */
export function QuestionStage({
  question,
  eyebrow,
  draft,
  reveal,
  score,
  steps,
  perEntry,
  disabled,
  steady,
  rival,
  onDraft,
  onSubmit,
}: {
  question: Question;
  eyebrow: string;
  /** What the student has entered so far, of the question's own kind. */
  draft: Response;
  /**
   * The right answer, or null while the question is still live. The client has
   * no answer key — this arrives from the server once the question has been
   * graded, which is also what makes it the reveal signal.
   */
  reveal: Reveal | null;
  /** What the answer scored, once graded. Between 0 and 1 on the proximity kinds. */
  score: number | null;
  /**
   * Why it was wrong, from the server. Arrives with the verdict on a miss and
   * with nothing else — a question still being answered never has it, which is
   * what keeps it feedback rather than a hint.
   */
  steps?: string[];
  /**
   * The working for each cell of a matrix answer, row-major. Arrives with the
   * verdict the same way `steps` does; `Feedback` narrows it to the entries
   * that were actually wrong.
   */
  perEntry?: string[];
  /** True when it isn't your turn — the question shows but doesn't respond. */
  disabled?: boolean;
  /**
   * Hold the prompt to a fixed height, so what sits under it does not move
   * between questions.
   *
   * A grid is answered by touching a place on it, which makes its position on
   * the screen part of the control. "Plot (7, 3)." is one line and "Plot the
   * point 2 units right and 1 unit up from the origin." is two, and the two
   * questions put the origin thirty-five pixels apart — so the same tap on
   * consecutive rounds is two different answers. Reserved rather than fixed:
   * a prompt longer than the reserve still gets the room it needs.
   */
  steady?: boolean;
  /**
   * The other player's answer, to draw beside your own once the round is out.
   *
   * A duel is settled on which of two answers was closer, and until now the
   * reveal never showed the other one — so the mechanic the whole game is
   * built on was a pair of numbers in a panel and never a picture. Only the
   * spatial kinds can draw it; the rest already say it in words.
   */
  rival?: Rival | null;
  onDraft: (draft: Response) => void;
  onSubmit: (response: Response) => void;
}) {
  const revealed = reveal !== null;
  const locked = revealed || !!disabled;

  // A draft of the wrong kind is treated as an empty one of the right kind.
  // Each input below only renders when the draft matches the question, so
  // without this a mismatch renders the prompt and then nothing at all —
  // which is what a question looks like when it is broken rather than hard.
  const answer: Response =
    draft.kind === question.kind ? draft : emptyResponse(question.kind);

  // Number keys pick an option, for anyone who wants them. They are no longer
  // advertised on each option — the answer itself is the target — and they only
  // apply to the one kind that has numbered answers.
  useEffect(() => {
    if (locked || question.kind !== "choice") return;

    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) {
        onSubmit({ kind: "choice", choice: n - 1 });
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, question, onSubmit]);

  return (
    <div key={question.id} className="animate-question-in w-full max-w-3xl">
      <p className="eyebrow mb-2.5 sm:mb-5">{eyebrow}</p>

      <h1
        className={
          "mb-5 text-[20px] leading-[1.18] font-medium tracking-[-0.03em] " +
          "text-balance sm:mb-9 sm:text-[38px] " +
          (steady ? "min-h-[3.54em] sm:min-h-[2.36em]" : "")
        }
      >
        <MathText text={question.prompt} />
      </h1>

      {/* The two spatial kinds draw their own figure, on the grid the answer
          goes onto. The rest get it here, above the input, as a thing to read.
          Rendering it in both places would put the same curve on the screen
          twice at two different sizes. */}
      {question.figure &&
        question.kind !== "point" &&
        question.kind !== "line" && <FigureView figure={question.figure} />}

      {question.kind === "choice" && answer.kind === "choice" && (
        <Options
          options={question.options}
          picked={answer.choice}
          correctIndex={reveal?.kind === "choice" ? reveal.index : null}
          locked={locked}
          onPick={(choice) => onSubmit({ kind: "choice", choice })}
        />
      )}

      {question.kind === "fill" && answer.kind === "fill" && (
        <FillAnswer
          question={question}
          draft={answer.text}
          locked={locked}
          reveal={reveal}
          onDraft={(text) => onDraft({ kind: "fill", text })}
          onSubmit={() => onSubmit(answer)}
        />
      )}

      {question.kind === "slider" && answer.kind === "slider" && (
        <SliderAnswer
          question={question}
          draft={answer.value}
          locked={locked}
          reveal={reveal}
          score={score}
          onDraft={(value) => onDraft({ kind: "slider", value })}
          onSubmit={() => onSubmit(answer)}
        />
      )}

      {question.kind === "point" && answer.kind === "point" && (
        <PointAnswer
          question={question}
          draft={answer.at}
          locked={locked}
          reveal={reveal}
          score={score}
          rival={rival}
          onDraft={(at: Point) => onDraft({ kind: "point", at })}
          onSubmit={() => onSubmit(answer)}
        />
      )}

      {question.kind === "line" && answer.kind === "line" && (
        <LineAnswer
          question={question}
          draft={answer.through}
          locked={locked}
          reveal={reveal}
          score={score}
          rival={rival}
          onDraft={(through) => onDraft({ kind: "line", through })}
          onSubmit={() =>
            onSubmit(
              // A line never submitted still has the starting handles on the
              // grid, and grading what is drawn is fairer than grading nothing.
              answer.through
                ? answer
                : {
                    kind: "line",
                    through: [
                      { x: -Math.round(question.span / 2), y: 0 },
                      { x: Math.round(question.span / 2), y: 0 },
                    ],
                  },
            )
          }
        />
      )}

      {question.kind === "matrix" && answer.kind === "matrix" && (
        <MatrixAnswer
          question={question}
          draft={answer.cells}
          locked={locked}
          reveal={reveal}
          onDraft={(cells) => onDraft({ kind: "matrix", cells })}
          onSubmit={() => onSubmit(answer)}
        />
      )}

      {question.kind === "order" && answer.kind === "order" && (
        <OrderAnswer
          question={question}
          draft={answer.order}
          locked={locked}
          reveal={reveal}
          onDraft={(order) => onDraft({ kind: "order", order })}
          onSubmit={() => onSubmit(answer)}
        />
      )}

      {/* Only after the reveal, and only on a miss. The threshold is the public
          one: on the proximity kinds "wrong" starts below full marks, and a
          part-marked answer is exactly the one worth explaining. */}
      {revealed && score !== null && wantsExplaining(question.kind, score) && (
        <Feedback
          question={question}
          reveal={reveal}
          response={answer}
          steps={steps}
          perEntry={perEntry}
        />
      )}
    </div>
  );
}

function Options({
  options,
  picked,
  correctIndex,
  locked,
  onPick,
}: {
  options: string[];
  picked: number | null;
  correctIndex: number | null;
  locked: boolean;
  onPick: (choice: number) => void;
}) {
  const revealed = correctIndex !== null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {options.map((option, i) => {
        const isAnswer = i === correctIndex;
        const isPicked = i === picked;

        let tone = "box";
        if (!locked) tone = "box box-tap";
        if (isPicked && !revealed) tone = "box box-on";
        if (revealed && isAnswer) {
          // Only the option actually picked pulses. The right one lights up
          // either way, and pulsing it on a miss congratulates somebody for
          // the answer they did not give.
          tone = isPicked
            ? "box animate-correct border-correct bg-correct/12"
            : "box border-correct bg-correct/12";
        } else if (revealed && isPicked) tone = "box border-out bg-out/12";
        else if (revealed) tone = "box opacity-55";

        return (
          <li key={option}>
            <button
              type="button"
              disabled={locked}
              onClick={() => onPick(i)}
              className={`flex min-h-20 w-full items-center px-5 py-4 text-left text-[16px] leading-snug disabled:cursor-default ${tone}`}
            >
              <span className="flex-1">
                <MathText text={option} />
              </span>

              {revealed && isAnswer && (
                <span className="eyebrow ml-3 shrink-0 text-correct">Correct</span>
              )}
              {revealed && isPicked && !isAnswer && (
                <span className="eyebrow ml-3 shrink-0 text-out">Picked</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** The clock as a line. The only always-moving element on a game screen. */
/**
 * Leaving a game, with one press of resistance in the way.
 *
 * This used to be a plain `<Link href="/">`, and an anchor fires on Enter.
 * The header sits before the question in the document, so a single Shift+Tab
 * out of the first answer input lands on it — and Enter is the key every
 * input on the screen tells you to press. That was survivable while a typed
 * answer meant one box and one Tab to the Answer button. A matrix is four
 * boxes with Tab as the way between them, which makes tabbing part of
 * answering, and one stray press could end a race or a round of Last One
 * Standing outright with no way back into it.
 *
 * So it arms instead of firing. The first press changes the label to say what
 * the second will do, and the arming lapses on its own, because a control
 * that quietly means something different from what it said a minute ago is
 * its own trap. Still a real button, still reachable and operable from the
 * keyboard — the fix is a confirmation, not a removal from the tab order.
 */
export function LeaveGame({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => (armed ? router.push("/") : setArmed(true))}
      className={
        "transition-colors " +
        (armed ? "text-out" : "text-faint hover:text-ink") +
        (className ? ` ${className}` : "")
      }
    >
      {armed ? "Leave — sure?" : "Leave"}
    </button>
  );
}

export function ClockRail({
  fraction,
  urgent,
}: {
  fraction: number;
  urgent: boolean;
}) {
  return (
    <div className="h-0.5 w-full shrink-0 bg-line-soft" aria-hidden="true">
      <div
        className={`h-full origin-left transition-transform duration-100 ease-linear ${
          urgent ? "bg-out" : "bg-accent"
        }`}
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, fraction))})` }}
      />
    </div>
  );
}
