"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTY,
  describeAll,
  difficultyOfQuestion,
  selectionLabel,
  subunitOfQuestion,
  type Question,
} from "@/lib/curriculum";
import { useAuth } from "@/lib/auth-context";
import { recordSession, watchProgress } from "@/lib/rtdb";
import { EMPTY_PROGRESS, xpForAnswer, type Progress } from "@/lib/progression";
import { QuestionStage } from "@/components/question-stage";
import { Wordmark } from "@/components/wordmark";
import { PracticeReport } from "@/components/practice-report";
import { GradeError, grade, openSession } from "@/lib/grade";
import type { AnswerDetail } from "@/lib/review";
import {
  PASS,
  emptyResponse,
  type Response as Answered,
  type Reveal,
} from "@/lib/questions";

/** How long a correct answer sits on the screen before the next one arrives. */
const REVEAL_MS = 1300;

type Phase = "asking" | "revealed" | "over";

/**
 * Practice: the questions, and nothing around them.
 *
 * No rival, no table, no clock and no track — a set of questions, one after
 * another, and a report at the end. Everything the games put in the periphery
 * is there to make answering feel like something; the point of this mode is
 * that some of the time it should not, because a student revising the night
 * before a test is not looking for a game.
 *
 * Two things it does that the games deliberately do not:
 *
 *   - It says how many questions are left. The games hide it because knowing
 *     the end is coming changes how people play — which is exactly why a
 *     practice set shows it. You are meant to be able to see the end.
 *
 *   - It times each answer and reports the middle one back at the end. Nothing
 *     is ever submitted on your behalf and nothing counts down; the timing is
 *     a measurement taken of the set, not a constraint put on it.
 */
