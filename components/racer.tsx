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
  applySession,
  xpForAnswer,
  type Progress,
} from "@/lib/progression";
import { LeaveGame, QuestionStage } from "@/components/question-stage";
import { Wordmark } from "@/components/wordmark";
import { Track3D } from "@/components/racer-track-3d";
import { SessionSummary } from "@/components/session-summary";
import { GradeError, grade, openSession } from "@/lib/grade";
import type { AnswerDetail } from "@/lib/review";
import {
  wantsExplaining,
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

/**
 * The opening of a session pays double.
 *
 * Two a question is the right number for a race and the wrong one for the
 * first thirty seconds of one: the grid is where a game gets decided to be
 * slow, and by the time the rate stops mattering the player has already left.
 * So the first three questions are worth four, and the track says so while
 * they are — which makes the drop back to two the end of something that was
 * announced, rather than the game quietly getting stingier.
 *
 * A miss costs the same throughout. This is a bonus on the way up, not a
 * different set of rules for the opening.
 */
const HEAD_START = 4;
const HEAD_QUESTIONS = 3;

/**
 * Standing still, in metres per second given back.
 *
 * Par is the subunit's own difficulty time — the fifteen, twenty-two or thirty
 * seconds the library advertises — and not a rolling average of your own
 * answers, which would tighten every time you got quicker and so charge you
 * for improving, and which is not a number at all on the first question.
 *
 * Past par you give back two, and two more seven seconds later — and then no
 * more until the next question. Two steps is the whole of what one question
 * can cost, because without a stop a single hard one taken slowly enough is
 * worth five right answers, and the rule stops being about idling and starts
 * being about thinking. Keeping the stop per question rather than per session
 * means sitting out the *next* one still costs, which is the part that is
 * actually about idling.
 *
 * Par is the thinking allowance, so nothing is taken until the whole of it has
 * been spent, the track says it is coming five seconds out, and none of it can
 * put you below the standstill you started on.
 */
const IDLE_STEP = 2;
const IDLE_EVERY = 7000;
const IDLE_MAX = 2;
const IDLE_WARN = 5000;

/**
 * The speed you roll off the line at, in metres per second.
 *
 * A race that opens at a standstill spends its first question looking like a
 * race that has not started, and the dial reading nothing is the least
 * inviting thing on the screen. Rolling means the first answer speeds you up
 * rather than starting you.
 *
 * It is a floor as well as a start: standing still can take back everything
 * you have earned and nothing beyond it, which is what it always did — the
 * standstill it stops at has simply moved up.
 *
 * Both cars roll off it, and the rival's ceiling is lifted by the same amount.
 * The race is decided on `pace > botPace`, so starting one of them ten ahead
 * would not have changed how the opening looks — it would have handed the
 * player a lead the rival cannot reach until the fifth question. What this
 * changes is the lights, not the finish.
 */
const START_PACE = 10;

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
  const [botPace, setBotPace] = useState(START_PACE);
  /** What standing still has given back this session, in metres per second. */
  const [idleLoss, setIdleLoss] = useState(0);

  // The correct answer is not in this bundle — it arrives with the verdict.
  const [reveal, setReveal] = useState<Reveal | null>(null);
  /** Why the last answer was wrong. Server-sent, and only ever on a miss. */
  const [steps, setSteps] = useState<string[] | undefined>(undefined);
  const [perEntry, setPerEntry] = useState<string[] | undefined>(undefined);
  const [score, setScore] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  /**
   * Something went wrong that the race can carry on from — as opposed to
   * `fault`, which ends it. Cleared by the next answer that lands.
   */
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * The position currently being graded, so a second press while the first is
   * still in the air is recognised as the same answer rather than another one.
   *
   * The server would refuse the duplicate anyway — a position is claimed once
   * — but the cheapest duplicate is the one never sent, and stopping it here
   * also keeps the answer out of `times`, which the rival's pace is read off.
   */
  const grading = useRef<number | null>(null);

  const total = questions.length;
  const question = questions[index];

  /**
   * Par for the question that is up, from the subunit it came from rather than
   * from the race, since a race can mix several. It prices the speed bonus
   * when the answer lands and it is where standing still starts to cost.
   */
  const parMs = question
    ? DIFFICULTY[difficultyOfQuestion(question.id)].seconds * 1000
    : 0;

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

      // One submission per position. A double tap, an impatient second press
      // on a slow connection, Enter held down — all of them are this same
      // answer, and only the first of them is worth a request.
      if (grading.current === index) return;
      grading.current = index;

      // The subunit this question came from sets its par and pays its XP. A
      // race can mix several, and a hard question answered in a mixed race is
      // still a hard question.
      const difficulty = difficultyOfQuestion(question.id);

      // Par now sets two things and is still not a deadline: how long an
      // answer can take before it stops earning the speed half of the
      // distance, and where standing still starts giving speed back. There is
      // still no clock — no countdown, no stopwatch, no rail draining — and
      // nothing is ever submitted on your behalf. The only thing shown is the
      // last five seconds before the second of those, and only then.

      // Answer instantly and speed is worth its full share; take par or
      // longer and it is worth nothing. It never goes negative — a slow
      // answer earns less, it is not punished.
      const speed = Math.max(0, Math.min(1, 1 - msTaken / parMs));
      setDraft(response);

      let verdict;
      try {
        verdict = await grade(sessionId, index, response);
      } catch (e) {
        // Already answered. An earlier submission of this same answer won the
        // position, so its verdict is already arriving or already shown —
        // there is nothing to do here, and ending the race over the *second*
        // copy of an answer that worked is the worst possible reading of it.
        if (e instanceof GradeError && e.alreadyAnswered) return;

        // Turned away before the position was claimed, so the question is
        // still live and the same answer can go again. Say so and leave it up.
        if (e instanceof GradeError && e.retryable) {
          grading.current = null;
          setNotice(e.message);
          return;
        }

        // Anything else is a race that cannot be graded, and it is over.
        // Better to say so than to quietly mark every remaining question wrong.
        setFault(
          e instanceof GradeError ? e.message : "Lost contact with the server.",
        );
        setPhase("over");
        return;
      }

      // Timed answers feed the rival's pace, so only an answer that actually
      // graded is counted — a refused one took no thinking time of its own.
      setTimes((t) => [...t, msTaken]);
      setNotice(null);
      setReveal(verdict.reveal);
      setScore(verdict.score);
      setSteps(verdict.steps);
      setPerEntry(verdict.perEntry);
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
          perEntry: verdict.perEntry,
        },
      ]);

      // A step of pace either way. How quickly it came still counts, but
      // through the rival rather than through you: the clock it is chasing you
      // on is wound to your own best answer.
      setLastGain(verdict.correct ? gainAt(index) : -PER_MISS);
    },
    [question, index, sessionId, parMs, setDraft],
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

  // When the question went up. Still one wall-clock reading per question
  // rather than a ticking counter — but the render reads it now, so it is
  // state: the strip on the track counts down to par off it. Nothing here
  // ticks; the strip keeps its own clock, and only while it is on screen.
  //
  // The stamp carries the position it was taken for, because state arrives a
  // render after the question does. Without that, the first frame of question
  // four is painted holding question three's stamp — and on a question that
  // ran past par, that frame paints the strip saying speed is coming off.
  const [asked, setAsked] = useState<{ index: number; at: number } | null>(null);
  const askedAt = asked?.index === index ? asked.at : 0;

  /**
   * There is an explanation on the screen, so the reveal waits to be dismissed.
   *
   * Not the same thing as having got it wrong, which is what this used to ask.
   * A matrix that scored three of four passed and still has a wrong entry
   * named underneath it, and flicking past that after a second is the same
   * disappearance the close-ones list exists to stop — worse, in fact, since
   * the end screen would then print working for a question the student was
   * never shown any. The same predicate the reveal itself is gated on, so the
   * two cannot disagree about whether there is something down there to read.
   */
  const explaining =
    !!question && score !== null && wantsExplaining(question.kind, score);

  const advance = useCallback(() => {
    if (index >= total - 1) {
      setPhase("over");
      return;
    }
    setReveal(null);
    setScore(null);
    setSteps(undefined);
    setPerEntry(undefined);
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
    const id = explaining ? null : window.setTimeout(advance, REVEAL_MS);

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
  }, [phase, explaining, advance]);

  // What the answers have earned: four a question for the first three, two a
  // question after that, one back for every one missed.
  //
  // Floored at every step rather than only at the end, so a standstill is a
  // standstill: missing one while already stopped costs nothing, where a
  // running total left free to go negative would have quietly banked the debt
  // and eaten the next answer.
  const earned = Math.min(
    TOP_PACE,
    answers.reduce(
      (v, a, i) => Math.max(START_PACE, v + (a.correct ? gainAt(i) : -PER_MISS)),
      START_PACE,
    ),
  );

  // And your pace is what is left of it after standing still. Floored at the
  // speed the session started on, which is the roll off the line: the race can
  // take back everything you have earned, and nothing beyond it.
  const pace = Math.max(START_PACE, earned - idleLoss);

  // Each idle step fires from a timeout, long after the render that set it, so
  // it reads the speed there is to take through a ref rather than closing over
  // whatever it was when the question went up.
  const earnedNow = useRef(0);

  useEffect(() => {
    earnedNow.current = earned;
  }, [earned]);

  /**
   * The question goes up, and standing still starts costing at par: two once,
   * then two more seven seconds after that, and there it stops for this
   * question.
   *
   * Stamping and winding the clock are the same effect because they are the
   * same moment. Read the stamp back out of state to wind from instead, and
   * the wind happens a render early, off the *previous* question's stamp — a
   * question that ran past par would have taken two more off the moment the
   * next one appeared.
   *
   * Like the rival's clock it runs only while a question is actually up: a
   * reveal is not stalling, and reading why you were wrong is the one part of
   * a race worth being slow in. And every step is clamped to the speed there
   * is to take, so a race cannot run up a debt while stopped and have it eat
   * the answers that follow.
   */
  useEffect(() => {
    if (phase !== "asking" || !question || !sessionId) return;

    setAsked({ index, at: Date.now() });

    let taken = 0;
    let id = window.setTimeout(function bite() {
      setIdleLoss((lost) =>
        Math.min(lost + IDLE_STEP, earnedNow.current - START_PACE),
      );
      taken += 1;
      if (taken < IDLE_MAX) id = window.setTimeout(bite, IDLE_EVERY);
    }, parMs);

    return () => window.clearTimeout(id);
  }, [phase, index, question, sessionId, parMs]);

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
  const botCap = Math.min(TOP_PACE, START_PACE + index * PER_ANSWER);

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
      .then((saved) => {
        setBefore(snapshot);
        // The progress the transaction actually wrote, read back rather than
        // recomputed. Projecting it here instead is what showed somebody a
        // fresh "0d" on the day they started their streak — the projection
        // starts from whatever this tab last heard, and the transaction starts
        // from what is in the database, which is not always the same thing.
        setAfter(saved);
      })
      .catch(() => {
        setBefore(snapshot);
        // Nothing came back, so the best available reading of the session is
        // the same one the transaction would have made. Still better than the
        // progress from before the race, which is the one thing it is not.
        setAfter(applySession(snapshot, { xp: xp, won: won, at: new Date() }));
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
          <LeaveGame />
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
        headLeft={phase === "over" ? 0 : Math.max(0, HEAD_QUESTIONS - index)}
        stall={phase === "asking" && askedAt ? { askedAt, parMs } : null}
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
              setNotice(null);
              grading.current = null;
              setBotPace(START_PACE);
              setIdleLoss(0);
              setAsked(null);
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
                perEntry={perEntry}
                onDraft={setDraft}
                onSubmit={(response) => {
                  // Timed from the answer, not from the last tick, so the
                  // hundredths between ticks are not rounded in your favour.
                  // No stamp yet means the question has only just been painted,
                  // and an answer inside that frame took no time to speak of.
                  if (phase === "asking") {
                    resolve(response, askedAt ? Date.now() - askedAt : 0);
                  }
                }}
              />
              {notice && (
                <p
                  role="alert"
                  className="rounded-sm border border-out/40 bg-out/8 px-3.5 py-2.5 text-[13px] text-ink"
                >
                  {notice} Your answer is still on the screen — send it again.
                </p>
              )}

              {phase === "revealed" && explaining && <Continue onGo={advance} />}
            </div>
          )
        )}
      </main>
    </div>
  );
}

