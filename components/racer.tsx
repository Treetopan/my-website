"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTY,
  describe,
  type Question,
} from "@/lib/curriculum";
import { useAuth } from "@/lib/auth-context";
import { recordSession, watchProgress } from "@/lib/rtdb";
import {
  EMPTY_PROGRESS,
  xpForAnswer,
  type Progress,
} from "@/lib/progression";
import { ClockRail, QuestionStage } from "@/components/question-stage";
import { SessionSummary } from "@/components/session-summary";
import { GradeError, grade, openSession } from "@/lib/grade";
import type { AnswerDetail } from "@/lib/review";
import {
  emptyResponse,
  type Response as Answered,
  type Reveal,
} from "@/lib/questions";

const REVEAL_MS = 1700;
const TICK_MS = 100;

/** Bot answers this fraction of questions correctly, and takes this long. */
const BOT = { accuracy: 0.68, minThink: 0.35, maxThink: 0.85 };

type Phase = "asking" | "revealed" | "over";

export function Racer({ subunitId }: { subunitId: string }) {
  const found = describe(subunitId);
  const { user } = useAuth();

  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [before, setBefore] = useState<Progress | null>(null);
  const [after, setAfter] = useState<Progress | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchProgress(user.uid, setProgress);
  }, [user]);

  // The server fixes the question order when the session opens, so the race
  // is graded by position and the client never shuffles anything. It sends the
  // questions too — a generated subunit invents them per session, so there is
  // nothing in this bundle to look them up in.
  const [questions, setQuestions] = useState<Question[]>([]);

  const difficulty = found?.subunit.difficulty ?? "medium";
  const totalMs = DIFFICULTY[difficulty].seconds * 1000;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  // The draft is stamped with the question it belongs to and read back only
  // for that question, rather than being reset when the question changes.
  // Resetting meant the very first question kept a draft of the wrong kind —
  // and every input renders only when the two agree, so question one showed
  // its prompt and nothing underneath it.
  const [entered, setEntered] = useState<{ id: string; response: Answered } | null>(
    null,
  );
  const [msLeft, setMsLeft] = useState(totalMs);
  const [you, setYou] = useState(0);
  const [bot, setBot] = useState(0);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [lastGain, setLastGain] = useState<number | null>(null);

  // The correct answer is not in this bundle — it arrives with the verdict.
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fault, setFault] = useState<string | null>(null);

  const total = questions.length;
  const question = questions[index];

  const draft: Answered = useMemo(
    () =>
      !question
        ? { kind: "choice", choice: null }
        : entered?.id === question.id
          ? entered.response
          : emptyResponse(question.kind),
    [question, entered],
  );

  const setDraft = useCallback(
    (response: Answered) => {
      if (question) setEntered({ id: question.id, response });
    },
    [question],
  );

  const resolve = useCallback(
    async (response: Answered, msRemaining: number) => {
      if (!question || !sessionId) return;

      const speed = Math.max(0, Math.min(1, msRemaining / totalMs));
      setDraft(response);

      let verdict;
      try {
        verdict = await grade(sessionId, index, response);
      } catch (e) {
        // A race that cannot be graded is over. Better to say so than to
        // quietly mark every remaining question wrong.
        setFault(
          e instanceof GradeError ? e.message : "Lost contact with the server.",
        );
        setPhase("over");
        return;
      }

      setReveal(verdict.reveal);
      setScore(verdict.score);
      setPhase("revealed");

      setAnswers((prev) => [
        ...prev,
        {
          questionId: question.id,
          topic: question.topic,
          question,
          reveal: verdict.reveal,
          response: verdict.response,
          difficulty,
          correct: verdict.correct,
          score: verdict.score,
          speed,
        },
      ]);

      // Distance scales with how right the answer was, plus up to another
      // length for being quick. Speed is the whole point of a race, so it has
      // to move the car — and a nearly-right answer has to move it a little,
      // or the proximity kinds would score like multiple choice after all.
      const gain = verdict.score * (1 + speed);
      setLastGain(gain > 0 ? gain : null);
      if (gain > 0) setYou((d) => d + gain);

      const botRight = Math.random() < BOT.accuracy;
      if (botRight) {
        const botSpeed =
          BOT.minThink + Math.random() * (BOT.maxThink - BOT.minThink);
        setBot((d) => d + 1 + (1 - botSpeed));
      }
    },
    [question, index, totalMs, difficulty, sessionId, setDraft],
  );

  const resolveRef = useRef(resolve);
  useEffect(() => {
    resolveRef.current = resolve;
  }, [resolve]);

  // The clock reads the draft through a ref so that ticking does not restart
  // the interval on every keystroke.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // One grading session per race. Without it the clock would start before
  // anything could be graded, so the timer waits on it below.
  useEffect(() => {
    if (!found || sessionId) return;
    let live = true;

    openSession(subunitId)
      .then(({ sessionId: id, questions: asked }) => {
        if (!live) return;
        setQuestions(asked);
        setSessionId(id);
      })
      .catch((e) => {
        if (live) {
          setFault(
            e instanceof GradeError ? e.message : "Could not start the race.",
          );
        }
      });

    return () => {
      live = false;
    };
  }, [found, subunitId, sessionId]);

  // Clock counts against a wall-clock deadline so a throttled tab cannot
  // hand out extra seconds.
  useEffect(() => {
    if (phase !== "asking" || !question || !sessionId) return;

    const deadline = Date.now() + totalMs;
    const id = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setMsLeft(left);
      if (left === 0) {
        clearInterval(id);
        resolveRef.current(draftRef.current, 0);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [phase, index, totalMs, question, sessionId]);

  // Advance, or end the race.
  useEffect(() => {
    if (phase !== "revealed") return;

    const id = setTimeout(() => {
      if (index >= total - 1) {
        setPhase("over");
        return;
      }
      setReveal(null);
      setScore(null);
      setLastGain(null);
      setIndex(index + 1);
      setMsLeft(totalMs);
      setPhase("asking");
    }, REVEAL_MS);

    return () => clearTimeout(id);
  }, [phase, index, total, totalMs]);

  const won = you > bot;

  // Bank the session exactly once, when it ends. The ref is the guard rather
  // than state, so nothing is set synchronously while the effect runs.
  const savedRef = useRef(false);

  useEffect(() => {
    if (phase !== "over" || savedRef.current || !user || !found) return;
    savedRef.current = true;

    const xp = answers.reduce((sum, a) => sum + xpForAnswer(a), 0) + (won ? 50 : 0);
    const correct = answers.filter((a) => a.correct).length;
    const snapshot = progress;

    recordSession(user.uid, {
      game: "racer",
      subunitId,
      correct,
      total,
      xp,
      won,
    })
      .then(() => {
        setBefore(snapshot);
        setAfter({ ...snapshot, xp: snapshot.xp + xp });
      })
      .catch(() => {
        setBefore(snapshot);
        setAfter(null);
      });
  }, [phase, user, found, answers, won, progress, subunitId, total]);

  if (!found) {
    return <Missing />;
  }

  const xpEarned =
    answers.reduce((sum, a) => sum + xpForAnswer(a), 0) + (won ? 50 : 0);
  const lead = you - bot;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-5 px-6 text-[13px]">
        <span className="font-medium">Racer</span>
        <span className="font-mono text-[11px] text-faint tnum">
          {found.subunit.code} · {found.course.name}
        </span>

        <span className="ml-auto flex items-center gap-5">
          <span
            className={`font-mono text-[13px] tnum ${
              msLeft <= 5000 && phase === "asking"
                ? "animate-clock-urgent text-out"
                : "text-muted"
            }`}
          >
            {phase === "over" ? "—" : `0:${String(Math.ceil(msLeft / 1000)).padStart(2, "0")}`}
          </span>
          <Link href="/" className="text-faint transition-colors hover:text-ink">
            Leave
          </Link>
        </span>
      </header>

      <ClockRail
        fraction={phase === "asking" ? msLeft / totalMs : 0}
        urgent={msLeft <= 5000}
      />

      {/* ── The track. Periphery, but the reason the game is a race. ── */}
      <Track
        you={you}
        bot={bot}
        length={total}
        lead={lead}
        gain={lastGain}
        over={phase === "over"}
      />

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        {phase === "over" ? (
          <SessionSummary
            headline={
              fault
                ? "Race stopped."
                : won
                  ? "You took the race."
                  : you === bot
                    ? "Dead heat."
                    : "The bot took it."
            }
            detail={
              fault ?? `${found.subunit.name} · ${DIFFICULTY[difficulty].name}`
            }
            details={answers}
            xpEarned={xpEarned}
            before={before}
            after={after}
            onAgain={() => {
              setIndex(0);
              setEntered(null);
              setYou(0);
              setBot(0);
              setAnswers([]);
              setLastGain(null);
              setReveal(null);
              setScore(null);
              setSessionId(null);
              setQuestions([]);
              setFault(null);
              savedRef.current = false;
              setBefore(null);
              setAfter(null);
              setMsLeft(totalMs);
              setPhase("asking");
            }}
          />
        ) : (
          question && (
            <QuestionStage
              question={question}
              eyebrow={found.subunit.name}
              draft={draft}
              reveal={reveal}
              score={score}
              onDraft={setDraft}
              onSubmit={(response) => {
                if (phase === "asking") resolve(response, msLeft);
              }}
            />
          )
        )}
      </main>
    </div>
  );
}

