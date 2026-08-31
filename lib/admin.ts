"use client";

import { useEffect, useState } from "react";
import { get, onValue, ref, remove, serverTimestamp, set } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { findByUsername } from "@/lib/social";
import { isOwnerEmail } from "@/lib/owner";
import {
  EMPTY_PROGRESS,
  dateKey,
  daysBetween,
  type Progress,
} from "@/lib/progression";
import type { SurveyRecord } from "@/lib/survey";

/**
 * Who may see the admin area, and how somebody else is let in.
 *
 * There are two ways to be an admin, and they are different on purpose:
 *
 *  - The **owner**, identified by email. This is the bootstrap. Admin is stored
 *    in the database, and a rule that only ever consults the database can never
 *    grant the first one — so exactly one address is written into the rules,
 *    and everybody else is granted by somebody who already has it.
 *  - A row in `admins/{uid}`, written by an admin.
 *
 * The check lives in `database.rules.json` as well as here. This decides what
 * the interface offers; the rules decide what the database will hand over, and
 * they are what actually protects the data. Editing the constant below without
 * editing the rules changes nothing that matters.
 */

/**
 * The owner's address, and the test for it, live in `owner.ts`: the admin
 * route needs the same test and a route handler cannot import a client module.
 * Re-exported here because this is where the rest of the app looks for it.
 */
export { OWNER_EMAIL, isOwnerEmail } from "@/lib/owner";

export type AdminEntry = {
  uid: string;
  username: string;
  /** Who granted it, by username. Kept so a roster can be read back later. */
  addedBy: string;
  at: number;
};

/**
 * Whether the signed-in player may see the admin area.
 *
 * Watched rather than read once, so being granted or losing admin takes effect
 * without a reload — and so the menu does not offer a door that has just been
 * closed. `loading` is held separately from `isAdmin` because "not an admin"
 * and "not known yet" must not render the same: the second would flash the
 * admin link away from somebody who has it.
 */
export function useAdmin() {
  const { user, loading: authLoading } = useAuth();

  // Stamped with the uid it belongs to rather than cleared when the user
  // changes, for the same reason the username is in `auth-context`: an effect
  // that clears state on the way out sets state during render, and a grant left
  // over from the previous account would otherwise be read as this one's.
  const [row, setRow] = useState<{ uid: string; granted: boolean } | null>(null);

  const owner = isOwnerEmail(user?.email);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    // Each player may read their own row and no other, so this is the whole of
    // what a non-admin can learn here. A read that fails is not an admin.
    return onValue(
      ref(realtimeDb, `admins/${uid}`),
      (snap) => setRow({ uid, granted: snap.exists() }),
      () => setRow({ uid, granted: false }),
    );
  }, [user]);

  const mine = user && row?.uid === user.uid ? row : null;

  return {
    isAdmin: owner || mine?.granted === true,
    isOwner: owner,
    // The owner is an admin by email alone, so they never wait on the read.
    loading: authLoading || (user !== null && mine === null && !owner),
  };
}

// ─── The roster ──────────────────────────────────────────

export function watchAdmins(cb: (admins: AdminEntry[]) => void) {
  return onValue(
    ref(realtimeDb, "admins"),
    (snap) => {
      const raw = (snap.val() ?? {}) as Record<string, Omit<AdminEntry, "uid">>;
      cb(
        Object.entries(raw)
          .map(([uid, row]) => ({ ...row, uid }))
          .sort((a, b) => (a.at ?? 0) - (b.at ?? 0)),
      );
    },
    () => cb([]),
  );
}

export type GrantResult = { ok: true; username: string } | { ok: false; problem: string };

/**
 * Grants admin to a player, found by the username they claimed.
 *
 * By username rather than by email, because a username is the only handle the
 * app asks anybody to remember, and it is already the index a player is looked
 * up through. Everything that can go wrong is somebody's typo, so each comes
 * back as a sentence rather than an exception.
 */
export async function addAdmin(
  by: { username: string },
  rawUsername: string,
): Promise<GrantResult> {
  const found = await findByUsername(rawUsername);
  if (!found) return { ok: false, problem: "No player by that name." };

  const already = await get(ref(realtimeDb, `admins/${found.uid}`));
  if (already.exists()) {
    return { ok: false, problem: `${found.username} is already an admin.` };
  }

  try {
    await set(ref(realtimeDb, `admins/${found.uid}`), {
      username: found.username,
      addedBy: by.username,
      at: serverTimestamp(),
    });
  } catch {
    return { ok: false, problem: "That write was refused. Are you still an admin?" };
  }

  return { ok: true, username: found.username };
}

