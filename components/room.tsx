"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  DIFFICULTY,
  describeAll,
  difficultyOfQuestion,
  selectionLabel,
  selectionNames,
  subunitOfQuestion,
  type Question,
} from "@/lib/curriculum";
import {
  closeRoomCode,
  createRoom,
  deleteRoom,
  findRoomByCode,
  joinRoom,
  nominateTarget,
  recordSession,
  startRoom,
  submitAnswer,
  updateRoom,
  watchAnswers,
  watchProgress,
  watchRoom,
  type Room as RoomData,
  type RoomPlayer,
} from "@/lib/rtdb";
import {
  EMPTY_PROGRESS,
  applySession,
  xpForAnswer,
  type Progress,
} from "@/lib/progression";
import {
  alive as aliveSeats,
  answering,
  firstSeat,
  nextTurn,
  seated,
} from "@/lib/table";
import { ClockRail, QuestionStage } from "@/components/question-stage";
import { Wordmark } from "@/components/wordmark";
import { InviteFriends } from "@/components/friends";
import { RoomTable3D } from "@/components/room-table-3d";
import { RoomCode } from "@/components/room-code";
import { SessionSummary } from "@/components/session-summary";
import { GradeError, grade, gradeBot, openSession } from "@/lib/grade";
import { ranOut, type AnswerDetail } from "@/lib/review";
import {
  emptyResponse,
  type Response as Answered,
  type Reveal,
} from "@/lib/questions";

const SEATS = 3;
const REVEAL_MS = 1900;
const BOT_NAMES = ["Mara", "Dev", "Priya"];
const BOT_THINK = [1200, 2600];
const BOT_CHOOSE_MS = 1600;

/**
 * The clock on a turn.
 *
 * Half a minute to start with, and two seconds less every time the table has
 * been all the way round — so the game tightens as it goes rather than being
 * fast from the first question, and the pressure arrives once everybody knows
 * what they are doing. The floor is there because a question still has to be
 * read: past a certain point a shorter clock stops testing the maths and
 * starts testing how quickly somebody can find the answer box.
 *
 * It is the table's clock rather than the question's. A room mixes subunits,
 * so timing each turn by the difficulty of the question it happened to deal
 * would hand one player forty seconds and the next fifteen, at the same table,
 * for the same round.
 */
const TURN_MS = 30_000;
const TURN_STEP_MS = 2_000;
const TURN_FLOOR_MS = 10_000;

/**
 * How long past the deadline the host waits before grading a turn itself.
 *
 * An answer pressed on the last second still has to reach the database and
 * come back out to the host, and a host that grades the instant the clock hits
 * zero records that turn as unanswered — which is how somebody who answered
 * correctly is told they ran out of time. Long enough for the round trip,
 * short enough that a table which really has stalled is not left waiting on it.
 */
const TURN_GRACE_MS = 900;

/**
 * How many turns a person gets before a round turns on somebody, and how far
 * that wanders either side.
 */
const ROUND_TURNS = 5;
const ROUND_SPREAD = 2;

/**
 * Which turn each bot goes out on, for one round.
 *
 * A bot used to roll its accuracy on every question, which meant a round could
 * turn on the first one: two unlucky rolls and the table had emptied before
 * anybody had answered twice. So the round is planned instead. One bot misses
 * on the turn that ends it — five of its own turns, give or take two, so no
 * two games run to the same length — and any bot going out before it does so
 * on a turn of its own rather than alongside it. Up to that turn a bot is not
 * rolling anything: it answers correctly, and being the one still standing is
 * something you have to earn rather than wait for.
 */
function missTurns(bots: number): number[] {
  const last =
    ROUND_TURNS - ROUND_SPREAD + Math.floor(Math.random() * (2 * ROUND_SPREAD + 1));

  // Every turn before the last one, in a random order, so the bots that go out
  // early are spread through the round rather than stacked at the front of it.
  const before = Array.from({ length: Math.max(1, last - 1) }, (_, i) => i + 1)
    .map((turn) => ({ turn, at: Math.random() }))
    .sort((a, b) => a.at - b.at)
    .map(({ turn }) => turn);

  const turns = [last, ...before.slice(0, Math.max(0, bots - 1))];

  // Shuffled again on the way out: which bot draws the long straw is not the
  // seat it happens to sit in.
  return turns.map((turn) => ({ turn, at: Math.random() }))
    .sort((a, b) => a.at - b.at)
    .map(({ turn }) => turn);
}