/** What the answer in position `i` is worth. The opening ones pay more. */
function gainAt(i: number): number {
  return i < HEAD_QUESTIONS ? HEAD_START : PER_ANSWER;
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
  headLeft,
  stall,
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
  /** Questions still paying the head start, this one counted. Zero after. */
  headLeft: number;
  /** The question that is up, while one is. Null through a reveal. */
  stall: { askedAt: number; parMs: number } | null;
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

        {/* Said out loud for as long as it is true, and counted down, so that
            the question the head start runs out on is one you saw coming. */}
        {headLeft > 0 && (
          <span className="font-mono text-[11px] text-correct tnum">
            head start: +{HEAD_START} · {headLeft} left
          </span>
        )}

        {stall && <Stall askedAt={stall.askedAt} parMs={stall.parMs} />}

        {/* Keyed on the value so the number replays its arrival every time it
            moves. It is the thing a correct answer actually buys, and it used
            to change between two frames nobody was looking at. */}
        <span className="ml-auto font-mono text-[11px] text-muted tnum">
          <span className="text-ink">
            You{" "}
            <span key={pace} className="animate-pace inline-block">
              {pace}
            </span>
          </span>
          <span className="mx-2 text-faint">·</span>
          Bot {botPace}
        </span>
      </div>

      {/* There is no finish line for most of a race. It comes out of the fog
          with a handful of questions to go and closes in from there, so the
          end of the race is something you arrive at rather than something
          held in front of you the whole way. */}
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

/**
 * The warning that standing still is about to cost speed, and then that it is
 * costing it.
 *
 * Silent until five seconds from par, because a strip that is on the screen
 * the whole time is a clock, and a clock is the thing this race deliberately
 * does not have. It keeps its own quarter-second tick so that counting down
 * does not re-render the race around it.
 */
function Stall({ askedAt, parMs }: { askedAt: number; parMs: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const past = now - askedAt - parMs;
  if (past < -IDLE_WARN) return null;

  // Both steps this question had to give are gone, and nothing further is
  // coming until the next one. Saying so is the difference between a question
  // that has finished costing and one that is still counting.
  const spent = past >= IDLE_EVERY * (IDLE_MAX - 1);

  // Before par, how long is left of it. After par, how long until the step
  // still to come — measured from par, the same as the steps themselves.
  const seconds =
    past < 0
      ? Math.ceil(-past / 1000)
      : Math.ceil((IDLE_EVERY - (past % IDLE_EVERY)) / 1000);

  return (
    <span
      className={`font-mono text-[11px] tnum ${
        past < 0 ? "text-muted" : "text-out"
      }`}
    >
      {past < 0
        ? `−${IDLE_STEP} m/s in ${seconds}s`
        : spent
          ? `−${IDLE_STEP * IDLE_MAX} m/s · no more on this one`
          : `−${IDLE_STEP} m/s · again in ${seconds}s`}
    </span>
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
