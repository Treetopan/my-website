"use client";

import {
  get,
  onValue,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { checkUsername, usernameKey } from "@/lib/username";

/**
 * Everything that connects one player to another: the name they are known by,
 * the friends they have, and the invitations that pass between them.
 *
 * Kept apart from `rtdb.ts`, which is about a game in progress. Nothing here
 * knows what a question is; nothing there knows what a friend is.
 *
 * ```
 * usernames/{key}                 uid — the claim, and the whole uniqueness rule
 * users/{uid}/username            the name as its owner typed it
 * friends/{uid}/{friendUid}       { username, since }
 * friendRequests/{uid}/{fromUid}  { username, at }   — incoming, unanswered
 * invites/{uid}/{fromUid}         { username, roomId, code, subunitId, at }
 * ```
 *
 * Each of those is keyed by the *reader*: your friends, your requests, your
 * invites. Read permission in this database cascades downward, so a node laid
 * out any other way — one list of every friendship, say — would be readable in
 * full by anyone allowed to read one row of it.
 */

export type Friend = { uid: string; username: string; since: number };
export type FriendRequest = { uid: string; username: string; at: number };
export type Invite = {
  /** Who sent it. Also the key, so a friend can only have one live invite out. */
  uid: string;
  username: string;
  roomId: string;
  code: string;
  subunitId: string;
  at: number;
};

/** Who you are, as everything below needs to know it. */
export type Me = { uid: string; username: string };

// ─── Usernames ───────────────────────────────────────────

export function watchUsername(uid: string, cb: (username: string | null) => void) {
  return onValue(ref(realtimeDb, `users/${uid}/username`), (snap) => {
    const value = snap.val();
    cb(typeof value === "string" && value ? value : null);
  });
}

export type ClaimResult =
  | { ok: true; username: string }
  | { ok: false; problem: string };

/**
 * Claims a username, or says why it could not be claimed.
 *
 * The write *is* the claim. Reading the index first and writing if the name
 * looked free is a race that two people signing up at once can both win; the
 * rules refuse a second write to a key that already exists, so losing the race
 * comes back as a permission error rather than as a stolen name.
 *
 * The index is written before the profile, in that order on purpose: a claim
 * with no profile behind it is a name held by its rightful owner, while a
 * profile with no claim behind it is a name two people believe they own.
 */
export async function claimUsername(
  uid: string,
  raw: string,
): Promise<ClaimResult> {
  const checked = checkUsername(raw);
  if (!checked.ok) return { ok: false, problem: checked.problem };

  try {
    await set(ref(realtimeDb, `usernames/${checked.key}`), uid);
  } catch {
    // Either somebody else holds it, or this is the same person claiming the
    // name they already have — which happens whenever a profile write failed
    // the first time round, and must not be reported as a collision.
    const owner = await get(ref(realtimeDb, `usernames/${checked.key}`)).catch(
      () => null,
    );
    if (owner?.val() !== uid) {
      return { ok: false, problem: "That username is taken. Try another." };
    }
  }

  await update(ref(realtimeDb, `users/${uid}`), {
    username: checked.username,
    usernameKey: checked.key,
  });

  return { ok: true, username: checked.username };
}

/** The index, read the way it is meant to be read: one name, one lookup. */
export async function findByUsername(
  raw: string,
): Promise<{ uid: string; username: string } | null> {
  const key = usernameKey(raw);
  if (!key) return null;

  const snap = await get(ref(realtimeDb, `usernames/${key}`));
  const uid = snap.val();
  if (typeof uid !== "string" || !uid) return null;

  const name = await get(ref(realtimeDb, `users/${uid}/username`));
  return { uid, username: (name.val() as string) ?? raw.trim() };
}

// ─── Friends ─────────────────────────────────────────────

/** Rows of `{username, …}` keyed by uid, as a list sorted by name. */
function roster<T extends { username: string }>(
  raw: Record<string, T> | null,
): (T & { uid: string })[] {
  return Object.entries(raw ?? {})
    .map(([uid, value]) => ({ ...value, uid }))
    .filter((row) => typeof row.username === "string")
    .sort((a, b) => a.username.localeCompare(b.username));
}

export function watchFriends(uid: string, cb: (friends: Friend[]) => void) {
  return onValue(ref(realtimeDb, `friends/${uid}`), (snap) => {
    cb(roster<{ username: string; since: number }>(snap.val()));
  });
}

export function watchFriendRequests(
  uid: string,
  cb: (requests: FriendRequest[]) => void,
) {
  return onValue(ref(realtimeDb, `friendRequests/${uid}`), (snap) => {
    cb(roster<{ username: string; at: number }>(snap.val()));
  });
}

export type RequestResult = { ok: true } | { ok: false; problem: string };

/**
 * Asks somebody to be a friend, by the name they are known by.
 *
 * Everything that could go wrong here is somebody's typo, so each one comes
 * back as a sentence rather than an exception: no such name, your own name,
 * somebody you have already added.
 */
export async function requestFriend(
  me: Me,
  rawUsername: string,
): Promise<RequestResult> {
  const found = await findByUsername(rawUsername);
  if (!found) return { ok: false, problem: "No player by that name." };
  if (found.uid === me.uid) return { ok: false, problem: "That's you." };

  const already = await get(ref(realtimeDb, `friends/${me.uid}/${found.uid}`));
  if (already.exists()) {
    return { ok: false, problem: `${found.username} is already a friend.` };
  }

  // If they asked you first, answer that instead of filing a second request
  // pointing the other way — two people who each asked once are two people who
  // agreed, and should not both be left waiting.
  const theirs = await get(
    ref(realtimeDb, `friendRequests/${me.uid}/${found.uid}`),
  );
  if (theirs.exists()) {
    await acceptFriend(me, { uid: found.uid, username: found.username });
    return { ok: true };
  }

  await set(ref(realtimeDb, `friendRequests/${found.uid}/${me.uid}`), {
    username: me.username,
    at: serverTimestamp(),
  });

  return { ok: true };
}

/**
 * Accepts a request, which is what writes the friendship on both sides.
 *
 * Your side first: the rules let you into their list only while their request
 * to you is still standing, so the request is cleared last. Do it the other way
 * round and a failure halfway through leaves you unable to finish.
 */
export async function acceptFriend(me: Me, them: Me) {
  await set(ref(realtimeDb, `friends/${me.uid}/${them.uid}`), {
    username: them.username,
    since: serverTimestamp(),
  });
  await set(ref(realtimeDb, `friends/${them.uid}/${me.uid}`), {
    username: me.username,
    since: serverTimestamp(),
  });
  await remove(ref(realtimeDb, `friendRequests/${me.uid}/${them.uid}`));
}

export async function declineFriend(uid: string, fromUid: string) {
  await remove(ref(realtimeDb, `friendRequests/${uid}/${fromUid}`));
}

/** Ends it from both sides. Half a friendship is a list nobody can clear. */
export async function removeFriend(uid: string, otherUid: string) {
  await remove(ref(realtimeDb, `friends/${uid}/${otherUid}`));
  await remove(ref(realtimeDb, `friends/${otherUid}/${uid}`));
  await remove(ref(realtimeDb, `invites/${uid}/${otherUid}`));
}

// ─── Invitations ─────────────────────────────────────────

export function watchInvites(uid: string, cb: (invites: Invite[]) => void) {
  return onValue(ref(realtimeDb, `invites/${uid}`), (snap) => {
    const rows = roster<Omit<Invite, "uid">>(snap.val());
    cb(rows.filter((row) => row.roomId && row.code));
  });
}

/**
 * Sends a friend the room you are sitting in.
 *
 * The invitation carries the code rather than a seat: joining is still writing
 * your own seat and then reading the room, exactly as it is for somebody typing
 * the code in. An invitation is a shortcut through the typing, not a second way
 * into a room.
 *
 * Only a friend may be invited — the rules check the friendship rather than
 * trusting this call — so an invitation cannot be used to reach a stranger.
 */
export async function inviteFriend(
  me: Me,
  toUid: string,
  room: { roomId: string; code: string; subunitId: string },
) {
  await set(ref(realtimeDb, `invites/${toUid}/${me.uid}`), {
    username: me.username,
    roomId: room.roomId,
    code: room.code,
    subunitId: room.subunitId,
    at: serverTimestamp(),
  });
}

export async function dismissInvite(uid: string, fromUid: string) {
  await remove(ref(realtimeDb, `invites/${uid}/${fromUid}`));
}

/** Where an invitation leads: the game, with the code already in hand. */
export function inviteHref(invite: Invite): string {
  return `/play/room?s=${encodeURIComponent(invite.subunitId)}&join=${encodeURIComponent(invite.code)}`;
}
