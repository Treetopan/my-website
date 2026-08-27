"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { DIFFICULTY, canDuel, describe, type Question } from "@/lib/curriculum";
import {
  closeRoomCode,
  createRoom,
  deleteRoom,
  findRoomByCode,
  joinRoom,
  markCommitted,
  readAnswers,
  recordSession,
  startDuel,
  submitAnswer,
  updateRoom,
  watchAnswers,
  watchProgress,
  watchRoom,
  type DuelResult,
  type Room as RoomData,
  type RoomPlayer,
} from "@/lib/rtdb";
import { champion, pointsFor, settle } from "@/lib/duel";
import { seated } from "@/lib/table";
import { EMPTY_PROGRESS, xpForAnswer, type Progress } from "@/lib/progression";
import { ClockRail, QuestionStage } from "@/components/question-stage";
import { Wordmark } from "@/components/wordmark";
import { InviteFriends } from "@/components/friends";
import { RoomTable3D } from "@/components/room-table-3d";
import { SessionSummary } from "@/components/session-summary";
import { GradeError, gradeTable, openSession, type Seat } from "@/lib/grade";
import type { AnswerDetail } from "@/lib/review";
import { emptyResponse, type Response as Answered } from "@/lib/questions";

/**
 * The mirror duel.
 *
 * Two players, one question, both answering at the same time. Nothing about
 * anybody's answer is published until everybody has committed — which is not
 * politeness, it is the rule that keeps the game honest: on a proximity
 * question a score is a distance, so telling one player they scored 40% while
 * the other is still dragging would narrow the answer to a ring for them.
 * What *is* published while the question is live is that somebody has
 * finished, which is the whole tension and gives nothing away.
 *
 * The room plumbing is the one Last One Standing uses — a code, seats, bots
 * filling the empty ones, answers written to a write-once node outside the
 * room. What differs is the shape of a turn: there isn't one. Everybody
 * answers, the host settles the round in a single grading, and the rule in
 * `lib/duel.ts` decides what the round was worth.
 */

const SEATS = 2;

/** Questions in a duel. Short on purpose — it is a sprint, not a session. */
const ROUNDS = 8;

/** Long enough to read two scores and the gap between them. */
const REVEAL_MS = 2800;

const BOT_NAMES = ["Mara", "Dev", "Priya"];
const BOT_ACCURACY = 0.7;

/** When a bot locks in, as a fraction of the clock. Never at the very end. */
const BOT_COMMIT = [0.25, 0.8];

/** Firebase's clock, not the laptop's — every client must agree on the timer. */
function useServerOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    return onValue(ref(realtimeDb, ".info/serverTimeOffset"), (snap) => {
      setOffset(snap.val() ?? 0);
    });
  }, []);
  return offset;
}

