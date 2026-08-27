"use client";

import {
  get,
  onValue,
  push,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update,
  onDisconnect,
  remove,
} from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import type { Question } from "@/lib/curriculum";
import {
  parseResponse,
  parseReveal,
  type Response,
  type Reveal as Answer,
} from "@/lib/questions";
import {
  EMPTY_PROGRESS,
  applySession,
  type Progress,
} from "@/lib/progression";

export type GameId = "racer" | "last-one-standing" | "mirror";

export type RoomPlayer = {
  displayName: string;
  isBot: boolean;
  /** Still in the game. Losing a round removes you for good. */
  alive: boolean;
  /** Still answering this round. Reset for everyone still alive each round. */
  inRound: boolean;
  /** Turn order around the table. Assigned by the host at kick-off. */
  seat: number;
  score: number;
  correct: number;
  /**
   * Who this player wants removed, written when they win a round. It lives on
   * the player's own node because that is the one place a non-host is allowed
   * to write — the host reads it and applies it.
   */
  pendingTarget?: string | null;
  joinedAt: number | object;
};

/** What just happened on the last turn, so every client shows the same reveal. */
export type Reveal = {
  uid: string;
  /** What the player submitted, of whichever kind the question was. */
  response: Response;
  correct: boolean;
  /** How much of it was right, 0–1. Below 1 only on the proximity kinds. */
  score: number;
  /** The right answer, as graded by the server. */
  answer: Answer;
};

/** One player's half of a mirrored question, once the round has settled. */
export type DuelResult = {
  response: Response;
  correct: boolean;
  /** How much of it was right, 0–1. This is what the duel is decided on. */
  score: number;
  /** What they took off the other player. Non-zero only for the closest. */
  gap: number;
  /** Score plus gap, in points, added to their running total. */
  points: number;
};

/**
 * A whole mirrored question, settled.
 *
 * Published in one write, after everybody has committed, because publishing
 * one player's result first would tell the other where the answer is — on a
 * proximity question a score of 40% narrows the target to a ring. Everything
 * arrives at once or not at all.
 */
export type DuelReveal = {
  /** The position this settles, so a late listener cannot show it twice. */
  index: number;
  /** The right answer, said once for the table. */
  answer: Answer;
  results: Record<string, DuelResult>;
  /** Who was strictly closest, or null on a dead heat. */
  closestUid: string | null;
};

export type Room = {
  code: string;
  game: GameId;
  subunitId: string;
  hostUid: string;
  status: "lobby" | "playing" | "choosing" | "finished";
  seats: number;
  /** Question ids in play order, issued by the server at kick-off. */
  order: string[];
  /**
   * The questions themselves, in the same order. The host puts them here at
   * kick-off because a generated subunit invents its questions per session —
   * they exist only in the server response the host received, so every other
   * player has to read them from the room. Answers are not in here; they are
   * still handed out one verdict at a time.
   */
  questions: Question[];
  /** Rounds within the game. Each one ends with somebody being removed. */
  round: number;
  /** Whose turn it is to answer. Always null in a duel — everybody answers. */
  turnUid: string | null;
  /**
   * Who has locked an answer in on the question showing now.
   *
   * The answers themselves live outside the room and are readable only by the
   * player who wrote them and by the host, which is what keeps a duel honest.
   * That somebody has *finished* is a different fact from what they said, and
   * it is the one that makes answering at the same time feel like answering
   * at the same time — so it is published, and nothing else is.
   */
  committed?: Record<string, true> | null;
  /** The last mirrored question, settled. Duels only. */
  duel?: DuelReveal | null;
  /** Who won the round and must now remove a player. */
  chooserUid: string | null;
  /** Server grading session, opened by the host at kick-off. */
  sessionId: string | null;
  currentIndex: number;
  /** Server time the current question was shown, so all clocks agree. */
  questionStartedAt: number | object | null;
  reveal: Reveal | null;
  players: Record<string, RoomPlayer>;
  winnerUid?: string | null;
  createdAt: number | object;
};

