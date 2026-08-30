"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTY,
  describeAll,
  difficultyOfQuestion,
  selectionDifficulty,
  selectionLabel,
  selectionNames,
  subunitOfQuestion,
  type Question,
} from "@/lib/curriculum";
import { useAuth } from "@/lib/auth-context";
import { recordSession, watchProgress } from "@/lib/rtdb";
import {
  EMPTY_PROGRESS,
  xpForAnswer,
  type Progress,
} from "@/lib/progression";
import { QuestionStage } from "@/components/question-stage";
import { Wordmark } from "@/components/wordmark";
import { Track3D } from "@/components/racer-track-3d";
import { SessionSummary } from "@/components/session-summary";
import { GradeError, grade, openSession } from "@/lib/grade";
import type { AnswerDetail } from "@/lib/review";
import {
  PASS,
  emptyResponse,
  type Response as Answered,
  type Reveal,
} from "@/lib/questions";

const REVEAL_MS = 1700;

/**
 * The race, in metres per second.
 *
 * You take two for every question answered and give one back for every one
 * missed. The rival takes two on a clock wound to how quickly you have been
 * answering. Whoever is quicker when the flag falls has taken it — and the two
 * cars on the track are placed on these same two numbers, so the one in front
 * as the line arrives is the one that won.
 *
 * A miss costs less than an answer earns, so a race survives a couple of them.
 */
const PER_ANSWER = 2;
const PER_MISS = 1;

/** A ceiling on either, because a stocked subunit can ask sixty questions. */
const TOP_PACE = 40;

/**
 * The rival's handicap, in seconds, added to your typical answer. The bar is
 * holding roughly the pace you have already shown you can hold, rather than
 * beating it.
 */
const GRACE = 4;

type Phase = "asking" | "revealed" | "over";

