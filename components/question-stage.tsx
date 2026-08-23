"use client";

import { useEffect } from "react";
import type { Question } from "@/lib/curriculum";
import type { Point, Response, Reveal } from "@/lib/questions";
import {
  FillAnswer,
  LineAnswer,
  PointAnswer,
  SliderAnswer,
} from "@/components/answer-inputs";

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
  disabled,
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
  /** True when it isn't your turn — the question shows but doesn't respond. */
  disabled?: boolean;
  onDraft: (draft: Response) => void;
  onSubmit: (response: Response) => void;
}) {
  const revealed = reveal !== null;
  const locked = revealed || !!disabled;

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
      <p className="eyebrow mb-5">{eyebrow}</p>

      <h1 className="mb-9 text-2xl leading-[1.18] font-medium tracking-[-0.03em] text-balance sm:text-[38px]">
        {question.prompt}
      </h1>

      {question.kind === "choice" && draft.kind === "choice" && (
        <Options
          options={question.options}
          picked={draft.choice}
          correctIndex={reveal?.kind === "choice" ? reveal.index : null}
          locked={locked}
          onPick={(choice) => onSubmit({ kind: "choice", choice })}
        />
      )}

      {question.kind === "fill" && draft.kind === "fill" && (
        <FillAnswer
          question={question}
          draft={draft.text}
          locked={locked}
          reveal={reveal}
          onDraft={(text) => onDraft({ kind: "fill", text })}
          onSubmit={() => onSubmit(draft)}
        />
      )}

      {question.kind === "slider" && draft.kind === "slider" && (
        <SliderAnswer
          question={question}
          draft={draft.value}
          locked={locked}
          reveal={reveal}
          score={score}
          onDraft={(value) => onDraft({ kind: "slider", value })}
          onSubmit={() => onSubmit(draft)}
        />
      )}

      {question.kind === "point" && draft.kind === "point" && (
        <PointAnswer
          question={question}
          draft={draft.at}
          locked={locked}
          reveal={reveal}
          score={score}
          onDraft={(at: Point) => onDraft({ kind: "point", at })}
          onSubmit={() => onSubmit(draft)}
        />
      )}

      {question.kind === "line" && draft.kind === "line" && (
        <LineAnswer
          question={question}
          draft={draft.through}
          locked={locked}
          reveal={reveal}
          score={score}
          onDraft={(through) => onDraft({ kind: "line", through })}
          onSubmit={() =>
            onSubmit(
              // A line never submitted still has the starting handles on the
              // grid, and grading what is drawn is fairer than grading nothing.
              draft.through
                ? draft
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
        if (revealed && isAnswer) tone = "box border-correct bg-correct/12";
        else if (revealed && isPicked) tone = "box border-out bg-out/12";
        else if (revealed) tone = "box opacity-55";

        return (
          <li key={option}>
            <button
              type="button"
              disabled={locked}
              onClick={() => onPick(i)}
              className={`flex min-h-20 w-full items-center px-5 py-4 text-left text-[16px] leading-snug disabled:cursor-default ${tone}`}
            >
              <span className="flex-1">{option}</span>

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
