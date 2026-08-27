"use client";

import { get, onValue, ref } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { EMPTY_PROGRESS, type Progress } from "@/lib/progression";

/**
 * The account itself — the row under `users/{uid}` that everything else hangs
 * off. Kept apart from `social.ts`, which is about one player reaching another,
 * and from `rtdb.ts`, which is about a game in progress: this is just who the
 * account belongs to and when it started.
 *
 * ```
 * users/{uid}/email        as typed at sign-up
 * users/{uid}/username     the name its owner claimed
 * users/{uid}/createdAt    server time the account was made
 * users/{uid}/progress     xp, streak, played, won
 * ```
 */

export type Account = {
  uid: string;
  username: string | null;
  email: string | null;
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
    email: typeof row.email === "string" ? row.email : null,
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

/**
 * Every account, newest first. Only an admin may read this — the rules grant
 * the read at the `users` root, and a signed-in user who is not an admin can
 * still read accounts one uid at a time, which is what rooms need.
 *
 * One read of the whole node rather than a paged query: the node holds a row
 * per player and nothing large, and an admin screen that shows a count has to
 * see all of them anyway. If this ever gets big enough to hurt, the count is
 * the thing to move to a counter, not this read to a cursor.
 */
export async function readAccounts(): Promise<Account[]> {
  const snap = await get(ref(realtimeDb, "users"));
  const raw = (snap.val() ?? {}) as Record<string, unknown>;

  return Object.entries(raw)
    .map(([uid, row]) => toAccount(uid, row))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