export function Racer({ subunitIds }: { subunitIds: string[] }) {
  const found = useMemo(() => describeAll(subunitIds), [subunitIds]);
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

  // What a question here is typically worth on the clock. Only the rival's
  // opening pace reads it — every answer is priced against the par of the
  // subunit it actually came from, since a race can mix several. Mixed
  // difficulties have no one number, so the middle one stands in.
  const typical = found ? selectionDifficulty(found) : null;
  const typicalMs = DIFFICULTY[typical ?? "medium"].seconds * 1000;

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
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [lastGain, setLastGain] = useState<number | null>(null);
  /** How long each answer took, in ms. Their middle sets the rival's pace. */
  const [times, setTimes] = useState<number[]>([]);
  /** The rival's pace. It only ever climbs, and only while a question is up. */
  const [botPace, setBotPace] = useState(0);

  // The correct answer is not in this bundle — it arrives with the verdict.
  const [reveal, setReveal] = useState<Reveal | null>(null);
  /** Why the last answer was wrong. Server-sent, and only ever on a miss. */
  const [steps, setSteps] = useState<string[] | undefined>(undefined);
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

      // The subunit this question came from sets its par and pays its XP. A
      // race can mix several, and a hard question answered in a mixed race is
      // still a hard question.
      const difficulty = difficultyOfQuestion(question.id);

      // Par, not a deadline, and not shown. The race has no clock at all now —
      // no countdown, no stopwatch, no rail draining. All par sets is how long
      // an answer can take before it stops earning the speed half of the
      // distance, which prices efficiency without ever putting a number in
      // front of you to race. Nothing is displayed and nothing is ever
      // submitted on your behalf.
      const parMs = DIFFICULTY[difficulty].seconds * 1000;

      // Answer instantly and speed is worth its full share; take par or
      // longer and it is worth nothing. It never goes negative — a slow
      // answer earns less, it is not punished.
      const speed = Math.max(0, Math.min(1, 1 - msTaken / parMs));
      setTimes((t) => [...t, msTaken]);
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
      setSteps(verdict.steps);
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
          steps: verdict.steps,
        },
      ]);

      // A step of pace either way. How quickly it came still counts, but
      // through the rival rather than through you: the clock it is chasing you
      // on is wound to your own best answer.
      setLastGain(verdict.correct ? PER_ANSWER : -PER_MISS);
    },
    [question, index, sessionId, setDraft],
  );

  // One grading session per race. The stamp below waits on it, so that time
  // spent opening the session is not charged to your first answer.
  useEffect(() => {
    if (!found || sessionId) return;
    let live = true;

    openSession(subunitIds)
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
  }, [found, subunitIds, sessionId]);

  // When the question went up. A single wall-clock stamp rather than a ticking
  // counter: nothing on the screen reads it, so nothing needs it to tick. It is
  // read once, at the moment you answer, to price the speed bonus.
  const askedAt = useRef(0);

  useEffect(() => {
    if (phase !== "asking" || !question || !sessionId) return;
    askedAt.current = Date.now();
  }, [phase, index, question, sessionId]);

  /** The answer was wrong, so there is an explanation on screen to read. */
  const missed = score !== null && score < PASS;

  const advance = useCallback(() => {
    if (index >= total - 1) {
      setPhase("over");
      return;
    }
    setReveal(null);
    setScore(null);
    setSteps(undefined);
    setLastGain(null);
    setIndex(index + 1);
    setPhase("asking");
  }, [index, total]);

  // Advance, or end the race.
  useEffect(() => {
    if (phase !== "revealed") return;

    // A right answer flicks past; a wrong one waits to be dismissed. No timer
    // knows how long a sentence takes to read, and this is the one part of a
    // race worth being slow in — the rival's clock is stopped either way, so
    // staying with an explanation cannot cost the race.
    const id = missed ? null : window.setTimeout(advance, REVEAL_MS);

    const onKey = (e: KeyboardEvent) => {
      // Not on a held key: the same press that submitted the answer would
      // repeat straight through the reveal it opened.
      if (e.key !== "Enter" || e.repeat) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      if (id !== null) window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, missed, advance]);

  // Your pace: two for every question taken, one back for every one missed.
  //
  // Floored at every step rather than only at the end, so a standstill is a
  // standstill: missing one while already stopped costs nothing, where a
  // running total left free to go negative would have quietly banked the debt
  // and eaten the next answer.
  const pace = Math.min(
    TOP_PACE,
    answers.reduce(
      (v, a) => Math.max(0, v + (a.correct ? PER_ANSWER : -PER_MISS)),
      0,
    ),
  );

  // How often the rival finds another step: your typical answer plus the
  // grace, so answering in ten seconds is chased by a rival stepping up every
  // fourteen. The *middle* of your answers rather than the quickest of them,
  // because the quickest is always the same kind of question — one press on an
  // option — and charging that rate against a question where five steps have
  // to be dragged into order asks you to sort a list as fast as you can click
  // a button. Half of par stands in until there is an answer to go on, and
  // nothing under four seconds, which nobody should have to outrun.
  const botStep = Math.max(4, (middle(times) ?? typicalMs / 2) / 1000 + GRACE);

  // And it can hold no more than a question's worth of pace per question you
  // have already been through — so it is always one question behind, and a
  // faultless race always takes it.
  //
  // Its clock is a rate, and a rate alone is the wrong shape for this: one
  // slow question — an ordering one, where the answer is known and the
  // dragging is the whole cost — hands it four steps against the single step
  // it cost you, and a race is lost on the question types it happened to deal
  // you rather than on the answers.
  const botCap = Math.min(TOP_PACE, index * PER_ANSWER);

  /**
   * The rival's clock, one step at a time.
   *
   * It runs only while a question is actually up. A reveal is dead time for
   * you and would otherwise be free pace for it — and since a missed answer is
   * held on screen for four seconds, reading why you were wrong would have
   * been the most expensive thing in the race.
   */
  const botHeld = useRef(0);
  const botSince = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "asking" || !sessionId || botPace >= botCap) return;

    botSince.current = Date.now();
    const wait = Math.max(0, botStep * 1000 - botHeld.current);
    const id = window.setTimeout(() => {
      botSince.current = null;
      botHeld.current = 0;
      setBotPace((v) => Math.min(botCap, v + PER_ANSWER));
    }, wait);

    return () => {
      window.clearTimeout(id);
      // Bank the part of the interval already served, so stopping for a reveal
      // costs the rival nothing and gives it nothing.
      if (botSince.current !== null) {
        botHeld.current += Date.now() - botSince.current;
        botSince.current = null;
      }
    };
  }, [phase, sessionId, botPace, botCap, botStep]);

  const won = pace > botPace;

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
      subunitIds,
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
  }, [phase, user, found, answers, won, progress, subunitIds, total]);

  if (!found) {
    return <Missing />;
  }

  const xpEarned =
    answers.reduce((sum, a) => sum + xpForAnswer(a), 0) + (won ? 50 : 0);
  const lead = pace - botPace;

  // Where the finish line goes: a question that has been revealed is one that
  // is no longer to come.
  const remaining =
    phase === "over" ? 0 : total - index - (phase === "revealed" ? 1 : 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-5 px-6 text-[13px]">
        <Wordmark />
        <span className="font-medium">Racer</span>
        <span className="font-mono text-[11px] text-faint tnum">
          {selectionLabel(found)} · {found.course.name}
        </span>

        {/* No clock, no stopwatch, no draining rail. Nothing here counts
            anything while you think — the question number and the gap are the
            only state the header carries. */}
        <span className="ml-auto flex items-center gap-5">
          <span className="font-mono text-[11px] text-faint tnum">
            {phase === "over" ? "Finished" : `Q${index + 1}`}
          </span>
          <Link href="/" className="text-faint transition-colors hover:text-ink">
            Leave
          </Link>
        </span>
      </header>

      {/* ── The track. Periphery, but the reason the game is a race. ── */}
      <Track
        pace={pace}
        botPace={botPace}
        remaining={remaining}
        lead={lead}
        gain={lastGain}
        count={answers.length}
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
                  : pace === botPace
                    ? "Dead heat."
                    : "The bot took it."
            }
            detail={
              fault ??
              `${selectionNames(found)} · ${
                typical ? DIFFICULTY[typical].name : "Mixed difficulty"
              }`
            }
            details={answers}
            xpEarned={xpEarned}
            before={before}
            after={after}
            onAgain={() => {
              setIndex(0);
              setEntered(null);
              setAnswers([]);
              setLastGain(null);
              setTimes([]);
              setBotPace(0);
              botHeld.current = 0;
              botSince.current = null;
              setReveal(null);
              setScore(null);
              setSessionId(null);
              setQuestions([]);
              setFault(null);
              savedRef.current = false;
              setBefore(null);
              setAfter(null);
              setPhase("asking");
            }}
          />
        ) : (
          question && (
            <div className="flex w-full max-w-3xl flex-col gap-7">
              <QuestionStage
                question={question}
                eyebrow={subunitOfQuestion(question.id)?.name ?? found.unit.name}
                draft={draft}
                reveal={reveal}
                score={score}
                steps={steps}
                onDraft={setDraft}
                onSubmit={(response) => {
                  // Timed from the answer, not from the last tick, so the
                  // hundredths between ticks are not rounded in your favour.
                  if (phase === "asking") {
                    resolve(response, Date.now() - askedAt.current);
                  }
                }}
              />
              {phase === "revealed" && missed && <Continue onGo={advance} />}
            </div>
          )
        )}
      </main>
    </div>
  );
}

