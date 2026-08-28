"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { levelProgress, type Progress } from "@/lib/progression";
import { Feedback } from "@/components/feedback";
import {
  answerOf,
  givenOf,
  ranOut,
  summarize,
  verdict,
  type AnswerDetail,
} from "@/lib/review";

/**
 * Shown once a session ends. Two jobs, in this order: tell the student what to
 * study next, and show what the round was worth. The XP bar is the only thing
 * that animates — it is the one place the reward is visible, so the movement
 * is the message.
 */
export function SessionSummary({
  headline,
  detail,
  details,
  xpEarned,
  before,
  after,
  onAgain,
}: {
  headline: string;
  detail: string;
  details: AnswerDetail[];
  xpEarned: number;
  before: Progress | null;
  after: Progress | null;
  onAgain: () => void;
}) {
  const s = summarize(details);
  const shown = after ?? before;
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!after) return;
    const id = setTimeout(() => setFilled(true), 280);
    return () => clearTimeout(id);
  }, [after]);

  const from = before ? levelProgress(before.xp) : null;
  const to = after ? levelProgress(after.xp) : null;
  const bar = filled ? to : (from ?? to);
  const levelledUp = from && to && to.level > from.level;

  return (
    <div className="animate-question-in w-full max-w-2xl">
      <p className="eyebrow mb-4">Session over</p>

      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[38px]">
        {headline}
      </h1>
      <p className="mt-3 mb-8 text-[15px] text-muted">{detail}</p>

      {/* ── The numbers ─────────────────────────────── */}
      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${Math.round(s.accuracy * 100)}%`} />
        <Stat label="Correct" value={`${s.correct}/${s.total}`} />
        <Stat label="XP earned" value={`+${xpEarned}`} accent />
        <Stat
          label="Streak"
          value={shown ? `${shown.streak}d` : "—"}
        />
      </dl>

      {/* ── Level ───────────────────────────────────── */}
      {bar && (
        <div className="mb-9 flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] text-muted tnum">
              Level {bar.level}
            </span>
            <span className="font-mono text-[11px] text-faint tnum">
              {bar.into} / {bar.span} XP
            </span>
          </div>

          <span className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <span
              className="block h-full origin-left bg-accent transition-transform duration-[900ms] ease-out"
              style={{ transform: `scaleX(${bar.fraction})` }}
            />
          </span>

          {levelledUp && (
            <p className="font-mono text-[11px] text-accent tnum">
              Level up — {from.level} → {to.level}
            </p>
          )}
        </div>
      )}

      {/* ── What to do next ─────────────────────────── */}
      <p className="mb-6 text-[17px] font-medium tracking-[-0.015em] text-balance">
        {verdict(s)}
      </p>

      {(s.weak.length > 0 || s.strong.length > 0) && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {s.weak.length > 0 && (
            <TopicList
              label="Go back to"
              tone="out"
              items={s.weak.map((t) => ({
                topic: t.topic,
                note: `${t.wrong} missed`,
              }))}
            />
          )}

          {s.strong.length > 0 && (
            <TopicList
              label="Solid on"
              tone="correct"
              items={s.strong.slice(0, 4).map((t) => ({
                topic: t.topic,
                note:
                  t.pace > 0.6 ? "fast" : t.right > 1 ? `${t.right}/${t.right}` : "clean",
              }))}
            />
          )}
        </div>
      )}

      {/* ── The actual questions to review ──────────── */}
      {s.review.length > 0 && (
        <details className="box mb-8 px-5 py-4" open>
          <summary className="cursor-pointer text-[14px] font-medium">
            {s.review.length} question{s.review.length === 1 ? "" : "s"} to review
          </summary>

          <ul className="mt-5 flex flex-col gap-5">
            {s.review.map((d) => (
              <li key={d.questionId} className="flex flex-col gap-2">
                <p className="text-[14.5px] leading-snug">{d.question.prompt}</p>

                <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                  <span className="eyebrow text-correct">Answer</span>
                  <span className="text-ink">{answerOf(d)}</span>
                </p>

                <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                  <span className="eyebrow text-out">
                    {ranOut(d) ? "Ran out" : "You said"}
                  </span>
                  <span className="text-muted">
                    {ranOut(d) ? "no answer given" : givenOf(d)}
                  </span>

                  {/* A part-marked answer was not simply wrong, and a review
                      that lists it beside a blank one says the wrong thing. */}
                  {d.score > 0 && (
                    <span className="font-mono text-[11px] text-muted tnum">
                      · {Math.round(d.score * 100)}% of the marks
                    </span>
                  )}
                </p>

                {/* The same explanation the reveal gave, still here at the end
                    of the session — a student who was watching the clock the
                    first time reads it properly now. */}
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
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="rounded-lg bg-accent px-5 py-2.5 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
        >
          Play again
        </button>
        <Link
          href="/"
          className="box box-tap px-5 py-2.5 text-[14px] font-medium text-muted"
        >
          Back to library
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="box flex flex-col gap-1.5 px-4 py-3">
      <dt className="eyebrow">{label}</dt>
      <dd
        className={`font-mono text-xl tnum ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function TopicList({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "out" | "correct";
  items: { topic: string; note: string }[];
}) {
  return (
    <div className="box px-4 py-3.5">
      <p className={`eyebrow mb-3 ${tone === "out" ? "text-out" : "text-correct"}`}>
        {label}
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li
            key={i.topic}
            className="flex items-baseline justify-between gap-3 text-[13.5px]"
          >
            <span className="text-ink">{i.topic}</span>
            <span className="shrink-0 font-mono text-[11px] text-faint tnum">
              {i.note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
