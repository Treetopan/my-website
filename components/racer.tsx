"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DIFFICULTY, describe, seededShuffle, type Question } from "@/lib/curriculum";
import { useAuth } from "@/lib/auth-context";
import { recordSession, watchProgress } from "@/lib/rtdb";
import {
  EMPTY_PROGRESS,
  xpForAnswer,
  type AnswerRecord,
  type Progress,
} from "@/lib/progression";
import { ClockRail, QuestionStage } from "@/components/question-stage";
import { SessionResults } from "@/components/session-results";

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

  // A fresh shuffle per race, held in state so a re-render never reorders
  // the questions under the player.
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const questions: Question[] = found
    ? seededShuffle(found.subunit.questions, seed)
    : [];

  const difficulty = found?.subunit.difficulty ?? "medium";
  const totalMs = DIFFICULTY[difficulty].seconds * 1000;

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [picked, setPicked] = useState<number | null>(null);
  const [msLeft, setMsLeft] = useState(totalMs);
  const [you, setYou] = useState(0);
  const [bot, setBot] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [lastGain, setLastGain] = useState<number | null>(null);

  const total = questions.length;
  const question = questions[index];

  const resolve = useCallback(
    (choice: number | null, msRemaining: number) => {
      if (!question) return;

      const correct = choice === question.answer;
      const speed = Math.max(0, Math.min(1, msRemaining / totalMs));

      setPicked(choice);
      setPhase("revealed");
      setAnswers((prev) => [...prev, { difficulty, correct, speed }]);

      // Distance is one length for being right, plus up to another for being
      // quick. Speed is the whole point of a race, so it has to move the car.
      const gain = correct ? 1 + speed : 0;
      setLastGain(correct ? gain : null);
      if (correct) setYou((d) => d + gain);

      const botRight = Math.random() < BOT.accuracy;
      if (botRight) {
        const botSpeed =
          BOT.minThink + Math.random() * (BOT.maxThink - BOT.minThink);
        setBot((d) => d + 1 + (1 - botSpeed));
      }
    },
    [question, totalMs, difficulty],
  );

  const resolveRef = useRef(resolve);
  useEffect(() => {
    resolveRef.current = resolve;
  }, [resolve]);

  // Clock counts against a wall-clock deadline so a throttled tab cannot
  // hand out extra seconds.
  useEffect(() => {
    if (phase !== "asking" || !question) return;

    const deadline = Date.now() + totalMs;
    const id = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setMsLeft(left);
      if (left === 0) {
        clearInterval(id);
        resolveRef.current(null, 0);
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [phase, index, totalMs, question]);

  // Advance, or end the race.
  useEffect(() => {
    if (phase !== "revealed") return;

    const id = setTimeout(() => {
      if (index >= total - 1) {
        setPhase("over");
        return;
      }
      setPicked(null);
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

  const correctCount = answers.filter((a) => a.correct).length;
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
          <SessionResults
            headline={won ? "You took the race." : you === bot ? "Dead heat." : "The bot took it."}
            detail={`${found.subunit.name} · ${DIFFICULTY[difficulty].name}`}
            correct={correctCount}
            total={total}
            xpEarned={xpEarned}
            before={before}
            after={after}
            onAgain={() => {
              setSeed(Math.floor(Math.random() * 2 ** 31));
              setIndex(0);
              setPicked(null);
              setYou(0);
              setBot(0);
              setAnswers([]);
              setLastGain(null);
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
              eyebrow={`Question ${index + 1} of ${total}`}
              picked={picked}
              revealed={phase === "revealed"}
              onPick={(choice) => {
                if (phase === "asking") resolve(choice, msLeft);
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
