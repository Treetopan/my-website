"use client";

import { onValue, push, ref, serverTimestamp } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

/**
 * A line from a player to whoever runs this.
 *
 * It goes into its own node rather than onto the account, because of who may
 * read it: the rules let any signed-in player write one and let nobody but an
 * admin read any of them back. A note kept under `users/{uid}` would be
 * readable by every signed-in player — that node is what lets a room show a
 * name — so somebody saying the geometry unit is broken would be saying it to
 * the whole app.
 *
 * Write-once, and never edited or deleted by its author: the rules refuse a
 * second write to the same key. Nothing here is a conversation, so there is
 * nothing to take back — and a note that could be rewritten after it was read
 * is not a record of anything.
 *
 * What travels with it is the name the player plays under, which is the only
 * handle this app asks anybody to remember. No address: Firebase Auth holds
 * one per account and nothing in this app copies it anywhere.
 */

/** Long enough to describe a bug properly, short enough not to be storage. */
export const FEEDBACK_MAX = 2000;

export type FeedbackNote = {
  id: string;
  uid: string;
  username: string | null;
  text: string;
  at: number;
};

export async function sendFeedback(
  by: { uid: string; username: string | null },
  text: string,
): Promise<void> {
  const said = text.trim().slice(0, FEEDBACK_MAX);
  if (!said) return;

  await push(ref(realtimeDb, "feedback"), {
    uid: by.uid,
    username: by.username ?? null,
    text: said,
    at: serverTimestamp(),
  });
}

/**
 * Every note, newest first. Admins only — a read by anybody else is refused by
 * the rules, and a refusal reads as an empty list rather than as an error,
 * because nobody who cannot read this is ever shown a screen that asks.
 */
export function watchFeedback(cb: (notes: FeedbackNote[]) => void) {
  return onValue(
    ref(realtimeDb, "feedback"),
    (snap) => {
      const raw = (snap.val() ?? {}) as Record<string, Omit<FeedbackNote, "id">>;
      cb(
        Object.entries(raw)
          .map(([id, note]) => ({ ...note, id }))
          .sort((a, b) => (b.at ?? 0) - (a.at ?? 0)),
      );
    },
    () => cb([]),
  );
}
