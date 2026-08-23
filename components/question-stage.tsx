"use client";

import { useEffect } from "react";
import type { Question } from "@/lib/curriculum";

/**
 * The question is the hero on both game screens, so it lives in one place and
 * both games hand it the same props. Everything about game state — track,
 * turn order, elimination — is the caller's business and sits in the periphery.
 */
export function QuestionStage({
  question,
  eyebrow,
  picked,
  correctIndex,
  disabled,
  onPick,
}: {
  question: Question;
  eyebrow: string;
  picked: number | null;
  /**
   * The right option, or null while the question is still live. The client
   * has no answer key — this arrives from the server once the question has
   * been graded, which is also what makes it the reveal signal.
   */
  correctIndex: number | null;
  /** True when it isn't your turn — the options show but don't respond. */
  disabled?: boolean;
  onPick: (choice: number) => void;
}) {
  const revealed = correctIndex !== null;
  const locked = revealed || disabled;

  // Number keys still work for anyone who wants them, but they are no longer
  // advertised on each option — the answer itself is the target.
  useEffect(() => {
    if (locked) return;

    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) onPick(n - 1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, question.options.length, onPick]);

  return (
    <div key={question.id} className="animate-question-in w-full max-w-3xl">
      <p className="eyebrow mb-5">{eyebrow}</p>

      <h1 className="mb-9 text-2xl leading-[1.18] font-medium tracking-[-0.03em] text-balance sm:text-[38px]">
        {question.prompt}
      </h1>

      <ul className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option, i) => {
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
    </div>
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
