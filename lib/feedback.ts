"use client";

import { onValue, push, ref, remove, serverTimestamp, update } from "firebase/database";
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
 * Anonymous, and properly so: what is stored is the note and the time it
 * arrived, and nothing else. Not a name, not the uid of the account that wrote
 * it — the rules refuse a note carrying anything but its own text, so there is
 * nothing to trace even for the person reading it. Somebody saying the thing
 * they are least comfortable saying is exactly who this is for, and a byline
 * is the reason they would not.
 *
 * Write-once for its author: the rules refuse a second write to the same key,
 * and the key is one Firebase invented, so nothing can be edited or taken back
 * after it has been read. An admin may flag one or remove it, and that is the
 * whole of what anybody can do to a note.
 */

/** Long enough to describe a bug properly, short enough not to be storage. */
export const FEEDBACK_MAX = 2000;

export type FeedbackNote = {
  id: string;
  text: string;
  at: number;
  /** Held up by an admin as worth coming back to. Sorts to the top. */
  flagged?: boolean;
};

export async function sendFeedback(text: string): Promise<void> {
  const said = text.trim().slice(0, FEEDBACK_MAX);
  if (!said) return;

  await push(ref(realtimeDb, "feedback"), { text: said, at: serverTimestamp() });
}

/**
 * Admin only. Holds a note at the top of the list, or puts it back down.
 *
 * The two nulls are for the notes sent before any of this was anonymous, which
 * still carry the name and uid that build stamped on them: the rules now allow
 * a note nothing but its text, its time and this flag, so flagging one of them
 * would be refused — and dropping what should never have been there is the
 * right way to pass rather than a way around it.
 */
export async function flagFeedback(id: string, flagged: boolean) {
  await update(ref(realtimeDb, `feedback/${id}`), {
    flagged: flagged || null,
    uid: null,
    username: null,
  });
}

/**
 * Admin only, and the same write whether the note was dealt with or was never
 * worth keeping: there is nobody to tell either way, and a read note that
 * stays on the screen is a list that only ever grows.
 */
export async function removeFeedback(id: string) {
  await remove(ref(realtimeDb, `feedback/${id}`));
}

/**
 * Every note: flagged ones first, then newest. Admins only — a read by anybody
 * else is refused by the rules, and a refusal reads as an empty list rather
 * than as an error, because nobody who cannot read this is ever shown a screen
 * that asks.
 */
export function watchFeedback(cb: (notes: FeedbackNote[]) => void) {
  return onValue(
    ref(realtimeDb, "feedback"),
    (snap) => {
      const raw = (snap.val() ?? {}) as Record<string, Omit<FeedbackNote, "id">>;
      cb(
        Object.entries(raw)
          .map(([id, note]) => ({ ...note, id }))
          .sort(
            (a, b) =>
              Number(!!b.flagged) - Number(!!a.flagged) ||
              (b.at ?? 0) - (a.at ?? 0),
          ),
      );
    },
    () => cb([]),
  );
}
