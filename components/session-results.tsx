"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { levelProgress, type Progress } from "@/lib/progression";

/**
 * Shown once a session ends. The one thing that animates is the XP bar filling
 * to its new position — it is the only place the player sees what the round
 * was worth, so the movement is the message.
 */
export function SessionResults({
  headline,
  detail,
  correct,
  total,
  xpEarned,
  before,
  after,
  onAgain,
}: {
  headline: string;
  detail: string;
  correct: number;
  total: number;
  xpEarned: number;
  before: Progress | null;
  after: Progress | null;
  onAgain: () => void;
}) {
  const shown = after ?? before;
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!after) return;
    const id = setTimeout(() => setFilled(true), 260);
    return () => clearTimeout(id);
  }, [after]);

  const from = before ? levelProgress(before.xp) : null;
  const to = after ? levelProgress(after.xp) : null;
  const bar = filled ? to : (from ?? to);
  const levelledUp = from && to && to.level > from.level;

  return (
    <div className="animate-question-in w-full max-w-lg">
      <p className="eyebrow mb-5">Session over</p>

      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[40px]">
        {headline}
      </h1>
      <p className="mt-3 mb-9 text-[15px] text-muted">{detail}</p>

      <dl className="mb-9 grid grid-cols-3 gap-6 border-y border-line-soft py-5">
        <Stat label="Correct" value={`${correct}/${total}`} />
        <Stat label="XP earned" value={`+${xpEarned}`} accent />
        <Stat
          label="Streak"
          value={shown ? `${shown.streak} day${shown.streak === 1 ? "" : "s"}` : "—"}
        />
      </dl>

      {bar && (
        <div className="mb-10 flex flex-col gap-2.5">
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="rounded-sm bg-accent px-4.5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
        >
          Play again
        </button>
        <Link
          href="/"
          className="rounded-sm border border-line px-4.5 py-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
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
    <div className="flex flex-col gap-1.5">
      <dt className="eyebrow">{label}</dt>
      <dd
        className={`font-mono text-xl tnum ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