/** What one player submitted on one question. Stored outside the room. */
export type AnswerEntry = { response: Response; at: number };

export type SessionResult = {
  game: GameId;
  subunitId: string;
  correct: number;
  total: number;
  xp: number;
  won: boolean;
  at: number | object;
};

// ─── Progress ────────────────────────────────────────────

export function watchProgress(uid: string, cb: (p: Progress) => void) {
  return onValue(ref(realtimeDb, `users/${uid}/progress`), (snap) => {
    cb({ ...EMPTY_PROGRESS, ...(snap.val() ?? {}) });
  });
}

/**
 * Records a finished session. The progress update runs as a transaction
 * because two tabs finishing at once would otherwise both read the same XP
 * and one write would silently overwrite the other.
 */
export async function recordSession(
  uid: string,
  result: Omit<SessionResult, "at">,
) {
  const now = new Date();

  await runTransaction(ref(realtimeDb, `users/${uid}/progress`), (current) => {
    const prev: Progress = { ...EMPTY_PROGRESS, ...(current ?? {}) };
    return applySession(prev, { xp: result.xp, won: result.won, at: now });
  });

  await push(ref(realtimeDb, `results/${uid}`), {
    ...result,
    at: serverTimestamp(),
  });
}

export async function readResults(uid: string) {
  const snap = await get(ref(realtimeDb, `results/${uid}`));
  const val = (snap.val() ?? {}) as Record<string, SessionResult>;
  return Object.entries(val)
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => Number(b.at) - Number(a.at));
}

// ─── Rooms ───────────────────────────────────────────────

/** Six characters, no vowels — so a room code can't spell anything. */
export function makeRoomCode(): string {
  const alphabet = "BCDFGHJKLMNPQRSTVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function createRoom(opts: {
  hostUid: string;
  displayName: string;
  subunitId: string;
  seats: number;
  /** Stated rather than defaulted: two games run out of this one node now. */
  game: GameId;
}): Promise<string> {
  const roomRef = push(ref(realtimeDb, "rooms"));
  const roomId = roomRef.key!;

  const room: Room = {
    code: makeRoomCode(),
    game: opts.game,
    subunitId: opts.subunitId,
    hostUid: opts.hostUid,
    status: "lobby",
    seats: opts.seats,
    order: [],
    questions: [],
    round: 1,
    turnUid: null,
    chooserUid: null,
    sessionId: null,
    currentIndex: 0,
    questionStartedAt: null,
    reveal: null,
    committed: null,
    duel: null,
    players: {
      [opts.hostUid]: {
        displayName: opts.displayName,
        isBot: false,
        alive: true,
        inRound: true,
        seat: 0,
        score: 0,
        correct: 0,
        joinedAt: serverTimestamp(),
      },
    },
    winnerUid: null,
    createdAt: serverTimestamp(),
  };

  await set(roomRef, room);

  // Publish the code only after the room exists — the rules check the room's
  // hostUid to decide whether this write is allowed.
  await set(ref(realtimeDb, `roomCodes/${room.code}`), {
    roomId,
    hostUid: opts.hostUid,
    status: "lobby",
  });

  // An abandoned lobby should not outlive the tab that opened it. Cancelled
  // at kick-off, so a network blip mid-game does not destroy a live room.
  onDisconnect(roomRef).remove();
  onDisconnect(ref(realtimeDb, `roomCodes/${room.code}`)).remove();

  return roomId;
}

/**
 * One direct read of the code index. Rooms themselves are not globally
 * readable, so the caller joins by writing a seat and then reads the room.
 */
export type CodeLookup = { roomId: string } | { error: string };

export async function findRoomByCode(code: string): Promise<CodeLookup> {
  const snap = await get(ref(realtimeDb, `roomCodes/${code.toUpperCase()}`));
  const entry = snap.val() as { roomId: string; status: Room["status"] } | null;

  if (!entry) return { error: "No room with that code." };
  if (entry.status !== "lobby") return { error: "That room has already started." };

  return { roomId: entry.roomId };
}