/**
 * How the game ended for you, in a line.
 *
 * "You were removed." is what happens to everybody who does not win it, so on
 * its own it names the last move of the game rather than the reason it went
 * that way. What put you in front of a round winner is your own last turn, so
 * that is what this reads — and a turn nobody answered is a different thing
 * from a turn answered wrongly. Being told you ran out of time is the one that
 * matters most, because a player who pressed an answer and lost the round
 * anyway has every reason to think the game lost it for them.
 */
function endingFor(won: boolean, last: AnswerDetail | undefined): string {
  if (won) return "Last one standing.";
  if (!last) return "You were removed.";
  if (ranOut(last)) return "You ran out of time.";
  if (!last.correct) return "You missed your last question.";
  return "You were removed.";
}

/**
 * Firebase's clock, not the laptop's — every client must agree on the timer.
 *
 * `ready` is as much of the answer as the number is. The offset starts at zero
 * and is filled in a round trip later, so anything drawn or scheduled before it
 * lands is running on the laptop's clock: a machine a few seconds fast opened a
 * thirty-second turn at 0:26 and then corrected itself once this arrived.
 * Callers hold the full clock until it is true rather than showing a countdown
 * they are about to take back.
 */
function useServerOffset() {
  const [clock, setClock] = useState({ offset: 0, ready: false });
  useEffect(() => {
    return onValue(ref(realtimeDb, ".info/serverTimeOffset"), (snap) => {
      setClock({ offset: snap.val() ?? 0, ready: true });
    });
  }, []);
  return clock;
}

