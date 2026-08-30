"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { levelProgress, type Progress } from "@/lib/progression";
import { ReviewList } from "@/components/review-list";
import {
  praise,
  reviewPractice,
  verdict,
  weakestFormat,
  type AnswerDetail,
  type Bucket,
} from "@/lib/review";

/**
 * What a practice set was worth.
 *
 * The games end on a result and hang the study notes underneath it. Practice
 * has no result, so this screen is the whole reason the set was played, and it
 * is ordered the way a student reads: what went well, then how much of it went
 * well, then — at length — what did not and why.
 *
 * Three breakdowns rather than one, because "what you struggled with" is three
 * different questions. By concept is the one that names what to revise. By
 * format catches the student who knows the material and loses marks to the
 * answer box. By difficulty says whether the ceiling is the material or the
 * number of steps.
 */
export function PracticeReport({
  details,
  xpEarned,
  before,
  after,
  onAgain,
}: {
  details: AnswerDetail[];
  xpEarned: number;
  before: Progress | null;
  after: Progress | null;
  onAgain: () => void;
}) {
  const p = reviewPractice(details);
  const format = weakestFormat(p);

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

  const missed = p.topics.filter((b) => b.wrong > 0);

  return (
    <div className="animate-question-in w-full max-w-2xl">
      <p className="eyebrow mb-4">Practice over</p>

      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[38px]">
        {praise(p)}
      </h1>
      <p className="mt-3 mb-8 text-[15px] text-muted">
        {p.total} question{p.total === 1 ? "" : "s"}
        {p.medianMs === null
          ? " answered"
          : `, typically ${seconds(p.medianMs)}s each`}
        {p.timedOut > 0 && `, ${p.timedOut} left blank`}.
      </p>

      {/* ── The numbers ─────────────────────────────── */}
      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accuracy" value={`${Math.round(p.accuracy * 100)}%`} />
        <Stat label="Correct" value={`${p.correct}/${p.total}`} />
        <Stat label="Best run" value={p.bestRun ? `${p.bestRun} in a row` : "—"} />
        <Stat label="XP earned" value={`+${xpEarned}`} accent />
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

      {/* ── What to work on ─────────────────────────── */}
      <p className="mb-6 text-[17px] font-medium tracking-[-0.015em] text-balance">
        {verdict(p)}
      </p>

      {p.topics.length > 0 && (
        <Section
          title="By concept"
          note={
            missed.length > 0
              ? "Hardest first. The bar is how much of each one landed."
              : "Everything asked about, and how much of each landed."
          }
        >
          <BucketList buckets={p.topics} />
        </Section>
      )}

      {/* A single-format set has nothing to compare, so the split is only
          drawn once there is more than one way the questions were asked. */}
      {p.formats.length > 1 && (
        <Section
          title="By how it was asked"
          note={
            format
              ? `${format.label} went clearly worse than the rest — worth asking whether it was the ideas or the way they were asked.`
              : "Much the same whichever way the question was put, so the answer box is not what is costing you."
          }
        >
          <BucketList buckets={p.formats} />
        </Section>
      )}

      {p.difficulties.length > 1 && (
        <Section title="By difficulty">
          <BucketList buckets={p.difficulties} />
        </Section>
      )}

      {/* ── The actual questions to review ──────────── */}
      {p.review.length > 0 && (
        <div className="mb-8">
          <ReviewList details={p.review} open />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="rounded-lg bg-accent px-5 py-2.5 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
        >
          Practise again
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

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-[15px] font-medium tracking-[-0.015em]">{title}</h2>
      {note && <p className="mt-1.5 text-[13px] text-faint">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * A slice of the session as a row: what it was, how much of it landed, and a
 * bar for the same number so the list can be read down without doing the
 * arithmetic. The bar is coloured by whether anything was missed rather than
 * by a threshold — a concept you got every time and one you nearly got every
 * time are different things, and a shared colour would hide it.
 */
function BucketList({ buckets }: { buckets: Bucket[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {buckets.map((b) => (
        <li
          key={b.key}
          className="box flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
        >
          <span className="min-w-40 flex-1 text-[14px] text-ink">{b.label}</span>

          <span
            className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-line"
            aria-hidden="true"
          >
            <span
              className={`block h-full origin-left ${
                b.wrong === 0 ? "bg-correct" : "bg-out"
              }`}
              style={{ transform: `scaleX(${b.accuracy})` }}
            />
          </span>

          <span className="w-20 shrink-0 text-right font-mono text-[11px] text-muted tnum">
            {b.right}/{b.total} right
          </span>

          <span
            className={`w-10 shrink-0 text-right font-mono text-[11px] tnum ${
              b.wrong === 0 ? "text-correct" : "text-out"
            }`}
          >
            {Math.round(b.accuracy * 100)}%
          </span>
        </li>
      ))}
    </ul>
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

/** One decimal place, because a typical answer is seconds rather than minutes. */
function seconds(ms: number): string {
  return (Math.round(ms / 100) / 10).toFixed(1);
}