export async function joinRoom(
  roomId: string,
  uid: string,
  displayName: string,
) {
  // Seat is a placeholder — the host assigns real turn order at kick-off,
  // because a joiner cannot read the room to see who is already in it.
  await update(ref(realtimeDb, `rooms/${roomId}/players/${uid}`), {
    displayName,
    isBot: false,
    alive: true,
    inRound: true,
    seat: 0,
    score: 0,
    correct: 0,
    joinedAt: serverTimestamp(),
  });

  // If the tab closes before the round starts, give the seat back.
  onDisconnect(ref(realtimeDb, `rooms/${roomId}/players/${uid}`)).remove();
}

export function watchRoom(roomId: string, cb: (room: Room | null) => void) {
  return onValue(ref(realtimeDb, `rooms/${roomId}`), (snap) => {
    const room = snap.val() as Room | null;
    if (!room) return cb(null);

    // The reveal takes the same round trip as a stored answer and loses its
    // null fields the same way, so it is rebuilt rather than trusted. A reveal
    // that cannot be read is dropped: showing the table a half-decoded turn is
    // worse than showing it none.
    const reveal = room.reveal;
    if (reveal) {
      const response = parseResponse(reveal.response);
      const answer = parseReveal(reveal.answer);
      room.reveal =
        response && answer ? { ...reveal, response, answer } : null;
    }

    // The same for a settled duel, which travels the same way and loses the
    // same fields. A result whose response will not parse is dropped rather
    // than shown, but the rest of the table still gets its reveal — one
    // player's unreadable answer is not a reason to hide the right answer
    // from everybody.
    const duel = room.duel;
    if (duel) {
      const answer = parseReveal(duel.answer);
      const results: Record<string, DuelResult> = {};
      for (const [uid, result] of Object.entries(duel.results ?? {})) {
        const response = parseResponse(result?.response);
        if (response) results[uid] = { ...result, response };
      }
      room.duel = answer
        ? { ...duel, answer, results, closestUid: duel.closestUid ?? null }
        : null;
    }

    cb(room);
  });
}

export async function submitAnswer(
  roomId: string,
  index: number,
  uid: string,
  response: Response,
) {
  // Outside the room, so opponents cannot read it before the reveal.
  // Write-once at the rules level, so it cannot be changed after.
  await set(ref(realtimeDb, `roomAnswers/${roomId}/${index}/${uid}`), {
    response,
    at: serverTimestamp(),
  });
}

/**
 * Reads a stored turn back into a response.
 *
 * The database drops keys whose value is null, so a timeout written as
 * `{kind: "choice", choice: null}` returns as `{kind: "choice"}`. Left alone
 * that reads as an answer rather than as no answer, which would score a
 * timeout as a wrong guess and, worse, keep a player in the round.
 */
function reviveAnswers(
  raw: Record<string, { response?: unknown; at?: number }>,
): Record<string, AnswerEntry> {
  const out: Record<string, AnswerEntry> = {};
  for (const [uid, entry] of Object.entries(raw ?? {})) {
    const response = parseResponse(entry?.response);
    if (response) out[uid] = { response, at: entry?.at ?? 0 };
  }
  return out;
}

/** Host only — one shot, at resolve time, rather than a standing listener. */
export async function readAnswers(roomId: string, index: number) {
  const snap = await get(ref(realtimeDb, `roomAnswers/${roomId}/${index}`));
  return reviveAnswers(snap.val() ?? {});
}

/**
 * Host only. Watching rather than polling is what makes a turn resolve the
 * instant the player commits, instead of after the clock runs out.
 */