export function Room({
  subunitIds,
  joinCode,
}: {
  subunitIds: string[];
  /** A code arrived at from a friend's invitation rather than typed in. */
  joinCode?: string;
}) {
  const found = useMemo(() => describeAll(subunitIds), [subunitIds]);
  const { user, username } = useAuth();
  const { offset, ready: clockReady } = useServerOffset();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [code, setCode] = useState(joinCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [before, setBefore] = useState<Progress | null>(null);
  const [afterP, setAfterP] = useState<Progress | null>(null);

  /**
   * My own turns, keyed by question index. The answer is filled in from the
   * reveal the host publishes — this client never had it to begin with.
   */
  const [myPicks, setMyPicks] = useState<
    Record<
      number,
      {
        response: Answered;
        answer: Reveal;
        correct: boolean;
        score: number;
        steps?: string[];
      }
    >
  >({});
  const [now, setNow] = useState(() => Date.now());

  /** The seat a removal button is pointing at, so the table can mark it. */
  const [marked, setMarked] = useState<string | null>(null);

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

      // A turn the clock ran out on never produced a click, so capture it
      // here or it would vanish from the summary entirely. -1 means no answer.
      if (r?.reveal && r.reveal.uid === user?.uid) {
        const at = r.currentIndex;
        const entry = {
          response: r.reveal.response,
          answer: r.reveal.answer,
          correct: r.reveal.correct,
          score: r.reveal.score,
          steps: r.reveal.steps ?? undefined,
        };
        setMyPicks((prev) => (at in prev ? prev : { ...prev, [at]: entry }));
      }
    });
  }, [roomId, user?.uid]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // Both come from the room, which got them from the server at kick-off. The
  // questions travel rather than being looked up locally, because a generated
  // subunit mints fresh ones per session and no client has them otherwise.
  // Only the answers were ever withheld, and they still are.
  // The snapshot is the fallback because the host deletes the room the moment
  // the game is over, and everything the summary says about the session is
  // read back through this list. Without it the room disappearing turned a
  // finished game into "No questions answered" a second or two after it ended.
  const questions: Question[] = useMemo(
    () => room?.questions ?? finalRoom?.questions ?? [],
    [room?.questions, finalRoom?.questions],
  );

  const index = room?.currentIndex ?? 0;
  const question = questions[index];

  // The clock the whole table is playing to, written by the host and read by
  // everyone, so no two people are counting down to a different moment. An
  // older room that never had one still gets a full turn.
  const totalMs = room?.turnMs ?? TURN_MS;

  const startedAt =
    typeof room?.questionStartedAt === "number" ? room.questionStartedAt : null;
  const reveal = room?.reveal ?? null;
  const elapsed = startedAt ? now + offset - startedAt : 0;
  // Held at the full clock until the server offset has landed. Counting down
  // against an unresolved offset is counting down against this laptop's clock,
  // and a clock running fast takes the difference off the first turn of the
  // game — the one turn where the player has no earlier number to compare to.
  const msLeft = clockReady ? Math.max(0, totalMs - elapsed) : totalMs;

  const isHost = !!user && room?.hostUid === user.uid;
  const players = useMemo(() => room?.players ?? {}, [room?.players]);
  const order = seated(players);
  const aliveCount = order.filter(([, p]) => p.alive).length;
  const me = user ? players[user.uid] : undefined;
  const myTurn = !!user && room?.turnUid === user.uid && !reveal;
  // What I have entered on the live question, before the host has graded it.
  // Both of these are stamped with the question they belong to rather than
  // being cleared when the turn moves on: a plain boolean stayed true after
  // the first answer and locked every turn after it, and a draft that was
  // never re-kinded left non-choice questions with nothing to answer with.
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

  // Locked once submitted: the answer is write-once at the rules level, so
  // letting the input keep moving would only promise something it cannot keep.
  const answered =
    myPicks[index] !== undefined || (!!question && submittedFor === question.id);

  const myAnswers: AnswerDetail[] = useMemo(() => {
    if (!questions.length) return [];

    return Object.entries(myPicks).map(([i, entry]) => {
      const q = questions[Number(i) % questions.length];
      return {
        questionId: q.id,
        topic: q.topic,
        question: q,
        reveal: entry.answer,
        response: entry.response,
        difficulty: difficultyOfQuestion(q.id),
        correct: entry.correct,
        score: entry.score,
        steps: entry.steps,
        // Last One Standing pays no speed bonus — survival is the mechanic.
        speed: 0,
      };
    });
  }, [myPicks, questions]);

  // ── Create / join ──────────────────────────────────────
  async function create() {
    if (!user || !found) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createRoom({
        hostUid: user.uid,
        displayName: username ?? user.displayName ?? "You",
        subunitIds,
        seats: SEATS,
        game: "last-one-standing",
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

  /**
   * An invitation arrives with the code already in hand, so the seat is taken
   * on arrival rather than after a press. It is still exactly the same join —
   * write your own seat, and the room becomes readable to you — because an
   * invitation is a shortcut through the typing, not a second way into a room.
   *
   * The ref is the guard rather than state: a failed join must not be retried
   * on every render, and a successful one must not race a second seat write.
   */
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

  /** Fill empty seats with bots, assign turn order, and start. Host only. */
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

    // Seat order is join order, with the host first.
    const uids = Object.keys(filled).sort((a, b) =>
      a === room.hostUid ? -1 : b === room.hostUid ? 1 : 0,
    );
    uids.forEach((uid, i) => {
      filled[uid] = { ...filled[uid], seat: i, alive: true, inRound: true };
    });

    // The room carries a server grading session; the host grades every turn
    // through it, so no client ever holds the answer key.
    // A turn-based game burns a question per turn, so ask for more than the
    // bank holds — the server reshuffles to fill the order. Enough for the
    // longest game the table can produce: three seats going round for as many
    // turns as the bots can hold out, twice over, and a question in hand for
    // every one of them.
    let opened;
    try {
      opened = await openSession(subunitIds, 60);
    } catch (e) {
      setError(
        e instanceof GradeError ? e.message : "Could not start the game.",
      );
      return;
    }

    await startRoom(
      roomId,
      room.code,
      filled,
      uids[0],
      opened.sessionId,
      opened.order,
      opened.questions,
      TURN_MS,
    );
  }

  /**
   * The host's copy of when each bot is going out, rebuilt for every round.
   *
   * A ref rather than room state: the host is the only thing that grades a
   * turn, so this never has to travel, and putting it in the room would put
   * the whole plan in front of every player that can read it.
   */
  const botPlan = useRef<{
    round: number;
    missAt: Record<string, number>;
    taken: Record<string, number>;
  }>({ round: 0, missAt: {}, taken: {} });

  /**
   * A position the server has already graded for us.
   *
   * Two things race to resolve one turn — the listener that fires when the
   * player writes their answer, and the clock that fires when their time runs
   * out — and the server settles it: whichever arrives second is refused. This
   * remembers that refusal, so the clock coming round again does not spend
   * another request asking a question that can only be answered once.
   */
  const spentRef = useRef<number | null>(null);

  // ── Host: resolve a turn, then move around the table ───
  async function resolveTurn(response: Answered) {
    if (!roomId || !room || !question || !room.turnUid || !room.sessionId) return;

    // Nothing here can produce a verdict for a turn already graded, so asking
    // again only spends a request to be told so.
    if (spentRef.current === index) return;

    const turnUid = room.turnUid;
    const player = room.players[turnUid];
    if (!player) return;

    // A bot turn is rolled by the server, because picking a plausible wrong
    // option means knowing the right one — which this client does not. What
    // the server is told is the plan for the round rather than a probability:
    // right until the turn this bot is down to miss on, and wrong on it.
    const plan = botPlan.current;
    if (player.isBot && plan.round !== room.round) {
      const bots = Object.entries(room.players)
        .filter(([, p]) => p.isBot && p.alive)
        .map(([uid]) => uid);
      const turns = missTurns(bots.length);
      plan.round = room.round;
      plan.missAt = Object.fromEntries(bots.map((uid, i) => [uid, turns[i]]));
      plan.taken = {};
    }

    // Which of its own turns in this round the bot is on, and so whether this
    // is the one it goes out on. Worked out for a person too and never read —
    // a person's turn is graded on what they actually answered.
    const botTurn = (plan.taken[turnUid] ?? 0) + 1;
    const accuracy = botTurn >= (plan.missAt[turnUid] ?? ROUND_TURNS) ? 0 : 1;

    let verdict;
    try {
      verdict = player.isBot
        ? await gradeBot(room.sessionId, index, accuracy)
        : await grade(room.sessionId, index, response);
    } catch (e) {
      // Already answered — the other of the two racers won the claim, wrote
      // the reveal and moved the table on. Ordinary, and nothing to add.
      if (e instanceof GradeError && e.alreadyAnswered) {
        spentRef.current = index;
        return;
      }

      // Anything else left the position unclaimed. Leave the turn open rather
      // than guessing an outcome; the clock will come round again.
      return;
    }

    // Counted only once the turn actually resolved, so a grading that failed
    // and came round again does not use up the bot's luck on the way past.
    if (player.isBot) plan.taken[turnUid] = botTurn;

    const { correct, score } = verdict;

    // Show everyone what happened before the table moves on.
    await updateRoom(roomId, {
      reveal: {
        uid: turnUid,
        response: verdict.response,
        correct,
        score,
        answer: verdict.reveal,
        // Written only on a miss, and read by the player it belongs to: the
        // rest of the table never saw the question, and being told why an
        // answer they never worked on was wrong teaches nobody anything.
        steps: verdict.steps ?? null,
      },
      players: {
        ...room.players,
        [turnUid]: {
          ...player,
          // Survival is all-or-nothing even where the score is not: a table
          // cannot half-eliminate anybody. Part marks still pay, so a nearly
          // right answer is worth more than a wrong one on the scoreboard
          // even when both keep you standing.
          inRound: correct,
          correct: player.correct + (correct ? 1 : 0),
          score:
            player.score +
            Math.round(DIFFICULTY[difficultyOfQuestion(question.id)].xp * score),
        },
      },
    });
  }

  // Held in a ref so the answer listener and the timeout below always call the
  // latest version, without either of them re-subscribing on every render.
  const resolveRef = useRef(resolveTurn);
  useEffect(() => {
    resolveRef.current = resolveTurn;
  });

  // Read through a ref so that typing or dragging does not tear down the
  // answer listener and the clock on every change.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  /**
   * The answer this player has actually pressed on the question showing.
   *
   * Written straight into the ref rather than read back off `draftRef`, which
   * an effect fills in a render later: a turn whose clock ran out in the gap
   * between the press and the next paint was graded on the draft as it stood
   * *before* the press — no answer at all, on a question just answered.
   */
  const committedRef = useRef<{ id: string; response: Answered } | null>(null);

  // Watch for the current player's answer; resolve the moment it lands.
  useEffect(() => {
    if (!isHost || !roomId || !room || room.status !== "playing") return;
    if (room.reveal || !room.turnUid || !question) return;

    const turnUid = room.turnUid;
    const player = room.players[turnUid];
    if (!player) return;

    // A bot thinks for a beat, then commits.
    if (player.isBot) {
      const think =
        BOT_THINK[0] + Math.random() * (BOT_THINK[1] - BOT_THINK[0]);

      // The server rolls the outcome and picks the option, since choosing a
      // plausible wrong answer means knowing the right one.
      const id = setTimeout(
        () => resolveRef.current(emptyResponse(question.kind)),
        think,
      );

      return () => clearTimeout(id);
    }

    // A person gets the clock, and resolves early if they commit.
    const stop = watchAnswers(roomId, index, (answers) => {
      const entry = answers[turnUid];
      if (entry) resolveRef.current(entry.response);
    });

    const deadline = startedAt ? startedAt + totalMs : null;
    const remaining = deadline ? Math.max(0, deadline - (Date.now() + offset)) : totalMs;
    // Out of time grades whatever is on screen, which for a dragged point or
    // a moved slider is a real answer the player simply never confirmed. An
    // answer this client did press takes precedence over that: the press is
    // what happened, whether or not the write had come back by the deadline.
    //
    // Not scheduled at all until the server offset has landed, for the same
    // reason the displayed number waits for it: `remaining` would be measured
    // from this laptop's clock, and a host running fast grades the turn as
    // unanswered while the player still has seconds on their screen. An answer
    // that is committed still resolves the turn immediately — that path is the
    // watcher above, and it does not go through the deadline at all.
    const timeout = clockReady
      ? setTimeout(() => {
          const own = committedRef.current;
          resolveRef.current(
            own && own.id === question.id ? own.response : draftRef.current,
          );
        }, remaining + TURN_GRACE_MS)
      : null;

    return () => {
      stop();
      if (timeout) clearTimeout(timeout);
    };
  }, [isHost, roomId, room, question, index, startedAt, totalMs, offset, clockReady]);

  // After the reveal, advance the table — or end the round.
  useEffect(() => {
    if (!isHost || !roomId || !room || room.status !== "playing" || !room.reveal)
      return;

    const id = setTimeout(async () => {
      const still = answering(room.players);

      // One player left answering: they won the round and now remove someone.
      if (still.length <= 1) {
        const winner = still[0]?.[0] ?? room.reveal?.uid ?? null;
        await updateRoom(roomId, {
          status: "choosing",
          chooserUid: winner,
          turnUid: null,
          reveal: null,
        });
        return;
      }

      const next = nextTurn(room.players, room.reveal!.uid);

      // Everybody has gone once the turn wraps back to a seat at or below
      // the one that just answered, and a full lap of the table costs two
      // seconds off every turn from there on. Read off the seats rather than
      // counted, because the table shrinks as people sit down: a lap is
      // however many of them are still answering.
      const seatOf = (uid: string | null) =>
        uid ? (room.players[uid]?.seat ?? 0) : 0;
      const lapped = next !== null && seatOf(next) <= seatOf(room.reveal!.uid);
      const clock = room.turnMs ?? TURN_MS;

      await updateRoom(roomId, {
        turnUid: next,
        turnMs: lapped ? Math.max(TURN_FLOOR_MS, clock - TURN_STEP_MS) : clock,
        currentIndex: room.currentIndex + 1,
        reveal: null,
        questionStartedAt: { ".sv": "timestamp" } as unknown as number,
      });
    }, REVEAL_MS);

    return () => clearTimeout(id);
  }, [isHost, roomId, room]);

  // ── Host: apply the round winner's choice ──────────────
  useEffect(() => {
    if (!isHost || !roomId || !room || room.status !== "choosing") return;
    const chooser = room.chooserUid ? room.players[room.chooserUid] : null;
    if (!chooser) return;

    async function remove(targetUid: string) {
      if (!roomId || !room) return;

      const players: Record<string, RoomPlayer> = {};
      for (const [uid, p] of Object.entries(room.players)) {
        players[uid] = {
          ...p,
          alive: uid === targetUid ? false : p.alive,
          pendingTarget: null,
        };
      }

      const remaining = aliveSeats(players);

      if (remaining.length <= 1) {
        await updateRoom(roomId, {
          players,
          status: "finished",
          winnerUid: remaining[0]?.[0] ?? null,
          turnUid: null,
          chooserUid: null,
        });
        await closeRoomCode(roomId, room.code);
        return;
      }

      // New round: everyone still in the game answers again.
      for (const uid of Object.keys(players)) {
        players[uid] = { ...players[uid], inRound: players[uid].alive };
      }

      const first = firstSeat(players);
      await updateRoom(roomId, {
        players,
        status: "playing",
        round: room.round + 1,
        chooserUid: null,
        turnUid: first,
        currentIndex: room.currentIndex + 1,
        reveal: null,
        questionStartedAt: { ".sv": "timestamp" } as unknown as number,
      });
    }

    // A bot picks whoever is scoring best — the only sensible threat model.
    if (chooser.isBot) {
      const id = setTimeout(() => {
        const target = Object.entries(room.players)
          .filter(([uid, p]) => p.alive && uid !== room.chooserUid)
          .sort((a, b) => b[1].score - a[1].score)[0]?.[0];
        if (target) remove(target);
      }, BOT_CHOOSE_MS);
      return () => clearTimeout(id);
    }

    if (chooser.pendingTarget) remove(chooser.pendingTarget);
  }, [isHost, roomId, room]);

  // ── Answering ──────────────────────────────────────────
  async function commit(response: Answered) {
    if (!roomId || !user || !myTurn || answered || !question) return;
    committedRef.current = { id: question.id, response };
    setSubmittedFor(question.id);
    setDraft(response);
    await submitAnswer(roomId, index, user.uid, response);
  }

  // ── Bank the session ───────────────────────────────────
  const won = !!user && (finalRoom ?? room)?.winnerUid === user.uid;
  const savedRef = useRef(false);

  useEffect(() => {
    if (room?.status !== "finished" || savedRef.current || !user || !found) return;
    savedRef.current = true;

    const xp = myAnswers.reduce((s, a) => s + xpForAnswer(a), 0) + (won ? 50 : 0);
    const snapshot = progress;

    recordSession(user.uid, {
      game: "last-one-standing",
      subunitIds,
      correct: myAnswers.filter((a) => a.correct).length,
      total: myAnswers.length,
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
        setAfterP(saved);
      })
      .catch(() => {
        setBefore(snapshot);
        // Nothing came back, so the best available reading of the session is
        // the same one the transaction would have made. Still better than the
        // progress from before the game, which is the one thing it is not.
        setAfterP(applySession(snapshot, { xp: xp, won: won, at: new Date() }));
      });
  }, [room?.status, user, found, myAnswers, won, progress, subunitIds]);

  // Host: bin the room once it is over. The delay gives the other clients a
  // moment to take their snapshot before the data disappears.
  useEffect(() => {
    if (!isHost || !roomId || !finalRoom) return;
    const id = setTimeout(() => {
      deleteRoom(roomId, finalRoom.code).catch(() => {});
    }, 3000);
    return () => clearTimeout(id);
  }, [isHost, roomId, finalRoom]);

  if (!found) return <Missing />;

  const subtitle = `${selectionLabel(found)} · ${found.course.name}`;

  // ── Finished ───────────────────────────────────────────
  // Rendered from the local snapshot, because by now the host has deleted
  // the room out from under every client.
  if (finalRoom) {
    return (
      <Shell subtitle={subtitle}>
        <SessionSummary
          headline={endingFor(won, myAnswers[myAnswers.length - 1])}
          detail={`${selectionNames(found)} · won by ${
            finalRoom.players[finalRoom.winnerUid ?? ""]?.displayName ?? "nobody"
          }`}
          details={myAnswers}
          xpEarned={
            myAnswers.reduce((s, a) => s + xpForAnswer(a), 0) + (won ? 50 : 0)
          }
          before={before}
          after={afterP}
          onAgain={() => {
            setRoomId(null);
            setRoom(null);
            setFinalRoom(null);
            setMyPicks({});
            // A new room is a new session, and its positions start again from
            // the beginning — so a position spent in the last game must not
            // read as spent in this one.
            spentRef.current = null;
            savedRef.current = false;
            setBefore(null);
            setAfterP(null);
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
          <p className="eyebrow mb-5">Last One Standing</p>
          <h1 className="text-[34px] font-semibold tracking-[-0.035em]">
            Around the table, one at a time.
          </h1>
          <p className="mt-3 mb-8 text-[15px] text-muted">
            Answer on your turn. Miss and you stop answering for the round. The
            last one still answering removes a player from the game for good.
          </p>

          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="w-full rounded-lg bg-accent px-4.5 py-3 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:bg-surface-2 disabled:text-faint"
          >
            {busy ? "Working…" : "Create a room"}
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
          <p className="eyebrow mb-4">Room open</p>
          <RoomCode code={room.code} />
          <p className="mt-4 mb-8 text-[15px] text-muted">
            Share this code, or start now and bots take the empty seats.
          </p>

          {/* The room you are about to play in, with the places still open
              standing empty in it. Seats are not assigned until kick-off, so
              this is join order — the same order the list used to show. */}
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
              {seatsLeft > 0
                ? `Start — ${seatsLeft} bot${seatsLeft === 1 ? "" : "s"} fill in`
                : "Start"}
            </button>
          ) : (
            <p className="font-mono text-[11px] text-faint">
              Waiting for the host to start
            </p>
          )}

          {/* Sending the code rather than reading it out. Any player can, not
              just the host: everyone here already has the code. */}
          <InviteFriends
            roomId={roomId}
            code={room.code}
            subunitIds={subunitIds}
            game="last-one-standing"
          />
        </div>
      </Shell>
    );
  }

  // ── Choosing who to remove ─────────────────────────────
  if (room.status === "choosing") {
    const chooser = room.chooserUid ? players[room.chooserUid] : null;
    const mine = room.chooserUid === user?.uid;
    const targets = order.filter(([uid, p]) => p.alive && uid !== room.chooserUid);

    return (
      <Shell subtitle={subtitle}>
        <div className="w-full max-w-md">
          <p className="eyebrow mb-4">Round {room.round} over</p>

          {/* The room, still there, with the survivor standing in it. You are
              removing a person from a table rather than a name from a list —
              and pointing at a button marks the seat it belongs to. */}
          <div className="mb-7 h-64 overflow-hidden rounded-[10px] border border-line">
            <RoomTable3D
              seats={order.map(([uid, p]) => ({
                uid,
                displayName: p.displayName,
                isBot: p.isBot,
                alive: p.alive,
                inRound: p.alive,
                correct: p.correct,
                status:
                  uid === room.chooserUid
                    ? "survived"
                    : p.alive
                      ? undefined
                      : "out",
              }))}
              turnUid={room.chooserUid ?? null}
              meUid={user?.uid ?? null}
              revealing={false}
              markedUid={marked}
            />
          </div>

          {mine ? (
            <>
              <h1 className="text-[30px] font-semibold tracking-[-0.032em]">
                You survived the round.
              </h1>
              <p className="mt-3 mb-7 text-[15px] text-muted">
                Remove one player from the game. Everyone else plays on.
              </p>

              <ul className="flex flex-col gap-2.5">
                {targets.map(([uid, p]) => (
                  <li key={uid}>
                    <button
                      type="button"
                      onClick={() => {
                        // Cleared here rather than left to a pointer-leave
                        // that never fires: the screen unmounts on the click,
                        // and a stale mark would light up a seat the moment
                        // the next round's choice came round.
                        setMarked(null);
                        if (roomId && user) nominateTarget(roomId, user.uid, uid);
                      }}
                      onPointerEnter={() => setMarked(uid)}
                      onPointerLeave={() => setMarked(null)}
                      onFocus={() => setMarked(uid)}
                      onBlur={() => setMarked(null)}
                      className="box box-tap flex w-full items-center justify-between px-4 py-4 text-left text-[15px]"
                    >
                      <span>
                        {p.displayName}
                        {p.isBot && <span className="ml-2 text-faint">bot</span>}
                      </span>
                      <span className="eyebrow text-out">Remove</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h1 className="text-[30px] font-semibold tracking-[-0.032em]">
                {chooser?.displayName ?? "Someone"} survived the round.
              </h1>
              <p className="mt-3 text-[15px] text-muted">
                They&apos;re choosing who to remove from the game.
              </p>
            </>
          )}
        </div>
      </Shell>
    );
  }

  // ── Playing ────────────────────────────────────────────
  const turnPlayer = room.turnUid ? players[room.turnUid] : null;
  const mySeatUp = !!user && room.turnUid === user.uid;

  // Whether the question on the table is mine to answer. It stays mine
  // through the reveal, which is when the answer to it finally arrives — and
  // it is never anybody else's, because a turn is one person's to think
  // through and nobody else needs the question in front of them to wait.
  const myQuestion =
    !!user && (room.turnUid === user.uid || reveal?.uid === user.uid);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-5 px-6 text-[13px]">
        <Wordmark />
        <span className="font-medium">Last One Standing</span>
        <span className="font-mono text-[11px] text-faint tnum">
          Round {room.round} · {aliveCount} left
        </span>

        <span className="ml-auto flex items-center gap-5">
          {/* Whose clock this is, said next to it. Every turn is given its own
              — the number goes back to the round's full clock when the turn
              moves round the table — but a countdown with nobody's name on it
              reads as one clock the whole table is sharing, and as time being
              taken off you while somebody else thinks. */}
          <span className="flex items-baseline gap-2 font-mono text-[13px] tnum">
            {/* Read off the seat rather than off `myTurn`, which goes false
                the moment the reveal lands — a turn is still yours while you
                are being told how it went. */}
            <span className={mySeatUp ? "text-accent" : "text-faint"}>
              {mySeatUp ? "You" : (turnPlayer?.displayName ?? "—")}
            </span>
            <span
              className={
                msLeft <= 5000 && myTurn
                  ? "animate-clock-urgent text-out"
                  : "text-muted"
              }
            >
              {reveal ? "—" : `0:${String(Math.ceil(msLeft / 1000)).padStart(2, "0")}`}
            </span>
          </span>
          <Link href="/" className="text-faint transition-colors hover:text-ink">
            Leave
          </Link>
        </span>
      </header>

      <ClockRail
        fraction={reveal || !myTurn ? 0 : msLeft / totalMs}
        urgent={msLeft <= 5000}
      />

      <div className="flex flex-1 flex-col-reverse lg:flex-row">
        <main className="flex flex-1 items-center justify-center px-6 py-10">
          {!me?.alive ? (
            <div className="animate-question-in max-w-md text-center">
              <p className="eyebrow mb-4 text-out">Removed</p>
              <h2 className="text-2xl font-medium tracking-[-0.025em]">
                You&apos;re out of the game — watching the rest.
              </h2>
            </div>
          ) : !myQuestion ? (
            <Waiting
              name={turnPlayer?.displayName ?? "Someone"}
              outcome={reveal ? (reveal.correct ? "right" : "wrong") : null}
            />
          ) : (
            question && (
              <div className="w-full max-w-3xl">
                {/* Whose turn it is, stated once, above the question. */}
                <p className="mb-4 text-[14px] text-accent">Your turn</p>

                <QuestionStage
                  question={question}
                  eyebrow={
                    subunitOfQuestion(question.id)?.name ?? found.unit.name
                  }
                  draft={
                    reveal && reveal.uid === user?.uid ? reveal.response : draft
                  }
                  reveal={reveal ? reveal.answer : null}
                  score={reveal ? reveal.score : null}
                  steps={reveal?.steps ?? undefined}
                  disabled={!myTurn || answered}
                  onDraft={setDraft}
                  onSubmit={commit}
                />
              </div>
            )
          )}
        </main>

        {/* ── The table ──────────────────────────────────── */}
        <aside className="shrink-0 border-line-soft px-6 py-8 lg:w-80 lg:border-l">
          <p className="eyebrow mb-3">The table</p>

          {/* Standing, sat down and gone are three different things, and the
              room shows them as three different postures. */}
          <div className="h-56 overflow-hidden rounded-[10px] border border-line lg:h-72">
            <RoomTable3D
              seats={order.map(([uid, p]) => ({
                uid,
                displayName: p.displayName,
                isBot: p.isBot,
                alive: p.alive,
                inRound: p.inRound,
                correct: p.correct,
              }))}
              turnUid={room.turnUid ?? null}
              meUid={user?.uid ?? null}
              revealing={Boolean(reveal)}
            />
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-faint">
            Miss and you sit down for the round. The last one answering removes a
            player from the game.
          </p>
        </aside>
      </div>
    </div>
  );
}

/**
 * What you see while somebody else is up.
 *
 * Not their question. Every turn deals a question of its own, so the one on
 * the table is no use to the people waiting — reading three of other people's
 * while your own is still to come is how a table full of maths turns into
 * noise, and it puts an answer you never worked for in front of you. What is
 * worth knowing from here is who is on and how they got on, which is what the
 * table beside it says too, in postures rather than words.
 */
function Waiting({
  name,
  outcome,
}: {
  name: string;
  /** How the turn ended, once it has. Null while they are still thinking. */
  outcome: "right" | "wrong" | null;
}) {
  return (
    <div
      key={outcome ?? "thinking"}
      className="animate-question-in max-w-md text-center"
    >
      <p className="eyebrow mb-4">{outcome ? "Their turn" : "Waiting"}</p>

      <h2 className="text-2xl font-medium tracking-[-0.025em]">
        {outcome === null
          ? `${name} is answering…`
          : outcome === "right"
            ? `${name} got it.`
            : `${name} missed.`}
      </h2>

      <p className="mt-3 text-[14px] text-muted">
        {outcome === "wrong"
          ? "They sit down for the rest of the round."
          : "Your own question comes with your turn."}
      </p>
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
