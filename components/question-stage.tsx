"use client";

import { useEffect } from "react";
import type { Question } from "@/lib/curriculum";

/**
 * The question is the hero on both game screens, so it lives in one place and
 * both games hand it the same props. Everything about game state — track,
 * standings, elimination — is the caller's business and sits in the periphery.
 */
export function QuestionStage({
  question,
  eyebrow,
  picked,
  revealed,
  onPick,
}: {
  question: Question;
  eyebrow: string;
  picked: number | null;
  revealed: boolean;
  onPick: (choice: number) => void;
}) {
  // 1–4 answer the question. Faster than the mouse, which matters in a race.
  useEffect(() => {
    if (revealed) return;

    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= question.options.length) onPick(n - 1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, question.options.length, onPick]);

  return (
    <div key={question.id} className="animate-question-in w-full max-w-3xl">
      <p className="eyebrow mb-5">{eyebrow}</p>

      <h1 className="mb-10 text-2xl leading-[1.18] font-medium tracking-[-0.03em] text-balance sm:text-[38px]">
        {question.prompt}
      </h1>

      <ul className="flex flex-col gap-2.5">
        {question.options.map((option, i) => {
          const isAnswer = i === question.answer;
          const isPicked = i === picked;

          let tone = "border-line bg-surface hover:border-faint hover:bg-surface-2";
          if (revealed && isAnswer) tone = "border-correct bg-correct/8 text-ink";
          else if (revealed && isPicked) tone = "border-out bg-out/8 text-ink";
          else if (revealed) tone = "border-line-soft bg-surface text-faint";

          return (
            <li key={option}>
              <button
                type="button"
                disabled={revealed}
                onClick={() => onPick(i)}
                className={`flex w-full items-center gap-4 rounded-md border px-5 py-4 text-left text-[15px] transition-colors disabled:cursor-default ${tone}`}
              >
                <span className="font-mono text-[11px] text-faint">{i + 1}</span>
                <span className="flex-1">{option}</span>

                {revealed && isAnswer && (
                  <span className="eyebrow text-correct">Correct</span>
                )}
                {revealed && isPicked && !isAnswer && (
                  <span className="eyebrow text-out">Your answer</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 font-mono text-[11px] text-faint">Press 1–4 to answer</p>
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