export function watchAnswers(
  roomId: string,
  index: number,
  cb: (answers: Record<string, AnswerEntry>) => void,
) {
  return onValue(ref(realtimeDb, `roomAnswers/${roomId}/${index}`), (snap) => {
    cb(reviveAnswers(snap.val() ?? {}));
  });
}

/** Written by the round winner on their own node; applied by the host. */
export async function nominateTarget(
  roomId: string,
  uid: string,
  targetUid: string,
) {
  await update(ref(realtimeDb, `rooms/${roomId}/players/${uid}`), {
    pendingTarget: targetUid,
  });
}

export async function updateRoom(roomId: string, patch: Partial<Room>) {
  await update(ref(realtimeDb, `rooms/${roomId}`), patch);
}

export async function updatePlayer(
  roomId: string,
  uid: string,
  patch: Partial<RoomPlayer>,
) {
  await update(ref(realtimeDb, `rooms/${roomId}/players/${uid}`), patch);
}

export async function startRoom(
  roomId: string,
  code: string,
  players: Record<string, RoomPlayer>,
  turnUid: string,
  sessionId: string,
  order: string[],
  questions: Question[],
) {
  await update(ref(realtimeDb, `rooms/${roomId}`), {
    players,
    status: "playing",
    round: 1,
    turnUid,
    chooserUid: null,
    sessionId,
    order,
    questions,
    currentIndex: 0,
    reveal: null,
    questionStartedAt: serverTimestamp(),
  });

  // Close the code so nobody joins a round already in progress.
  await update(ref(realtimeDb, `roomCodes/${code}`), {
    roomId,
    status: "playing",
  });

  await goLive(roomId, code);
}

/**
 * Kick-off for a duel.
 *
 * Separate from `startRoom` because the two games disagree about the shape of
 * a turn: one goes round the table and the other has no turns at all. Sharing
 * the function would mean a `turnUid` that means something in one game and
 * has to be remembered to be null in the other.
 */
export async function startDuel(
  roomId: string,
  code: string,
  players: Record<string, RoomPlayer>,
  sessionId: string,
  order: string[],
  questions: Question[],
) {
  await update(ref(realtimeDb, `rooms/${roomId}`), {
    players,
    status: "playing",
    round: 1,
    turnUid: null,
    chooserUid: null,
    sessionId,
    order,
    questions,
    currentIndex: 0,
    reveal: null,
    committed: null,
    duel: null,
    questionStartedAt: serverTimestamp(),
  });

  await update(ref(realtimeDb, `roomCodes/${code}`), {
    roomId,
    status: "playing",
  });

  await goLive(roomId, code);
}

/**
 * A room that has started should survive the host briefly dropping, so the
 * disconnect handlers that clean up an abandoned lobby are stood down.
 */
async function goLive(roomId: string, code: string) {
  await onDisconnect(ref(realtimeDb, `rooms/${roomId}`)).cancel();
  await onDisconnect(ref(realtimeDb, `roomCodes/${code}`)).cancel();
}

/**
 * Host only: publishes who has locked in, without publishing what they said.
 * Written as the whole set each time rather than one key at a time, so a
 * question that nobody has answered yet clears the last one's marks.
 */
export async function markCommitted(roomId: string, uids: string[]) {
  const committed: Record<string, true> = {};
  for (const uid of uids) committed[uid] = true;
  await update(ref(realtimeDb, `rooms/${roomId}`), {
    committed: uids.length ? committed : null,
  });
}

export async function closeRoomCode(roomId: string, code: string) {
  await update(ref(realtimeDb, `roomCodes/${code}`), {
    roomId,
    status: "finished",
  });
}

/**
 * A finished room is dead weight — the players already hold everything the
 * results screen needs. Host only, once everyone has had time to read the
 * final state.
 */
export async function deleteRoom(roomId: string, code: string) {
  await remove(ref(realtimeDb, `roomCodes/${code}`));
  await remove(ref(realtimeDb, `roomAnswers/${roomId}`));
  await remove(ref(realtimeDb, `rooms/${roomId}`));
}
