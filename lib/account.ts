"use client";

import { onValue, ref } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { EMPTY_PROGRESS, type Progress } from "@/lib/progression";

/**
 * The account itself — the row under `users/{uid}` that everything else hangs
 * off. Kept apart from `social.ts`, which is about one player reaching another,
 * and from `rtdb.ts`, which is about a game in progress: this is just who the
 * account belongs to and when it started.
 *
 * ```
 * users/{uid}/username     the name its owner claimed
 * users/{uid}/createdAt    server time the account was made
 * users/{uid}/progress     xp, streak, played, won
 * ```
 *
 * No email. Firebase Auth already holds one per account and this node is
 * readable by every signed-in player — a room shows names out of it — so a
 * copy here would be an address book any account in the app could read. The
 * admin screen gets emails from `/api/admin/accounts` instead, and the rules
 * refuse a write of `email` so a stale client cannot put one back.
 */

export type Account = {
  uid: string;
  username: string | null;
  createdAt: number | null;
  progress: Progress;
};

/**
 * The database drops keys whose value is null and an account created before a
 * field existed simply lacks it, so every field is read defensively rather than
 * trusted — a missing `progress` is an empty one, not a crash.
 */
function toAccount(uid: string, raw: unknown): Account {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    uid,
    username: typeof row.username === "string" ? row.username : null,
    createdAt: typeof row.createdAt === "number" ? row.createdAt : null,
    progress: {
      ...EMPTY_PROGRESS,
      ...((row.progress ?? {}) as Partial<Progress>),
    },
  };
}

export function watchAccount(uid: string, cb: (account: Account) => void) {
  return onValue(ref(realtimeDb, `users/${uid}`), (snap) => {
    cb(toAccount(uid, snap.val()));
  });
}