export function Practice({ subunitIds }: { subunitIds: string[] }) {
  const found = useMemo(() => describeAll(subunitIds), [subunitIds]);
  const { user } = useAuth();

  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [before, setBefore] = useState<Progress | null>(null);
  const [after, setAfter] = useState<Progress | null>(null);

  useEffect(() => {
    if (!user) return;
    return watchProgress(user.uid, setProgress);
  }, [user]);

  // The server fixes the question order when the session opens and sends the
  // questions with it — a generated subunit invents them per session, so there
  // is nothing in this bundle to look them up in.
  const [questions, setQuestions] = useState<Question[]>([]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  // Stamped with the question it belongs to and read back only for that
  // question, so a draft of the wrong kind is never handed to an input.
  const [entered, setEntered] = useState<{ id: string; response: Answered } | null>(
    null,
  );
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);

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
      // set can mix several, and a hard question answered in a mixed set is
      // still a hard question.
      const difficulty = difficultyOfQuestion(question.id);
      const parMs = DIFFICULTY[difficulty].seconds * 1000;

      // Par prices the XP bonus and nothing else. It is not a deadline, it is
      // never displayed while a question is up, and going past it costs the
      // bonus rather than the question.
      const speed = Math.max(0, Math.min(1, 1 - msTaken / parMs));
      setDraft(response);

      let verdict;
      try {
        verdict = await grade(sessionId, index, response);
      } catch (e) {
        // A set that cannot be graded is over. Better to say so than to
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
          ms: msTaken,
          steps: verdict.steps,
        },
      ]);
    },
    [question, index, sessionId, setDraft],
  );

  // One grading session per set. The stamp below waits on it, so that time
  // spent opening the session is not charged to the first answer.
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
            e instanceof GradeError ? e.message : "Could not start practice.",
          );
        }
      });

    return () => {
      live = false;
    };
  }, [found, subunitIds, sessionId]);

  /** When the question went up. Read once, at the moment it is answered. */
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
    setIndex(index + 1);
    setPhase("asking");
  }, [index, total]);

  // Advance, or end the set. A right answer flicks past; a wrong one waits to
  // be dismissed, because no timer knows how long a sentence takes to read and
  // there is nothing here that being slow can cost you.
  useEffect(() => {
    if (phase !== "revealed") return;

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

  const correct = answers.filter((a) => a.correct).length;
  const xpEarned = answers.reduce((sum, a) => sum + xpForAnswer(a), 0);

  // Bank the set exactly once, when it ends. The ref is the guard rather than
  // state, so nothing is set synchronously while the effect runs.
  const savedRef = useRef(false);

  useEffect(() => {
    if (phase !== "over" || savedRef.current || !user || !found) return;

    // Nothing was answered — an opening that failed, or a set left before the
    // first question. There is no session to record, no streak earned by it,
    // and no level movement for the report to show.
    if (answers.length === 0) return;

    savedRef.current = true;
    const snapshot = progress;

    recordSession(user.uid, {
      game: "practice",
      subunitIds,
      correct,
      total: answers.length,
      xp: xpEarned,
      // Practice is not won or lost. It still counts towards the streak, which
      // is what `recordSession` is really for — showing up is the mechanic.
      won: false,
    })
      .then(() => {
        setBefore(snapshot);
        setAfter({ ...snapshot, xp: snapshot.xp + xpEarned });
      })
      .catch(() => {
        setBefore(snapshot);
        setAfter(null);
      });
  }, [phase, user, found, answers, correct, xpEarned, progress, subunitIds]);

  if (!found) return <Missing />;

  const done = phase === "over";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-5 px-6 text-[13px]">
        <Wordmark />
        <span className="font-medium">Practice</span>
        <span className="font-mono text-[11px] text-faint tnum">
          {selectionLabel(found)} · {found.course.name}
        </span>

        <span className="ml-auto flex items-center gap-5">
          {/* How far through, and how it is going. Both hidden in the games
              and both shown here: a practice set is something you work
              through, so seeing the end of it is the point. */}
          <span className="font-mono text-[11px] text-faint tnum">
            {done
              ? "Finished"
              : total > 0
                ? `Q${index + 1} / ${total}`
                : "Loading"}
          </span>
          {answers.length > 0 && !done && (
            <span className="font-mono text-[11px] text-muted tnum">
              {correct}/{answers.length} right
            </span>
          )}
          <Link href="/" className="text-faint transition-colors hover:text-ink">
            Leave
          </Link>
        </span>
      </header>

      {/* The set as a line. It fills as questions are answered rather than
          draining as time passes — the one bar in this app that is not a
          clock, and the difference is the whole mode. */}
      <div className="h-0.5 w-full shrink-0 bg-line-soft" aria-hidden="true">
        <div
          className="h-full origin-left bg-accent transition-transform duration-300 ease-out"
          style={{
            transform: `scaleX(${total === 0 ? 0 : answers.length / total})`,
          }}
        />
      </div>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        {done ? (
          <div className="w-full max-w-2xl">
            {fault && (
              <p className="mb-8 text-[15px] text-out">
                {fault} What you answered before that is below.
              </p>
            )}
            <PracticeReport
              details={answers}
              xpEarned={xpEarned}
              before={before}
              after={after}
              onAgain={() => {
                setIndex(0);
                setEntered(null);
                setAnswers([]);
                setReveal(null);
                setScore(null);
                setSteps(undefined);
                setSessionId(null);
                setQuestions([]);
                setFault(null);
                savedRef.current = false;
                setBefore(null);
                setAfter(null);
                setPhase("asking");
              }}
            />
          </div>
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
                  if (phase === "asking") {
                    resolve(response, Date.now() - askedAt.current);
                  }
                }}
              />
              {phase === "revealed" && missed && (
                <Continue onGo={advance} last={index >= total - 1} />
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}

/**
 * How a missed question is dismissed. Shown only there: a right answer moves
 * on by itself and has nothing to read. Said out loud rather than left to be
 * found, because a screen that is waiting for you looks exactly like a screen
 * that has stopped working.
 */
function Continue({ onGo, last }: { onGo: () => void; last: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onGo}
        className="rounded-sm border border-line px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:border-faint hover:bg-surface-2"
      >
        {last ? "See the report" : "Continue"}
      </button>
      <span className="font-mono text-[11px] text-faint">
        Enter · take as long as you like, nothing is running
      </span>
    </div>
  );
}

function Missing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">
        That isn&apos;t a subunit we can practise.
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
