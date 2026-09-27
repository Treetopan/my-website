"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  setCourse,
  skipCourse,
  watchAccount,
  watchCourse,
  type Account,
  type CourseChoice,
} from "@/lib/account";
import { readResults, type SessionResult } from "@/lib/rtdb";
import { courseChoices, describeAll, selectionNames } from "@/lib/curriculum";
import { levelProgress, streakIsLive } from "@/lib/progression";
import { SurveyGate } from "@/components/survey-gate";
import { CourseChips } from "@/components/course-gate";
import {
  SURVEY,
  labelFor,
  watchSurvey,
  type SurveyState,
} from "@/lib/survey";

/**
 * A player's own record: what the account is, what it has earned, and what it
 * has played.
 *
 * The numbers here are the same ones the top bar keeps in the corner, shown at
 * a size worth reading. Nothing on this screen is comparative — there is no
 * leaderboard in this app, and a profile that ranked you against other people
 * would quietly introduce one.
 */
export function Profile() {
  const { user, username } = useAuth();

  const [account, setAccount] = useState<Account | null>(null);
  const [results, setResults] = useState<(SessionResult & { id: string })[]>([]);
  const [survey, setSurvey] = useState<SurveyState>({ status: "loading" });
  // Its own listener, on its own node: the course is no longer a field of the
  // account, because only its owner may read it.
  const [choice, setChoice] = useState<CourseChoice>({ status: "loading" });
  const [taking, setTaking] = useState(false);

  useEffect(() => {
    if (!user) return;
    const stop = [
      watchAccount(user.uid, setAccount),
      watchSurvey(user.uid, setSurvey),
      watchCourse(user.uid, setChoice),
    ];
    readResults(user.uid).then(setResults).catch(() => setResults([]));
    return () => stop.forEach((off) => off());
  }, [user]);

  if (!user) return null;

  const progress = account?.progress;
  const level = progress ? levelProgress(progress.xp) : null;
  const live = progress ? streakIsLive(progress, new Date()) : false;

  // Taken across sessions rather than stored, because a session already
  // records what it was worth and a second running total is a second thing to
  // keep true.
  const questions = results.reduce((sum, r) => sum + (r.total ?? 0), 0);
  const correct = results.reduce((sum, r) => sum + (r.correct ?? 0), 0);

  if (taking) {
    return (
      <SurveyGate
        uid={user.uid}
        // Seeded with what is already there, so answering one more question
        // does not throw away the answers that were given the first time.
        initial={survey.status === "done" ? survey.record.answers : undefined}
        onDone={() => setTaking(false)}
        onSkip={() => setTaking(false)}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 pt-14 pb-24">
      <p className="eyebrow">Your profile</p>
      <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.035em]">
        {username ?? "—"}
      </h1>
      <p className="mt-2 font-mono text-[11px] text-faint">
        {user.email ?? "—"}
        {account?.createdAt && ` · joined ${monthOf(account.createdAt)}`}
      </p>

      {/* ── Level ───────────────────────────────────────── */}
      <section className="mt-10 border-t border-line-soft pt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[22px] font-medium tracking-[-0.02em]">
            Level {level?.level ?? 1}
          </h2>
          <span className="font-mono text-[11px] text-faint tnum">
            {level ? `${level.into} / ${level.span} XP` : "—"}
          </span>
        </div>

        <span
          className="block h-1.5 overflow-hidden rounded-full bg-line"
          aria-hidden="true"
        >
          <span
            className="block h-full origin-left bg-accent transition-transform duration-700"
            style={{ transform: `scaleX(${level?.fraction ?? 0})` }}
          />
        </span>
        <p className="mt-2.5 text-[13.5px] text-faint">
          {level
            ? `${level.remaining} XP to level ${level.level + 1}.`
            : "Play a session to start earning."}
        </p>
      </section>

      {/* ── The numbers ─────────────────────────────────── */}
      <section className="border-t border-line-soft pt-8 pb-10">
        <h2 className="mb-5 text-[22px] font-medium tracking-[-0.02em]">
          Where you stand
        </h2>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Total XP" value={fmt(progress?.xp)} accent />
          <Stat
            label="Streak"
            value={
              progress && live && progress.streak > 0
                ? `${progress.streak}d`
                : "—"
            }
          />
          <Stat label="Best streak" value={fmt(progress?.longestStreak)} />
          <Stat label="Sessions" value={fmt(progress?.played)} />
          <Stat label="Wins" value={fmt(progress?.won)} />
          <Stat
            label="Accuracy"
            value={questions ? `${Math.round((correct / questions) * 100)}%` : "—"}
          />
        </dl>

        {!live && progress && progress.streak > 0 && (
          <p className="mt-3.5 text-[13.5px] text-faint">
            Your {progress.streak}-day streak has lapsed. Playing today starts a
            new one.
          </p>
        )}
      </section>

      {/* ── History ─────────────────────────────────────── */}
      <section className="border-t border-line-soft pt-8 pb-10">
        <h2 className="text-[22px] font-medium tracking-[-0.02em]">
          Recent sessions
        </h2>
        <p className="mt-2 mb-5 text-[13.5px] text-faint">
          Only you can see these.
        </p>

        {results.length === 0 ? (
          <p className="text-[14px] text-faint">
            Nothing yet.{" "}
            <Link href="/" className="text-accent hover:text-accent-hi">
              Pick something from the library.
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {results.slice(0, 12).map((result) => {
              // A session mixes subunits now; one written before it could says
              // so with the single id it carried instead.
              const picked =
                result.subunitIds ??
                (result.subunitId ? [result.subunitId] : []);
              const where = describeAll(picked);
              return (
                <li
                  key={result.id}
                  className="box flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3.5"
                >
                  <span className="flex-1 min-w-40">
                    <span className="text-[14.5px]">
                      {where ? selectionNames(where) : picked.join(" · ")}
                    </span>
                    <span className="block font-mono text-[10.5px] tracking-[0.1em] text-faint uppercase">
                      {where ? where.course.name : "Removed course"}
                      {result.won && " · won"}
                    </span>
                  </span>
                  <span className="font-mono text-[11.5px] text-muted tnum">
                    {result.correct}/{result.total}
                  </span>
                  <span className="w-14 text-right font-mono text-[11.5px] text-accent tnum">
                    +{result.xp}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── The course ──────────────────────────────────── */}
      <section className="border-t border-line-soft pt-8 pb-10">
        <h2 className="text-[22px] font-medium tracking-[-0.02em]">
          Your course
        </h2>
        <p className="mt-2 mb-5 text-[13.5px] text-faint">
          What Quick play offers, and where the library opens. Changing it
          leaves your XP, streak and history alone.
        </p>

        <CourseEditor
          uid={user.uid}
          courseId={choice.status === "chosen" ? choice.courseId : null}
        />
      </section>

      {/* ── The survey ──────────────────────────────────── */}
      <section className="border-t border-line-soft pt-8">
        <h2 className="text-[22px] font-medium tracking-[-0.02em]">
          What you told us
        </h2>
        <p className="mt-2 mb-5 text-[13.5px] text-faint">
          The questions from your first sign-in. Answers are read by whoever
          builds this, and by nobody else.
        </p>

        <SurveyAnswersView survey={survey} onTake={() => setTaking(true)} />
      </section>
    </main>
  );
}

/**
 * The course, changeable in one press.
 *
 * There is no Save button because there is nothing to save up: the answer is a
 * single choice, so the tap *is* the edit. Pressing the course already on
 * clears it, the same gesture the chips have everywhere else, and clearing
 * records a skip rather than wiping the subtree — the student has still been
 * asked, and the sign-up question must not come back at them for having
 * changed their mind.
 *
 * The value is the watched one from the account rather than local state, so
 * what is shown is what is stored. That also makes the write its own feedback:
 * the chip moves when the database says it moved, not when it was tapped.
 */
function CourseEditor({
  uid,
  courseId,
}: {
  uid: string;
  courseId: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function pick(next: string | null) {
    setBusy(true);
    setProblem(null);
    try {
      if (next) await setCourse(uid, next);
      else await skipCourse(uid);
    } catch {
      setProblem("That didn't save. Check your connection and try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <CourseChips
        courses={courseChoices()}
        value={courseId}
        disabled={busy}
        onPick={pick}
      />

      {problem && (
        <p
          role="alert"
          className="rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
        >
          {problem}
        </p>
      )}
    </div>
  );
}

/**
 * The survey, played back. A skip is shown as a skip rather than as nothing,
 * because "you skipped this" and "this failed to load" should not look the
 * same — and because the offer to answer it after all only makes sense against
 * a state that says why it is being offered.
 */
function SurveyAnswersView({
  survey,
  onTake,
}: {
  survey: SurveyState;
  onTake: () => void;
}) {
  if (survey.status === "loading") {
    return <p className="text-[14px] text-faint">Loading…</p>;
  }

  if (survey.status === "unavailable") {
    return (
      <p className="text-[14px] text-faint">
        Couldn&apos;t load your answers just now.
      </p>
    );
  }

  const answers = survey.status === "done" ? survey.record.answers : undefined;
  const given = SURVEY.filter((q) => answers?.[q.id]);

  if (given.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-[14px] text-faint">
          You skipped it. It takes about a minute, and it is genuinely what
          decides what gets built next.
        </p>
        <button
          type="button"
          onClick={onTake}
          className="rounded-sm bg-accent px-4.5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
        >
          Answer it now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-5">
      <dl className="flex w-full flex-col gap-2.5">
        {given.map((question) => (
          <div
            key={question.id}
            className="box flex flex-col gap-1 px-4 py-3.5"
          >
            <dt className="eyebrow">{question.prompt}</dt>
            <dd className="text-[14.5px] text-ink">
              {question.kind === "text"
                ? answers![question.id]
                : labelFor(question, answers![question.id])}
            </dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        onClick={onTake}
        className="text-[13px] text-faint transition-colors hover:text-ink"
      >
        Answer them again
      </button>
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

function fmt(value: number | undefined): string {
  return value === undefined ? "—" : value.toLocaleString();
}

/** Server timestamps are milliseconds; a join date only needs the month. */
function monthOf(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
