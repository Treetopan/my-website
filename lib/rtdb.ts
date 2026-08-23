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
  EMPTY_PROGRESS,
  applySession,
  type Progress,
} from "@/lib/progression";

export type GameId = "racer" | "last-one-standing";

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
  choice: number | null;
  correct: boolean;
  /** The right option, as graded by the server. */
  answer: number;
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
  /** Whose turn it is to answer. */
  turnUid: string | null;
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

/** What one player picked on one question. Stored outside the room. */
export type AnswerEntry = { choice: number; at: number };

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
}): Promise<string> {
  const roomRef = push(ref(realtimeDb, "rooms"));
  const roomId = roomRef.key!;

  const room: Room = {
    code: makeRoomCode(),
    game: "last-one-standing",
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
    cb(snap.val());
  });
}

export async function submitAnswer(
  roomId: string,
  index: number,
  uid: string,
  choice: number,
) {
  // Outside the room, so opponents cannot read it before the reveal.
  // Write-once at the rules level, so it cannot be changed after.
  await set(ref(realtimeDb, `roomAnswers/${roomId}/${index}/${uid}`), {
    choice,
    at: serverTimestamp(),
  });
}

/** Host only — one shot, at resolve time, rather than a standing listener. */
export async function readAnswers(roomId: string, index: number) {
  const snap = await get(ref(realtimeDb, `roomAnswers/${roomId}/${index}`));
  return (snap.val() ?? {}) as Record<string, AnswerEntry>;
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
    cb((snap.val() ?? {}) as Record<string, AnswerEntry>);
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

  // The room is live now — it should survive the host briefly dropping.
  await onDisconnect(ref(realtimeDb, `rooms/${roomId}`)).cancel();
  await onDisconnect(ref(realtimeDb, `roomCodes/${code}`)).cancel();
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
