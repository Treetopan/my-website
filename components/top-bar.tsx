"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { watchProgress } from "@/lib/rtdb";
import {
  EMPTY_PROGRESS,
  levelProgress,
  streakIsLive,
  type Progress,
} from "@/lib/progression";

export function TopBar() {
  const { user, signOut } = useAuth();
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);

  useEffect(() => {
    if (!user) return;
    return watchProgress(user.uid, setProgress);
  }, [user]);

  const { level, fraction } = levelProgress(progress.xp);
  const liveStreak = streakIsLive(progress, new Date());

  return (
    <header className="flex h-15 shrink-0 items-center gap-10 border-b border-line-soft px-8">
      <Link
        href="/"
        className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]"
      >
        <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
        Roundhouse
      </Link>

      <div className="ml-auto flex items-center gap-6">
        {/* Streak reads as state, not decoration: it dims the moment it is
            no longer live, rather than showing a number already lost. */}
        <span
          className={`font-mono text-[11px] tnum ${
            liveStreak && progress.streak > 0 ? "text-accent" : "text-faint"
          }`}
          title={
            liveStreak
              ? `${progress.streak} day streak`
              : "Play today to start a streak"
          }
        >
          {progress.streak > 0 && liveStreak
            ? `${progress.streak}-day streak`
            : "No streak"}
        </span>

        <span className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] text-muted tnum">
            Level {level}
          </span>
          <span
            className="h-1 w-16 overflow-hidden rounded-full bg-line"
            aria-hidden="true"
          >
            <span
              className="block h-full origin-left bg-accent transition-transform duration-500"
              style={{ transform: `scaleX(${fraction})` }}
            />
          </span>
        </span>

        {user && (
          <span className="flex items-center gap-3">
            <span className="grid size-6.5 place-items-center rounded-full border border-line bg-surface-2 font-mono text-[10px] text-muted">
              {(user.displayName ?? user.email ?? "?").slice(0, 2).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-[13px] text-faint transition-colors hover:text-ink"
            >
              Sign out
            </button>
          </span>
        )}
      </div>
    </header>
  );
}
