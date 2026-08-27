"use client";

import { useState } from "react";
import { Wordmark } from "@/components/wordmark";
import {
  ANSWER_MAX,
  SURVEY,
  saveSurvey,
  skipSurvey,
  type SurveyAnswers,
  type SurveyQuestion,
} from "@/lib/survey";

/**
 * The survey, shown once — on the first sign-in, after a username has been
 * claimed and before the library.
 *
 * It is a gate in position only, not in effect: Skip is a first-class button
 * rather than fine print, and every question is optional. Somebody who came to
 * play a round should be able to get to it in one press, and an answer given
 * grudgingly is worse than no answer at all — it is data that reads as real.
 *
 * Skipping is recorded rather than left blank. A skip that wrote nothing would
 * be indistinguishable from a survey that never loaded, and would put the
 * screen back in front of the same person on their next visit.
 *
 * `onDone` exists because this is used in two places with two endings: at
 * sign-in the record itself dismisses it, and on the profile — where somebody
 * who skipped can come back to it — the caller closes the form.
 */
export function SurveyGate({
  uid,
  initial,
  onDone,
  onSkip,
}: {
  uid: string;
  /**
   * What was answered last time, when this is being opened again to edit.
   * A record is written whole, so starting blank would turn changing one
   * answer into erasing the rest.
   */
  initial?: SurveyAnswers;
  onDone?: () => void;
  onSkip?: () => void;
}) {
  const [answers, setAnswers] = useState<SurveyAnswers>(initial ?? {});
  const [busy, setBusy] = useState<"save" | "skip" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const answered = SURVEY.filter((q) => answers[q.id]?.trim()).length;

  // As a gate this is the whole screen and has to carry the wordmark itself;
  // reopened from the profile it sits under a top bar that already has one.
  // A caller that wants to be told when it closes is the one with the chrome.
  const standalone = !onDone;

  function set(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function run(what: "save" | "skip") {
    if (busy) return;
    setBusy(what);
    setProblem(null);

    try {
      if (what === "skip") {
        await skipSurvey(uid);
        onSkip?.();
      } else {
        await saveSurvey(uid, answers);
      }
      onDone?.();
    } catch {
      setProblem("That didn't save. Check your connection and try again.");
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-14 pb-32">
      {standalone && <Wordmark className="mb-12" />}

      <p className="eyebrow">{standalone ? "Before you start" : "Survey"}</p>
      <h1 className="mt-2 text-[32px] leading-tight font-semibold tracking-[-0.035em]">
        {SURVEY.length} quick questions
      </h1>
      <p className="mt-2.5 text-[15px] text-muted">
        None of them are required, and the answers go nowhere but here — they
        decide what gets built next.
        {standalone && " If you would rather just play, skip it."}
      </p>

      <div className="mt-10 flex flex-col gap-9">
        {SURVEY.map((question) => (
          <Question
            key={question.id}
            question={question}
            value={answers[question.id] ?? ""}
            onPick={(value) => set(question.id, value)}
          />
        ))}
      </div>

      {problem && (
        <p
          role="alert"
          className="mt-8 rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
        >
          {problem}
        </p>
      )}

      {/* Skip sits beside Done rather than below it, and is a button rather
          than a link — the whole point is that it costs the same one press. */}
      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line-soft pt-7">
        <button
          type="button"
          onClick={() => run("save")}
          disabled={busy !== null || answered === 0}
          className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
        >
          {busy === "save" ? "Sending…" : "Done"}
        </button>

        {/* Only the gate can be skipped. Reopened from the profile the same
            press has to mean cancel, because writing a skip there would
            replace answers somebody already gave with the absence of them. */}
        {standalone ? (
          <button
            type="button"
            onClick={() => run("skip")}
            disabled={busy !== null}
            className="text-[13px] text-faint transition-colors hover:text-ink disabled:text-line"
          >
            {busy === "skip" ? "Skipping…" : "Skip this"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSkip?.()}
            disabled={busy !== null}
            className="text-[13px] text-faint transition-colors hover:text-ink disabled:text-line"
          >
            Cancel
          </button>
        )}

        <span className="ml-auto font-mono text-[11px] text-faint tnum">
          {answered} of {SURVEY.length}
        </span>
      </div>
    </main>
  );
}

function Question({
  question,
  value,
  onPick,
}: {
  question: SurveyQuestion;
  value: string;
  onPick: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col">
      <legend className="text-[15.5px] font-medium">{question.prompt}</legend>
      {question.note && (
        <p className="mt-1.5 text-[13px] text-faint">{question.note}</p>
      )}

      <div className="mt-3.5">
        {question.kind === "choice" && (
          <div className="flex flex-wrap gap-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={value === option.value}
                // Pressing the chip you already picked clears it, so an answer
                // given by accident can be taken back rather than only changed.
                onClick={() => onPick(value === option.value ? "" : option.value)}
                className={`box box-tap px-3.5 py-2 text-[13.5px] ${
                  value === option.value ? "box-on text-accent" : "text-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {question.kind === "select" && (
          <select
            value={value}
            onChange={(e) => onPick(e.target.value)}
            className="box w-full px-3.5 py-2.5 text-[14px] text-ink focus:border-accent focus:outline-none"
          >
            <option value="">{question.placeholder}</option>
            {question.groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}

        {question.kind === "text" && (
          <textarea
            value={value}
            rows={3}
            maxLength={ANSWER_MAX}
            placeholder={question.placeholder}
            onChange={(e) => onPick(e.target.value)}
            className="box w-full resize-y px-3.5 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        )}
      </div>
    </fieldset>
  );
}