/**
 * Takes admin away again. The rules allow this to the owner only, so an admin
 * who was let in cannot turn round and shut out the people who let them in. The
 * owner holds admin by email rather than by a row here, so there is no row to
 * remove and no way to lock the last person out.
 */
export async function removeAdmin(uid: string) {
  await remove(ref(realtimeDb, `admins/${uid}`));
}

// ─── What the admin area shows ───────────────────────────

/**
 * What the admin screen knows about the people using this: how many there are,
 * how many came back, and what they said when they were asked.
 *
 * Every one of these is a count. There is no list of accounts here and nothing
 * attached to an answer — the screen used to carry a row per player with the
 * address beside it, and the question it exists to answer, how is the beta
 * going, never needed to know who anybody is. So the rows are counted on the
 * way past and dropped, and the survey records arrive with the uid they were
 * filed under dropped too: what is kept is what was said, not who said it.
 *
 * None of the three below is new tracking. `played` and `lastPlayedDate` are
 * the two fields the streak in the top bar has always run on, and the tiles
 * are three readings of them.
 */
export type AdminData = {
  /** Accounts that exist, whether or not they ever answered anything. */
  accounts: number;
  named: number;
  /** Signed up and never finished a session. */
  neverPlayed: number;
  /** Came back for a second one, which is the number that means the most. */
  cameBack: number;
  /** Finished one in the last seven days. */
  activeThisWeek: number;
  /** The records that carry answers. Everything on the screen counts these. */
  answered: SurveyRecord[];
  skipped: number;
};

/** How recently a session has to have been played to count as this week. */
const RECENT_DAYS = 7;

/** One row of `users`, as much of it as any of this reads. */
type Row = { username?: unknown; progress?: Partial<Progress> } | null;

function countAccounts(rows: Row[]): Omit<AdminData, "answered" | "skipped"> {
  const today = dateKey(new Date());

  // Read defensively: the database drops a key whose value is null, and an
  // account made before a field existed simply lacks it.
  const progress = rows.map((row) => ({
    ...EMPTY_PROGRESS,
    ...(row?.progress ?? {}),
  }));

  return {
    accounts: rows.length,
    // An account with no name has not finished signing in, which is worth
    // telling apart from one that never came back.
    named: rows.filter((row) => typeof row?.username === "string").length,
    neverPlayed: progress.filter((p) => p.played === 0).length,
    cameBack: progress.filter((p) => p.played > 1).length,
    activeThisWeek: progress.filter(
      (p) =>
        p.lastPlayedDate && daysBetween(p.lastPlayedDate, today) < RECENT_DAYS,
    ).length,
  };
}

/**
 * Everything the admin screen reads, in two reads and no join.
 *
 * Both come from the database rather than from a server route. There was one,
 * for as long as this screen showed addresses: an address lives in Firebase
 * Auth and nowhere else, and only a service account may ask about somebody
 * else's. Nothing here asks any more — and the rules already let an admin read
 * both of these nodes — so all the route was left holding was a service-account
 * dependency standing between an admin and a handful of numbers, which on a
 * deployment without one answered "I cannot count the accounts" rather than
 * counting them.
 *
 * What arrives is counted and dropped in the same breath: `countAccounts`
 * returns integers and nothing else, and `Object.values` throws away the uid
 * each survey record was filed under. Neither the rows nor a uid is kept
 * anywhere the screen can reach, so the page shows exactly what it showed
 * before and nothing on it can be traced to an account.
 *
 * The two failures read the same way for a reason. Both mean the rules: a
 * refusal here is an account that has dropped off the admin roster, or rules
 * that were never deployed.
 */
export async function readAdminData(): Promise<AdminData> {
  const [usersSnap, surveySnap] = await Promise.all([
    get(ref(realtimeDb, "users")).catch(() => {
      throw new Error(
        "Couldn't read the accounts. Either this account is no longer an admin, or the rules in database.rules.json are not deployed.",
      );
    }),
    get(ref(realtimeDb, "surveys")).catch(() => {
      throw new Error(
        "Couldn't read the survey answers. The rules in database.rules.json may not be deployed.",
      );
    }),
  ]);

  const rows = Object.values((usersSnap.val() ?? {}) as Record<string, Row>);
  const surveys = Object.values(
    (surveySnap.val() ?? {}) as Record<string, SurveyRecord>,
  );

  return {
    ...countAccounts(rows),
    answered: surveys.filter((record) => record.answers),
    skipped: surveys.filter((record) => record.skipped).length,
  };
}