function Track({
  you,
  bot,
  length,
  lead,
  gain,
  over,
}: {
  you: number;
  bot: number;
  length: number;
  lead: number;
  gain: number | null;
  over: boolean;
}) {
  // Two lengths per question is the theoretical maximum, so the finish line
  // sits there and the bar never has to rescale mid-race.
  const max = Math.max(1, length * 2);
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;

  return (
    <section className="flex shrink-0 flex-col gap-3 border-b border-line-soft px-6 py-5">
      <div className="flex items-baseline gap-4">
        <span className="eyebrow">Track</span>
        <span
          className={`font-mono text-[11px] tnum ${
            lead > 0 ? "text-accent" : lead < 0 ? "text-out" : "text-faint"
          }`}
        >
          {over
            ? "Finished"
            : lead === 0
              ? "Level"
              : lead > 0
                ? `You lead by ${lead.toFixed(1)}`
                : `Behind by ${Math.abs(lead).toFixed(1)}`}
        </span>
        {gain !== null && (
          <span
            key={`${you}`}
            className="animate-question-in font-mono text-[11px] text-correct tnum"
          >
            +{gain.toFixed(1)}
          </span>
        )}
      </div>

      <Lane label="You" value={you} width={pct(you)} accent />
      <Lane label="Bot" value={bot} width={pct(bot)} />
    </section>
  );
}

function Lane({
  label,
  value,
  width,
  accent,
}: {
  label: string;
  value: number;
  width: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-8 font-mono text-[11px] ${accent ? "text-ink" : "text-faint"}`}
      >
        {label}
      </span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${
            accent ? "bg-accent" : "bg-faint"
          }`}
          style={{ width }}
        />
      </span>
      <span className="w-9 text-right font-mono text-[11px] text-muted tnum">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function Missing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">
        That subunit isn&apos;t stocked yet.
      </h1>
      <p className="max-w-sm text-[15px] text-muted">
        Pick another subunit from the library — the ones with a question count
        are ready to play.
      </p>
      <Link
        href="/"
        className="rounded-sm bg-accent px-4.5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
      >
        Back to library
      </Link>
    </main>
  );
}
