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
import { Track3D } from "@/components/racer-track-3d";
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

/** Elapsed milliseconds as m:ss. Races run long enough to need the minutes. */
function stopwatch(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

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

  // Par, not a deadline. Nothing happens when it runs out — the race has no
  // clock and you answer at your own pace. All it sets is how long an answer
  // can take before it stops earning the speed half of the distance, which
  // makes efficiency worth something without making slowness a failure.
  const parMs = DIFFICULTY[difficulty].seconds * 1000;

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
  const [elapsed, setElapsed] = useState(0);
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
    async (response: Answered, msTaken: number) => {
      if (!question || !sessionId) return;

      // Answer instantly and speed is worth its full share; take par or
      // longer and it is worth nothing. It never goes negative — a slow
      // answer earns less, it is not punished.
      const speed = Math.max(0, Math.min(1, 1 - msTaken / parMs));
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
        // The bot takes its own share of par to think, so it is racing the
        // same trade-off you are rather than racing a clock.
        const botThink =
          BOT.minThink + Math.random() * (BOT.maxThink - BOT.minThink);
        setBot((d) => d + 1 + (1 - botThink));
      }
    },
    [question, index, parMs, difficulty, sessionId, setDraft],
  );

  // One grading session per race. The stopwatch below waits on it, so that
  // time spent opening the session is not charged to your first answer.
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

  // A stopwatch, counting up. Nothing fires when it passes par — it exists to
  // price the answer, not to end it, so there is no deadline to race and no
  // path that submits on your behalf.
  const askedAt = useRef(0);

  useEffect(() => {
    if (phase !== "asking" || !question || !sessionId) return;

    // Zeroed by whoever moves the race on rather than here, so that starting
    // the stopwatch is not itself a state change during the effect.
    const startedAt = Date.now();
    askedAt.current = startedAt;

    // Wall-clock differences rather than an accumulating counter, so a
    // throttled tab reports the time the question was really open for.
    const id = setInterval(() => setElapsed(Date.now() - startedAt), TICK_MS);
    return () => clearInterval(id);
  }, [phase, index, question, sessionId]);

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
      setElapsed(0);
      setPhase("asking");
    }, REVEAL_MS);

    return () => clearTimeout(id);
  }, [phase, index, total]);

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
          {/* Counting up, never down, and never urgent. It reports what this
              answer is costing you rather than threatening to end it. */}
          <span className="font-mono text-[13px] text-muted tnum">
            {phase === "over" ? "—" : stopwatch(elapsed)}
          </span>
          <Link href="/" className="text-faint transition-colors hover:text-ink">
            Leave
          </Link>
        </span>
      </header>

      {/* The speed bonus draining away, not a clock. When it empties the
          question stays open and a right answer still moves you a length. */}
      <ClockRail
        fraction={phase === "asking" ? Math.max(0, 1 - elapsed / parMs) : 0}
        urgent={false}
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
              setElapsed(0);
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
                // Timed from the answer, not from the last tick, so the
                // hundredths between ticks are not rounded in your favour.
                if (phase === "asking") {
                  resolve(response, Date.now() - askedAt.current);
                }
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
  return (
    <section className="flex shrink-0 flex-col gap-3 border-b border-line-soft px-6 py-4">
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

        <span className="ml-auto font-mono text-[11px] text-muted tnum">
          <span className="text-ink">You {you.toFixed(1)}</span>
          <span className="mx-2 text-faint">·</span>
          Bot {bot.toFixed(1)}
        </span>
      </div>

      {/* Two lengths per question is the most anyone can score, so the finish
          line sits there and the road never rescales mid-race. */}
      <div className="h-40 overflow-hidden rounded-[10px] border border-line sm:h-60">
        <Track3D you={you} bot={bot} length={length} over={over} />
      </div>
    </section>
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
