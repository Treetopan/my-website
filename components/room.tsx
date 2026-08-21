"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  DIFFICULTY,
  describe,
  seededShuffle,
  type Question,
} from "@/lib/curriculum";
import {
  createRoom,
  closeRoomCode,
  findRoomByCode,
  readAnswers,
  joinRoom,
  recordSession,
  startRoom,
  submitAnswer,
  updateRoom,
  watchProgress,
  watchRoom,
  type Room as RoomData,
  type RoomPlayer,
} from "@/lib/rtdb";
import {
  EMPTY_PROGRESS,
  xpForAnswer,
  type AnswerRecord,
  type Progress,
} from "@/lib/progression";
import { ClockRail, QuestionStage } from "@/components/question-stage";
import { SessionResults } from "@/components/session-results";

const SEATS = 3;
const REVEAL_MS = 2000;
const BOT_NAMES = ["Mara", "Dev", "Priya"];
const BOT_ACCURACY = [0.72, 0.6];

/** Firebase's clock, not the laptop's — three clients must agree on the timer. */
function useServerOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    return onValue(ref(realtimeDb, ".info/serverTimeOffset"), (snap) => {
      setOffset(snap.val() ?? 0);
    });
  }, []);
  return offset;
}

export function Room({ subunitId }: { subunitId: string }) {
  const found = describe(subunitId);
  const { user } = useAuth();
  const offset = useServerOffset();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [before, setBefore] = useState<Progress | null>(null);
  const [afterP, setAfterP] = useState<Progress | null>(null);


  // Keyed by question index, so moving on clears the current pick without an
  // effect, and the whole run is still here at the end to score from.
  const [myPicks, setMyPicks] = useState<Record<number, number>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!user) return;
    return watchProgress(user.uid, setProgress);
  }, [user]);

  useEffect(() => {
    if (!roomId) return;
    return watchRoom(roomId, setRoom);
  }, [roomId]);

  // One ticker drives every clock on the screen.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const difficulty = found?.subunit.difficulty ?? "medium";
  const totalMs = DIFFICULTY[difficulty].seconds * 1000;

  // Every client derives the same order from the room's seed, so the question
  // list itself never has to be broadcast.
  const bank = found?.subunit.questions;
  const seed = room?.seed;

  const questions: Question[] = useMemo(
    () => (bank && seed !== undefined ? seededShuffle(bank, seed) : []),
    [bank, seed],
  );

  const index = room?.currentIndex ?? 0;
  const question = questions[index];
  const startedAt = typeof room?.questionStartedAt === "number" ? room.questionStartedAt : null;
  const elapsed = startedAt ? now + offset - startedAt : 0;
  const msLeft = Math.max(0, totalMs - elapsed);
  const revealed = elapsed > totalMs;

  const isHost = !!user && room?.hostUid === user.uid;
  const players = room?.players ?? {};
  const alive = Object.entries(players).filter(([, p]) => p.alive);
  const me = user ? players[user.uid] : undefined;
  const meAlive = !!me?.alive;
  const picked = myPicks[index] ?? null;

  /**
   * Scored from my own picks. Answers now live outside the room so opponents
   * cannot read them, and there is no reason to read my own back over the
   * network when I am the one who made them.
   *
   * Last One Standing pays no speed bonus — survival is the mechanic here,
   * not pace — so every answer scores at the subunit's base rate.
   */
  const consumed = index + (revealed ? 1 : 0);

  const myAnswers: AnswerRecord[] = useMemo(
    () =>
      questions.slice(0, consumed).map((q, i) => ({
        difficulty,
        correct: myPicks[i] === q.answer,
        speed: 0,
      })),
    [questions, consumed, difficulty, myPicks],
  );

  // ── Create / join ──────────────────────────────────────
  async function create() {
    if (!user || !found) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createRoom({
        hostUid: user.uid,
        displayName: user.displayName ?? "You",
        subunitId,
        seats: SEATS,
      });
      setRoomId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the room.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const hit = await findRoomByCode(code.trim());
      if ("error" in hit) {
        setError(hit.error);
        return;
      }
      // Claiming a seat is what earns read access to the room, so this has
      // to happen before we start watching it.
      await joinRoom(hit.roomId, user.uid, user.displayName ?? "You");
      setRoomId(hit.roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join that room.");
    } finally {
      setBusy(false);
    }
  }

  /** Fill the empty seats with bots and start. Host only. */
  async function start() {
    if (!roomId || !room || !isHost) return;
    const filled: Record<string, RoomPlayer> = { ...room.players };
    let n = 0;

    while (Object.keys(filled).length < SEATS) {
      const id = `bot-${n + 1}`;
      filled[id] = {
        displayName: BOT_NAMES[n % BOT_NAMES.length],
        isBot: true,
        alive: true,
        score: 0,
        correct: 0,
        joinedAt: Date.now(),
      };
      n++;
    }

    await startRoom(roomId, room.code, filled);
  }

  // ── Answering ──────────────────────────────────────────
  async function pick(choice: number) {
    if (!roomId || !user || picked !== null || revealed || !meAlive) return;
    setMyPicks((prev) => ({ ...prev, [index]: choice }));
    await submitAnswer(roomId, index, user.uid, choice);
  }

  // ── Host resolves the question, then advances ──────────
  const resolving = useRef(false);

  useEffect(() => {
    if (!isHost || !roomId || !room || room.status !== "playing") return;
    if (!revealed || resolving.current || !question) return;

    resolving.current = true;

    const timer = setTimeout(async () => {
      const answersForQ = await readAnswers(roomId, index);
      const next: Record<string, RoomPlayer> = {};

      // Bots decide here rather than writing to the answers node, so a bot
      // never races a real player's write.
      let botN = 0;
      const got: Record<string, boolean> = {};

      for (const [uid, p] of Object.entries(room.players)) {
        if (!p.alive) {
          next[uid] = { ...p, alive: false };
          continue;
        }
        if (p.isBot) {
          const acc = BOT_ACCURACY[botN % BOT_ACCURACY.length];
          botN++;
          got[uid] = Math.random() < acc;
        } else {
          got[uid] = answersForQ[uid]?.choice === question.answer;
        }
      }

      // If nobody got it, the question is thrown out — three players all
      // dropping on one question would end the game with no winner.
      const anyRight = Object.values(got).some(Boolean);

      for (const [uid, p] of Object.entries(room.players)) {
        if (!p.alive) {
          next[uid] = p;
          continue;
        }
        const right = got[uid];
        next[uid] = {
          ...p,
          alive: anyRight ? right : true,
          correct: p.correct + (right ? 1 : 0),
          score: p.score + (right ? DIFFICULTY[difficulty].xp : 0),
        };
      }

      const stillAlive = Object.entries(next).filter(([, p]) => p.alive);
      const lastQuestion = index >= questions.length - 1;

      if (stillAlive.length <= 1 || lastQuestion) {
        const winner =
          stillAlive.length === 1
            ? stillAlive[0][0]
            : stillAlive.sort((a, b) => b[1].score - a[1].score)[0]?.[0] ?? null;

        await updateRoom(roomId, {
          players: next,
          status: "finished",
          winnerUid: winner,
        });
        await closeRoomCode(roomId, room.code);
      } else {
        await updateRoom(roomId, {
          players: next,
          currentIndex: index + 1,
          questionStartedAt: { ".sv": "timestamp" } as unknown as number,
        });
      }

      resolving.current = false;
    }, REVEAL_MS);

    return () => {
      clearTimeout(timer);
      resolving.current = false;
    };
  }, [isHost, roomId, room, revealed, question, index, questions.length, difficulty]);

  // ── Bank the session ───────────────────────────────────
  const won = !!user && room?.winnerUid === user.uid;
  const savedRef = useRef(false);

  useEffect(() => {
    if (room?.status !== "finished" || savedRef.current || !user || !found) return;
    savedRef.current = true;

    const xp = myAnswers.reduce((s, a) => s + xpForAnswer(a), 0) + (won ? 50 : 0);
    const snapshot = progress;

    recordSession(user.uid, {
      game: "last-one-standing",
      subunitId,
      correct: myAnswers.filter((a) => a.correct).length,
      total: myAnswers.length,
      xp,
      won,
    })
      .then(() => {
        setBefore(snapshot);
        setAfterP({ ...snapshot, xp: snapshot.xp + xp });
      })
      .catch(() => {
        setBefore(snapshot);
        setAfterP(null);
      });
  }, [room?.status, user, found, myAnswers, won, progress, subunitId]);

  if (!found) return <Missing />;

  // ── Screens ────────────────────────────────────────────
  if (!roomId || !room) {
    return (
      <Shell subtitle={`${found.subunit.code} · ${found.course.name}`}>
        <div className="w-full max-w-md">
          <p className="eyebrow mb-5">Last One Standing</p>
          <h1 className="text-[34px] font-semibold tracking-[-0.035em]">
            Three players. One wrong answer each.
          </h1>
          <p className="mt-3 mb-9 text-[15px] text-muted">
            {found.subunit.name} · {DIFFICULTY[difficulty].name} ·{" "}
            {DIFFICULTY[difficulty].seconds}s a question
          </p>

          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="w-full rounded-sm bg-accent px-4.5 py-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
          >
            {busy ? "Working…" : "Create a room"}
          </button>

          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-line-soft" />
            <span className="eyebrow">or join one</span>
            <span className="h-px flex-1 bg-line-soft" />
          </div>

          <div className="flex gap-2.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 rounded-sm border border-line bg-surface px-3.5 py-2.5 font-mono text-[14px] tracking-[0.18em] text-ink uppercase placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={join}
              disabled={busy || code.length < 4}
              className="rounded-sm border border-line px-4.5 py-2.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
            >
              Join
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 text-[13px] text-out">
              {error}
            </p>
          )}
        </div>
      </Shell>
    );
  }

  if (room.status === "lobby") {
    const seatsLeft = SEATS - Object.keys(players).length;

    return (
      <Shell subtitle={`${found.subunit.code} · ${found.course.name}`}>
        <div className="w-full max-w-md">
          <p className="eyebrow mb-5">Room open</p>

          <p className="font-mono text-[44px] leading-none tracking-[0.14em] text-accent tnum">
            {room.code}
          </p>
          <p className="mt-4 mb-9 text-[15px] text-muted">
            Share this code, or start now and bots take the empty seats.
          </p>

          <ul className="mb-8 flex flex-col border-t border-line-soft">
            {Array.from({ length: SEATS }).map((_, i) => {
              const entry = Object.entries(players)[i];
              return (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-line-soft py-3 text-[14px]"
                >
                  <span className={entry ? "text-ink" : "text-faint"}>
                    {entry ? entry[1].displayName : "Empty seat"}
                  </span>
                  <span className="font-mono text-[11px] text-faint">
                    {entry
                      ? entry[0] === room.hostUid
                        ? "Host"
                        : "Ready"
                      : "Waiting"}
                  </span>
                </li>
              );
            })}
          </ul>

          {isHost ? (
            <button
              type="button"
              onClick={start}
              className="w-full rounded-sm bg-accent px-4.5 py-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
            >
              {seatsLeft > 0
                ? `Start — ${seatsLeft} bot${seatsLeft === 1 ? "" : "s"} fill in`
                : "Start"}
            </button>
          ) : (
            <p className="font-mono text-[11px] text-faint">
              Waiting for the host to start
            </p>
          )}
        </div>
      </Shell>
    );
  }

  if (room.status === "finished") {
    const ranked = Object.entries(players).sort(
      (a, b) => Number(b[1].alive) - Number(a[1].alive) || b[1].score - a[1].score,
    );

    return (
      <Shell subtitle={`${found.subunit.code} · ${found.course.name}`}>
        <SessionResults
          headline={
            won
              ? "Last one standing."
              : me?.alive
                ? "Round over."
                : "You went out."
          }
          detail={`${found.subunit.name} · won by ${
            players[room.winnerUid ?? ""]?.displayName ?? "nobody"
          }`}
          correct={myAnswers.filter((a) => a.correct).length}
          total={myAnswers.length}
          xpEarned={
            myAnswers.reduce((s, a) => s + xpForAnswer(a), 0) + (won ? 50 : 0)
          }
          before={before}
          after={afterP}
          onAgain={() => {
            setRoomId(null);
            setRoom(null);
            savedRef.current = false;
            setMyPicks({});

            setBefore(null);
            setAfterP(null);
          }}
        />
        <ol className="mt-10 w-full max-w-md border-t border-line-soft">
          {ranked.map(([uid, p], i) => (
            <li
              key={uid}
              className="flex items-baseline gap-4 border-b border-line-soft py-3 text-[14px]"
            >
              <span className="font-mono text-[11px] text-faint tnum">{i + 1}</span>
              <span className={uid === user?.uid ? "flex-1 text-ink" : "flex-1 text-muted"}>
                {p.displayName}
                {p.isBot && <span className="ml-2 text-faint">bot</span>}
              </span>
              {!p.alive && <span className="eyebrow text-out/70">Out</span>}
              <span className="font-mono text-[12px] text-muted tnum">{p.correct}</span>
            </li>
          ))}
        </ol>
      </Shell>
    );
  }

  // ── Playing ────────────────────────────────────────────
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-5 px-6 text-[13px]">
        <span className="font-medium">Last One Standing</span>
        <span className="font-mono text-[11px] text-faint tnum">
          Question {index + 1} of {questions.length}
        </span>
        <span className="ml-auto flex items-center gap-5">
          <span
            className={`font-mono text-[13px] tnum ${
              msLeft <= 5000 && !revealed ? "animate-clock-urgent text-out" : "text-muted"
            }`}
          >
            0:{String(Math.ceil(msLeft / 1000)).padStart(2, "0")}
          </span>
          <Link href="/" className="text-faint transition-colors hover:text-ink">
            Leave
          </Link>
        </span>
      </header>

      <ClockRail fraction={revealed ? 0 : msLeft / totalMs} urgent={msLeft <= 5000} />

      <div className="flex flex-1 flex-col-reverse lg:flex-row">
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          {!me?.alive ? (
            <div className="animate-question-in max-w-md text-center">
              <p className="eyebrow mb-4 text-out">Eliminated</p>
              <h2 className="text-2xl font-medium tracking-[-0.025em]">
                You&apos;re out — watching the rest.
              </h2>
            </div>
          ) : (
            question && (
              <QuestionStage
                question={question}
                eyebrow={found.subunit.name}
                picked={picked}
                revealed={revealed}
                onPick={pick}
              />
            )
          )}
        </main>

        <aside className="shrink-0 border-line-soft px-6 py-8 lg:w-64 lg:border-l">
          <p className="eyebrow mb-3">In play · {alive.length}</p>
          <ul className="flex flex-col">
            {Object.entries(players).map(([uid, p]) => (
              <li
                key={uid}
                className={`-mx-2 flex items-baseline justify-between rounded-sm px-2 py-1.5 text-[13px] ${
                  p.alive ? "" : "text-faint line-through decoration-line"
                }`}
              >
                <span className={p.alive && uid === user?.uid ? "text-ink" : ""}>
                  {p.displayName}
                  {p.isBot && <span className="ml-2 text-faint">bot</span>}
                </span>
                <span className="font-mono text-[12px] tnum">{p.correct}</span>
              </li>
            ))}
          </ul>

          {picked !== null && !revealed && (
            <p className="mt-6 font-mono text-[11px] text-accent">Answer locked</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Shell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-5 px-6 text-[13px]">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.02em]">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          Roundhouse
        </Link>
        <span className="font-mono text-[11px] text-faint">{subtitle}</span>
        <Link href="/" className="ml-auto text-faint transition-colors hover:text-ink">
          Leave
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}

function Missing() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">
        That subunit isn&apos;t stocked yet.
      </h1>
      <Link
        href="/"
        className="rounded-sm bg-accent px-4.5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
      >
        Back to library
      </Link>
    </main>
  );
}
