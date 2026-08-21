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
} from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import {
  EMPTY_PROGRESS,
  applySession,
  type Progress,
} from "@/lib/progression";

export type GameId = "racer" | "last-one-standing";

export type RoomPlayer = {
  displayName: string;
  isBot: boolean;
  alive: boolean;
  score: number;
  correct: number;
  joinedAt: number | object;
};

export type Room = {
  code: string;
  game: GameId;
  subunitId: string;
  hostUid: string;
  status: "lobby" | "playing" | "finished";
  seats: number;
  seed: number;
  currentIndex: number;
  /** Server time the current question was shown, so all clocks agree. */
  questionStartedAt: number | object | null;
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
    seed: Math.floor(Math.random() * 2_147_483_647),
    currentIndex: 0,
    questionStartedAt: null,
    players: {
      [opts.hostUid]: {
        displayName: opts.displayName,
        isBot: false,
        alive: true,
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
    status: "lobby",
  });

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
  await update(ref(realtimeDb, `rooms/${roomId}/players/${uid}`), {
    displayName,
    isBot: false,
    alive: true,
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
) {
  await update(ref(realtimeDb, `rooms/${roomId}`), {
    players,
    status: "playing",
    currentIndex: 0,
    questionStartedAt: serverTimestamp(),
  });

  // Close the code so nobody joins a round already in progress.
  await update(ref(realtimeDb, `roomCodes/${code}`), {
    roomId,
    status: "playing",
  });
}

export async function closeRoomCode(roomId: string, code: string) {
  await update(ref(realtimeDb, `roomCodes/${code}`), {
    roomId,
    status: "finished",
  });
}