export function Duel({
  subunitId,
  joinCode,
}: {
  subunitId: string;
  joinCode?: string;
}) {
  const found = describe(subunitId);
  const { user, username } = useAuth();
  const offset = useServerOffset();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [code, setCode] = useState(joinCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [before, setBefore] = useState<Progress | null>(null);
  const [after, setAfter] = useState<Progress | null>(null);

  const [now, setNow] = useState(() => Date.now());

  /** My own rounds, filled in from the settlement the host publishes. */
  const [myPicks, setMyPicks] = useState<
    Record<number, { result: DuelResult; question: Question; answer: AnswerDetail["reveal"]; speed: number }>
  >({});

  useEffect(() => {
    if (!user) return;
    return watchProgress(user.uid, setProgress);
  }, [user]);

  // The room is deleted as soon as it ends, so every client keeps its own
  // copy of the final state and renders the summary from that.
  const [finalRoom, setFinalRoom] = useState<RoomData | null>(null);

  useEffect(() => {
    if (!roomId) return;
    return watchRoom(roomId, (r) => {
      setRoom(r);
      if (r?.status === "finished") setFinalRoom((prev) => prev ?? r);
    });
  }, [roomId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const difficulty = found?.subunit.difficulty ?? "medium";
  const totalMs = DIFFICULTY[difficulty].seconds * 1000;

  const questions: Question[] = useMemo(
    () => room?.questions ?? [],
    [room?.questions],
  );

  const index = room?.currentIndex ?? 0;
  const question = questions[index];

  const startedAt =
    typeof room?.questionStartedAt === "number" ? room.questionStartedAt : null;
  const elapsed = startedAt ? now + offset - startedAt : 0;
  const msLeft = Math.max(0, totalMs - elapsed);

  const isHost = !!user && room?.hostUid === user.uid;
  const players = useMemo(() => room?.players ?? {}, [room?.players]);
  const order = seated(players);

  /**
   * The round showing now, once it has settled. Matched on the index rather
   * than taken as read, so the last round's result cannot flash up over the
   * next question while the two writes are in flight.
   */
  const settled = room?.duel && room.duel.index === index ? room.duel : null;

  const committed = useMemo(
    () => new Set(Object.keys(room?.committed ?? {})),
    [room?.committed],
  );

  const [entered, setEntered] = useState<{ id: string; response: Answered } | null>(
    null,
  );
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);

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

  const locked = !!question && submittedFor === question.id;

  /** How much clock was left when I committed, for the XP a duel still pays. */
  const speeds = useRef<Record<number, number>>({});

  const myAnswers: AnswerDetail[] = useMemo(
    () =>
      Object.entries(myPicks).map(([, pick]) => ({
        questionId: pick.question.id,
        topic: pick.question.topic,
        question: pick.question,
        reveal: pick.answer,
        response: pick.result.response,
        difficulty,
        correct: pick.result.correct,
        score: pick.result.score,
        speed: pick.speed,
      })),
    [myPicks, difficulty],
  );

  // ── Create / join ──────────────────────────────────────
  async function create() {
    if (!user || !found) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createRoom({
        hostUid: user.uid,
        displayName: username ?? user.displayName ?? "You",
        subunitId,
        seats: SEATS,
        game: "mirror",
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
      await joinRoom(hit.roomId, user.uid, username ?? user.displayName ?? "You");
      setRoomId(hit.roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join that room.");
    } finally {
      setBusy(false);
    }
  }

  /** An invitation arrives with the code in hand, so the seat is taken on
   *  arrival rather than after a press. The ref stops a failed join retrying
   *  on every render and a successful one racing a second seat write. */
  const invited = useRef(false);

  useEffect(() => {
    if (!joinCode || invited.current || !user || !username || roomId) return;
    invited.current = true;

    let live = true;
    (async () => {
      const hit = await findRoomByCode(joinCode);
      if (!live) return;
      if ("error" in hit) {
        setError(hit.error);
        return;
      }
      await joinRoom(hit.roomId, user.uid, username);
      if (live) setRoomId(hit.roomId);
    })().catch(() => {
      if (live) setError("Could not join that room.");
    });

    return () => {
      live = false;
    };
  }, [joinCode, user, username, roomId]);

  /** Fill the empty seat with a bot and start. Host only. */
  async function start() {
    if (!roomId || !room || !isHost) return;

    const filled: Record<string, RoomPlayer> = { ...room.players };
    let n = 0;
    while (Object.keys(filled).length < SEATS) {
      filled[`bot-${n + 1}`] = {
        displayName: BOT_NAMES[n % BOT_NAMES.length],
        isBot: true,
        alive: true,
        inRound: true,
        seat: 0,
        score: 0,
        correct: 0,
        joinedAt: Date.now(),
      };
      n++;
    }

    const uids = Object.keys(filled).sort((a, b) =>
      a === room.hostUid ? -1 : b === room.hostUid ? 1 : 0,
    );
    uids.forEach((uid, i) => {
      filled[uid] = { ...filled[uid], seat: i, alive: true, inRound: true };
    });

    // One question per round, and every round is graded once for everybody —
    // so the session is exactly as long as the duel. Placed answers only: the
    // duel is settled on which was closer, and the server holds that line
    // whatever this client asks for.
    let opened;
    try {
      opened = await openSession(subunitId, ROUNDS, { spatial: true });
    } catch (e) {
      setError(e instanceof GradeError ? e.message : "Could not start the duel.");
      return;
    }

    await startDuel(
      roomId,
      room.code,
      filled,
      opened.sessionId,
      opened.order,
      opened.questions,
    );
  }

  // ── Answering ──────────────────────────────────────────
  const commit = useCallback(
    async (response: Answered) => {
      if (!roomId || !user || !question || submittedFor === question.id) return;
      setSubmittedFor(question.id);
      setDraft(response);
      speeds.current[index] = Math.max(0, Math.min(1, msLeft / totalMs));
      // Write-once at the rules level. A rejected write means this client
      // already answered, which is not an error worth showing anybody.
      await submitAnswer(roomId, index, user.uid, response).catch(() => {});
    },
    [roomId, user, question, submittedFor, setDraft, index, msLeft, totalMs],
  );

  // Read through refs so that typing or dragging does not tear down the
  // deadline below on every keystroke.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  /**
   * Out of time commits whatever is on screen — for a dragged point or a moved
   * slider that is a real answer the player simply never confirmed. Every
   * client does this for itself, because in a duel nobody else can see your
   * draft: the host has no way to answer on your behalf, and should not.
   */
  useEffect(() => {
    if (!question || locked || settled || !startedAt || room?.status !== "playing") {
      return;
    }
    const remaining = startedAt + totalMs - (Date.now() + offset);
    const id = setTimeout(
      () => commitRef.current(draftRef.current),
      Math.max(0, remaining),
    );
    return () => clearTimeout(id);
  }, [question, locked, settled, startedAt, totalMs, offset, room?.status]);

  // ── Host: settle the round ─────────────────────────────
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  /** The last position this client has settled, so it cannot settle it twice. */
  const settledRef = useRef<number | null>(null);

  const resolve = useCallback(async () => {
    const current = roomRef.current;
    if (!roomId || !current || !current.sessionId) return;

    const at = current.currentIndex;
    const asked = current.questions[at];
    if (!asked || settledRef.current === at) return;
    settledRef.current = at;

    const table: Seat[] = Object.entries(playersRef.current).map(([uid, p]) =>
      p.isBot ? { uid, bot: BOT_ACCURACY } : { uid, response: undefined },
    );

    // Read the answers back out of the write-once node rather than trusting
    // anything held on this machine. A player who never committed is graded
    // on a blank, which is what a timeout is.
    const stored = await readAnswers(roomId, at);
    for (const seat of table) {
      if (seat.bot === undefined) {
        seat.response = stored[seat.uid]?.response ?? emptyResponse(asked.kind);
      }
    }

    let graded;
    try {
      graded = await gradeTable(current.sessionId, at, table);
    } catch {
      // Leave the round open rather than inventing an outcome. The clock will
      // come round again and this will retry.
      settledRef.current = null;
      return;
    }

    const { closestUid, gap } = settle(
      Object.entries(graded.results).map(([uid, r]) => ({ uid, score: r.score })),
    );

    const perQuestion = DIFFICULTY[difficulty].xp;
    const results: Record<string, DuelResult> = {};
    const next: Record<string, RoomPlayer> = { ...playersRef.current };

    for (const [uid, r] of Object.entries(graded.results)) {
      const took = uid === closestUid ? gap : 0;
      const points = pointsFor(r.score, took, perQuestion);
      results[uid] = {
        response: r.response,
        correct: r.correct,
        score: r.score,
        gap: took,
        points,
      };

      const player = next[uid];
      if (player) {
        next[uid] = {
          ...player,
          score: player.score + points,
          correct: player.correct + (r.correct ? 1 : 0),
        };
      }
    }

    // One write. Both halves of the round arrive together or not at all.
    await updateRoom(roomId, {
      players: next,
      duel: { index: at, answer: graded.reveal, results, closestUid },
      committed: null,
    });
  }, [roomId, difficulty]);

  const resolveRef = useRef(resolve);
  useEffect(() => {
    resolveRef.current = resolve;
  }, [resolve]);

  /**
   * Host: watch the answers land, publish who has locked in, and settle the
   * round the moment the last seat is in — or when the clock has run out and
   * the stragglers' own deadlines have had a moment to fire.
   *
   * Keyed on the position and the phase rather than on the room, because the
   * room changes every time somebody commits and a bot's think-time must not
   * be re-rolled each time that happens.
   */
  const phase = settled ? "revealing" : "answering";

  useEffect(() => {
    if (!isHost || !roomId || room?.status !== "playing" || phase !== "answering") {
      return;
    }

    settledRef.current = null;

    const humans = new Set<string>();
    const bots = new Set<string>();
    const seats = Object.keys(playersRef.current).length;

    const publish = () => {
      const all = [...humans, ...bots];
      markCommitted(roomId, all).catch(() => {});
      if (all.length >= seats) resolveRef.current();
    };

    // A bot commits somewhere in the middle of the clock. It has no answer to
    // store — the server rolls one at grading time, because choosing a
    // plausible near miss means knowing the right answer.
    const span = BOT_COMMIT[1] - BOT_COMMIT[0];
    const timers = Object.entries(playersRef.current)
      .filter(([, p]) => p.isBot)
      .map(([uid]) =>
        setTimeout(
          () => {
            bots.add(uid);
            publish();
          },
          totalMs * (BOT_COMMIT[0] + Math.random() * span),
        ),
      );

    const stop = watchAnswers(roomId, index, (answers) => {
      for (const uid of Object.keys(answers)) humans.add(uid);
      publish();
    });

    // The grace is for the other clients' own deadlines: they commit their
    // drafts on the same clock, and their writes need a moment to land.
    const deadline = startedAt ? startedAt + totalMs : null;
    const remaining = deadline
      ? Math.max(0, deadline - (Date.now() + offset))
      : totalMs;

    // Once the clock is out, keep trying until it lands. A settling that fails
    // — a dropped request, a slow reply — would otherwise leave the duel
    // stopped for good on a question both players have already answered, with
    // nothing left to retrigger it. Settling twice is harmless: the position
    // can only be claimed once, so the second attempt is refused by the server
    // rather than paying anybody twice.
    let again: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      resolveRef.current();
      again = setInterval(() => resolveRef.current(), 2000);
    }, remaining + 600);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(timeout);
      if (again) clearInterval(again);
      stop();
    };
  }, [isHost, roomId, index, phase, room?.status, startedAt, totalMs, offset]);

  // ── Host: on to the next question, or the end ──────────
  useEffect(() => {
    if (!isHost || !roomId || !room || room.status !== "playing" || !settled) {
      return;
    }

    const id = setTimeout(async () => {
      const at = settled.index + 1;

      if (at >= room.questions.length) {
        await updateRoom(roomId, {
          status: "finished",
          winnerUid: champion(room.players),
          duel: null,
          committed: null,
        });
        await closeRoomCode(roomId, room.code);
        return;
      }

      await updateRoom(roomId, {
        currentIndex: at,
        duel: null,
        committed: null,
        questionStartedAt: { ".sv": "timestamp" } as unknown as number,
      });
    }, REVEAL_MS);

    return () => clearTimeout(id);
  }, [isHost, roomId, room, settled]);

  // ── Keep my own copy of each round ─────────────────────
  useEffect(() => {
    if (!settled || !user || !question) return;
    const mine = settled.results[user.uid];
    if (!mine) return;

    setMyPicks((prev) =>
      settled.index in prev
        ? prev
        : {
            ...prev,
            [settled.index]: {
              result: mine,
              question,
              answer: settled.answer,
              speed: speeds.current[settled.index] ?? 0,
            },
          },
    );
  }, [settled, user, question]);

  // ── Bank the session ───────────────────────────────────
  const won = !!user && (finalRoom ?? room)?.winnerUid === user.uid;
  const savedRef = useRef(false);

  useEffect(() => {
    if (room?.status !== "finished" || savedRef.current || !user || !found) return;
    savedRef.current = true;

    const xp = myAnswers.reduce((s, a) => s + xpForAnswer(a), 0) + (won ? 50 : 0);
    const snapshot = progress;

    recordSession(user.uid, {
      game: "mirror",
      subunitId,
      correct: myAnswers.filter((a) => a.correct).length,
      total: myAnswers.length,
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
  }, [room?.status, user, found, myAnswers, won, progress, subunitId]);

  // Host: bin the room once it is over, leaving the other client a moment to
  // take its snapshot first.
  useEffect(() => {
    if (!isHost || !roomId || !finalRoom) return;
    const id = setTimeout(() => {
      deleteRoom(roomId, finalRoom.code).catch(() => {});
    }, 3000);
    return () => clearTimeout(id);
  }, [isHost, roomId, finalRoom]);

  if (!found) return <Missing />;

  // Checked here as well as in the library, because a link is a way in too.
  // The server refuses to open the session either way; this is so that being
  // refused reads as an explanation rather than as a failure.
  if (!canDuel(found.subunit)) return <NotForDuelling name={found.subunit.name} />;

  const subtitle = `${found.subunit.code} · ${found.course.name}`;

  // ── Finished ───────────────────────────────────────────
  if (finalRoom) {
    const winner = finalRoom.winnerUid
      ? finalRoom.players[finalRoom.winnerUid]?.displayName
      : null;
    const mine = user ? finalRoom.players[user.uid]?.score ?? 0 : 0;
    const theirs = Object.entries(finalRoom.players)
      .filter(([uid]) => uid !== user?.uid)
      .map(([, p]) => p.score);

    return (
      <Shell subtitle={subtitle}>
        <SessionSummary
          headline={
            !winner ? "Dead level." : won ? "You were closer." : `${winner} was closer.`
          }
          detail={`${found.subunit.name} · ${mine} to ${theirs.join(" and ")}`}
          details={myAnswers}
          xpEarned={
            myAnswers.reduce((s, a) => s + xpForAnswer(a), 0) + (won ? 50 : 0)
          }
          before={before}
          after={after}
          onAgain={() => {
            setRoomId(null);
            setRoom(null);
            setFinalRoom(null);
            setMyPicks({});
            speeds.current = {};
            savedRef.current = false;
            setBefore(null);
            setAfter(null);
          }}
        />
      </Shell>
    );
  }

  // ── Entry ──────────────────────────────────────────────
  if (!roomId || !room) {
    return (
      <Shell subtitle={subtitle}>
        <div className="w-full max-w-md">
          <p className="eyebrow mb-5">Mirror Duel</p>
          <h1 className="text-[34px] font-semibold tracking-[-0.035em]">
            Same question. Both of you. At once.
          </h1>
          <p className="mt-3 mb-8 text-[15px] text-muted">
            Neither of you sees anything until you have both committed. You score
            what your answer was worth — and the closer answer also takes the gap
            between the two.
          </p>

          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="w-full rounded-lg bg-accent px-4.5 py-3 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
          >
            {busy ? "Working…" : "Open a duel"}
          </button>

          <div className="my-7 flex items-center gap-4">
            <span className="h-px flex-1 bg-line" />
            <span className="eyebrow">or join one</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="flex gap-2.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={6}
              className="box flex-1 px-3.5 py-2.5 font-mono text-[14px] tracking-[0.18em] text-ink uppercase placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={join}
              disabled={busy || code.length < 4}
              className="box box-tap px-5 text-[14px] font-medium text-muted disabled:opacity-40"
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

  // ── Lobby ──────────────────────────────────────────────
  if (room.status === "lobby") {
    const seatsLeft = SEATS - Object.keys(players).length;

    return (
      <Shell subtitle={subtitle}>
        <div className="w-full max-w-md">
          <p className="eyebrow mb-4">Duel open</p>
          <p className="font-mono text-[44px] leading-none tracking-[0.14em] text-accent tnum">
            {room.code}
          </p>
          <p className="mt-4 mb-8 text-[15px] text-muted">
            Share this code, or start now and a bot takes the other seat.
          </p>

          <div className="mb-8 h-64 overflow-hidden rounded-[10px] border border-line">
            <RoomTable3D
              seats={Array.from({ length: SEATS }, (_, i) => {
                const entry = Object.entries(players)[i];
                if (!entry) {
                  return {
                    uid: `empty-${i}`,
                    displayName: "Empty seat",
                    isBot: false,
                    alive: true,
                    inRound: false,
                    correct: 0,
                    empty: true,
                    status: "a bot fills in",
                  };
                }
                const [uid, p] = entry;
                return {
                  uid,
                  displayName: p.displayName,
                  isBot: p.isBot,
                  alive: true,
                  inRound: true,
                  correct: 0,
                  status: uid === room.hostUid ? "host" : "ready",
                };
              })}
              turnUid={null}
              meUid={user?.uid ?? null}
              revealing={false}
            />
          </div>

          {isHost ? (
            <button
              type="button"
              onClick={start}
              className="w-full rounded-lg bg-accent px-4.5 py-3 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
            >
              {seatsLeft > 0 ? "Start — a bot takes the other seat" : "Start"}
            </button>
          ) : (
            <p className="font-mono text-[11px] text-faint">
              Waiting for the host to start
            </p>
          )}

          <InviteFriends
            roomId={roomId}
            code={room.code}
            subunitId={subunitId}
            game="mirror"
          />
        </div>
      </Shell>
    );
  }

  // ── Playing ────────────────────────────────────────────
  const mine = user && settled ? settled.results[user.uid] : null;
  const waiting = locked && !settled;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-5 px-6 text-[13px]">
        <Wordmark />
        <span className="font-medium">Mirror Duel</span>
        <span className="font-mono text-[11px] text-faint tnum">
          {Math.min(index + 1, ROUNDS)} of {room.questions.length}
        </span>

        <span className="ml-auto flex items-center gap-5">
          <span
            className={`font-mono text-[13px] tnum ${
              msLeft <= 5000 && !locked && !settled
                ? "animate-clock-urgent text-out"
                : "text-muted"
            }`}
          >
            {settled ? "—" : `0:${String(Math.ceil(msLeft / 1000)).padStart(2, "0")}`}
          </span>
          <Link href="/" className="text-faint transition-colors hover:text-ink">
            Leave
          </Link>
        </span>
      </header>

      <ClockRail
        fraction={settled ? 0 : msLeft / totalMs}
        urgent={msLeft <= 5000 && !locked}
      />

      <div className="flex flex-1 flex-col-reverse lg:flex-row">
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          {question && (
            <div className="w-full max-w-3xl">
              <p
                className={`mb-4 text-[14px] ${
                  waiting ? "text-accent" : "text-muted"
                }`}
              >
                {settled
                  ? "Both in."
                  : waiting
                    ? `Locked in — waiting for ${
                        order.find(([uid]) => uid !== user?.uid)?.[1].displayName ??
                        "the other player"
                      }`
                    : "You are both answering this one."}
              </p>

              <QuestionStage
                question={question}
                eyebrow={found.subunit.name}
                draft={mine ? mine.response : draft}
                reveal={settled ? settled.answer : null}
                score={mine ? mine.score : null}
                disabled={locked || !!settled}
                onDraft={setDraft}
                onSubmit={commit}
              />

              {settled && (
                <Settlement
                  settled={settled}
                  players={players}
                  meUid={user?.uid ?? null}
                />
              )}
            </div>
          )}
        </main>

        {/* ── The two of you ─────────────────────────────── */}
        <aside className="shrink-0 border-line-soft px-6 py-8 lg:w-80 lg:border-l">
          <p className="eyebrow mb-3">The duel</p>

          <div className="h-56 overflow-hidden rounded-[10px] border border-line lg:h-72">
            <RoomTable3D
              seats={order.map(([uid, p]) => ({
                uid,
                displayName: p.displayName,
                isBot: p.isBot,
                alive: true,
                // Standing while still thinking, sat down once locked in.
                // Nobody is ever out of a duel, so the posture is free to
                // mean something else here.
                inRound: !settled && !committed.has(uid),
                correct: p.correct,
                status: settled
                  ? settled.results[uid]
                    ? `+${settled.results[uid].points}`
                    : "—"
                  : committed.has(uid)
                    ? "locked in"
                    : "thinking…",
              }))}
              // At the reveal the accent marks whoever took the gap. While the
              // question is live it marks nobody: there is no turn to have.
              turnUid={settled?.closestUid ?? null}
              meUid={user?.uid ?? null}
              revealing={false}
            />
          </div>

          <ul className="mt-5 flex flex-col gap-2">
            {order.map(([uid, p]) => (
              <li
                key={uid}
                className="flex items-baseline justify-between text-[13px]"
              >
                <span className={uid === user?.uid ? "text-ink" : "text-muted"}>
                  {uid === user?.uid ? "You" : p.displayName}
                </span>
                <span className="font-mono text-ink tnum">{p.score}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[12px] leading-relaxed text-faint">
            You score what your answer was worth. The closer answer also takes
            the gap between the two.
          </p>
        </aside>
      </div>
    </div>
  );
}

/**
 * What the round was worth, said as the arithmetic rather than as a verdict.
 *
 * Both scores on the same scale, and the gap drawn as the thing one of them
 * took off the other — because "you were closer" is a fact about the pair of
 * answers, and a single number cannot say it.
 */
function Settlement({
  settled,
  players,
  meUid,
}: {
  settled: NonNullable<RoomData["duel"]>;
  players: Record<string, RoomPlayer>;
  meUid: string | null;
}) {
  const rows = seated(players).map(([uid, p]) => ({
    uid,
    name: uid === meUid ? "You" : p.displayName,
    result: settled.results[uid],
  }));

  const closest = settled.closestUid;
  const gap = closest ? settled.results[closest]?.gap ?? 0 : 0;

  return (
    <div className="animate-question-in mt-8 border-t border-line-soft pt-6">
      <ul className="flex flex-col gap-3">
        {rows.map((row) => {
          const took = row.uid === closest;
          return (
            <li key={row.uid} className="flex items-center gap-4 text-[14px]">
              <span
                className={`w-24 shrink-0 ${took ? "text-accent" : "text-muted"}`}
              >
                {row.name}
              </span>

              {/* The score as a bar, so two answers are compared by looking
                  rather than by subtracting. */}
              <span className="relative h-1.5 flex-1 rounded-full bg-line-soft">
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    took ? "bg-accent" : "bg-faint"
                  }`}
                  style={{
                    width: `${Math.round((row.result?.score ?? 0) * 100)}%`,
                  }}
                />
              </span>

              <span className="w-12 shrink-0 text-right font-mono text-[13px] text-ink tnum">
                {(row.result?.score ?? 0).toFixed(2)}
              </span>
              <span
                className={`w-12 shrink-0 text-right font-mono text-[13px] tnum ${
                  took ? "text-accent" : "text-faint"
                }`}
              >
                +{row.result?.points ?? 0}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-[13px] text-muted">
        {closest === null
          ? gapless(rows)
          : `${rows.find((r) => r.uid === closest)?.name ?? "Someone"} took the gap — ${gap.toFixed(2)}.`}
      </p>
    </div>
  );
}

/** Why nobody took a gap: a dead heat, or a round nobody answered. */
function gapless(rows: { result?: DuelResult }[]): string {
  const best = Math.max(0, ...rows.map((r) => r.result?.score ?? 0));
  return best <= 0
    ? "Neither of you was close. No gap to take."
    : "Dead heat — nobody takes a gap.";
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
        <Wordmark />
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

/**
 * A subunit that can be played but not duelled. Says which of the two it is,
 * because "not available" would look like the same missing content as a
 * subunit nobody has written questions for.
 */
function NotForDuelling({ name }: { name: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="max-w-lg text-2xl font-semibold tracking-[-0.03em]">
        {name} can&apos;t be duelled.
      </h1>
      <p className="max-w-md text-[15px] text-muted">
        A duel is won by whichever answer was closer, so it needs questions
        answered on a grid or a scale. Everything here is typed or chosen — two
        right answers would be equally right, and every round a dead heat.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4.5 py-2.5 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
      >
        Pick another subunit
      </Link>
    </main>
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
        className="rounded-lg bg-accent px-4.5 py-2.5 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-hi"
      >
        Back to library
      </Link>
    </main>
  );
}
