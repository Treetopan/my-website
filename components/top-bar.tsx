"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/account-menu";
import { Wordmark } from "@/components/wordmark";
import { useAuth } from "@/lib/auth-context";
import { watchProgress } from "@/lib/rtdb";
import { watchFriendRequests, watchInvites } from "@/lib/social";
import {
  EMPTY_PROGRESS,
  levelProgress,
  streakIsLive,
  type Progress,
} from "@/lib/progression";

export function TopBar() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);

  // Two counts, one badge. What the badge means is "somebody is waiting on
  // you", and an invitation and a request are both that — splitting them into
  // two numbers up here would only move the reading of them off this screen.
  const [requests, setRequests] = useState(0);
  const [invites, setInvites] = useState(0);

  useEffect(() => {
    if (!user) return;
    const stop = [
      watchProgress(user.uid, setProgress),
      watchFriendRequests(user.uid, (list) => setRequests(list.length)),
      watchInvites(user.uid, (list) => setInvites(list.length)),
    ];
    return () => stop.forEach((off) => off());
  }, [user]);

  const { level, fraction } = levelProgress(progress.xp);
  const liveStreak = streakIsLive(progress, new Date());
  const waiting = requests + invites;

  return (
    <header className="flex h-15 shrink-0 items-center gap-10 border-b border-line-soft px-8">
      <Wordmark />

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

        <Link
          href="/friends"
          className="flex items-center gap-2 text-[13px] text-faint transition-colors hover:text-ink"
        >
          Friends
          {waiting > 0 && (
            <span
              className="grid size-4.5 place-items-center rounded-full bg-accent font-mono text-[10px] text-accent-ink tnum"
              aria-label={`${waiting} waiting`}
            >
              {waiting}
            </span>
          )}
        </Link>

        {/* One press from any screen that has a top bar, and it looks like
            what it is rather than like another word in a row of words. */}
        <Link
          href="/feedback"
          aria-label="Send feedback"
          title="Send feedback"
          className="text-faint transition-colors hover:text-ink"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 3.5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8.5L5 16.5v-3H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
          </svg>
        </Link>

        {user && <AccountMenu />}
      </div>
    </header>
  );
}