/** The middle answer, or null for none yet. An even count takes both middles. */
function middle(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = sorted.length >> 1;
  return sorted.length % 2 ? sorted[at] : (sorted[at - 1] + sorted[at]) / 2;
}

/**
 * How a missed question is dismissed. Shown only there: a right answer moves
 * on by itself in under two seconds and has nothing to read. Said out loud
 * rather than left to be found, because a screen that is waiting for you looks
 * exactly like a screen that has stopped working.
 */
function Continue({ onGo }: { onGo: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onGo}
        className="rounded-sm border border-line px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-faint hover:bg-surface-2"
      >
        Continue
      </button>
      <span className="font-mono text-[11px] text-faint">
        Enter · take as long as you like, the rival is stopped too
      </span>
    </div>
  );
}

function Track({
  pace,
  botPace,
  remaining,
  lead,
  gain,
  count,
  over,
}: {
  /** Both in metres per second. Whoever is quicker at the flag has won. */
  pace: number;
  botPace: number;
  remaining: number;
  lead: number;
  /** The last answer, as the step of pace it was worth. */
  gain: number | null;
  /** Answers given. It restarts the flash animation, nothing more. */
  count: number;
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
                ? `You lead by ${lead} m/s`
                : `Behind by ${Math.abs(lead)} m/s`}
        </span>
        {gain !== null && (
          <span
            key={count}
            className={`animate-question-in font-mono text-[11px] tnum ${
              gain > 0 ? "text-correct" : "text-out"
            }`}
          >
            {gain > 0 ? `+${gain}` : `−${Math.abs(gain)}`}
          </span>
        )}

        <span className="ml-auto font-mono text-[11px] text-muted tnum">
          <span className="text-ink">You {pace}</span>
          <span className="mx-2 text-faint">·</span>
          Bot {botPace}
        </span>
      </div>

      {/* The finish sits two lengths ahead per question still to come, so it
          closes in over the race rather than the road rescaling under it. */}
      <div className="h-44 overflow-hidden rounded-[10px] border border-line sm:h-60">
        <Track3D
          speed={pace}
          botSpeed={botPace}
          remaining={remaining}
          over={over}
        />
      </div>
    </section>
  );
}

function Missing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">
        That isn&apos;t a subunit we can race on.
      </h1>
      <p className="max-w-sm text-[15px] text-muted">
        Pick again from the library — the subunits with a question count are
        ready to play, and they have to come from one unit.
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
