"use client";

import { onValue, ref, serverTimestamp, set } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { getCourse } from "@/lib/curriculum";
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
 * The course a student is taking is deliberately NOT here — see `courses/`
 * below.
 *
 * No email. Firebase Auth already holds one per account and this node is
 * readable by every signed-in player — a room shows names out of it — so a
 * copy here would be an address book any account in the app could read. The
 * rules refuse a write of `email` so a stale client cannot put one back, and
 * nothing reads the ones Auth holds: the admin screen counts accounts rather
 * than listing them.
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

// ─── The course a student is taking ──────────────────────

/**
 * Which maths a student says they are in, kept under `courses/{uid}` as
 *
 * ```
 * courses/{uid}/id    a curriculum course id, absent when they skipped
 * courses/{uid}/at    server time they were asked
 * ```
 *
 * Its own node, and not a field on the profile, because of who may read it.
 * Every signed-in account can read every row of `users` — that is what lets a
 * room show names — and `/usernames` maps a name to a uid for anyone signed
 * in. A maths level on the profile would therefore be walkable: sign up, read
 * the index, and you have a list of the school-age students using this app and
 * what maths each one is taking. Nothing social needs this value; only the
 * student's own screens do. So it lives where only its owner can read it, for
 * the same reason the survey answers live under `surveys/{uid}`.
 *
 * Two fields rather than one because "never asked" and "asked, and would
 * rather not say" have to be told apart. Only the second stops the question
 * being asked again, and a bare `id` cannot express it: its absence would mean
 * both, and a student who skipped would meet the same screen every visit.
 *
 * Being a node of its own also means the write that changes it cannot reach
 * `progress` at all — changing your course is a default changing, not a reset,
 * and the write should not be *able* to touch XP or a streak, not merely
 * avoid it.
 *
 * The id is stored, never the name. A course renamed in the curriculum keeps
 * every account pointing at it, and a course removed from it reads as a course
 * we no longer have rather than as a label from nowhere.
 */
export type CourseChoice =
  /** Still reading. Not the same as not having chosen. */
  | { status: "loading" }
  /** Never asked — a new account, or one that predates the question. */
  | { status: "unasked" }
  /** Asked, and skipped. Asking again is the profile's job, not a gate's. */
  | { status: "skipped" }
  | { status: "chosen"; courseId: string }
  /**
   * Could not be read. Its own state for the same reason the survey has one:
   * a record that will not load must never read as a record that is not there,
   * or a blink of a bad connection puts the question in front of somebody who
   * has already answered it.
   */
  | { status: "unavailable" };

/** The shape on disk, read defensively — any field may be missing or junk. */
function readCourse(raw: unknown): { id: string | null; askedAt: number | null } {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    id: typeof row.id === "string" && row.id ? row.id : null,
    askedAt: typeof row.at === "number" ? row.at : null,
  };
}

export function watchCourse(uid: string, cb: (choice: CourseChoice) => void) {
  return onValue(
    ref(realtimeDb, `courses/${uid}`),
    (snap) => {
      const { id, askedAt } = readCourse(snap.val());
      if (id) cb({ status: "chosen", courseId: id });
      else if (askedAt !== null) cb({ status: "skipped" });
      else cb({ status: "unasked" });
    },
    () => cb({ status: "unavailable" }),
  );
}

/**
 * Records the course. Refuses an id the curriculum does not have, so a stale
 * link or an old build cannot leave an account pointing at nothing.
 */
export async function setCourse(uid: string, courseId: string) {
  if (!getCourse(courseId)) return;
  await set(ref(realtimeDb, `courses/${uid}`), {
    id: courseId,
    at: serverTimestamp(),
  });
}

/**
 * No course — which is a skip, and is recorded as one rather than left blank.
 * The record is what stops the question being asked again, so clearing an
 * answer from the profile must write this rather than delete the subtree.
 */
export async function skipCourse(uid: string) {
  await set(ref(realtimeDb, `courses/${uid}`), { at: serverTimestamp() });
}
