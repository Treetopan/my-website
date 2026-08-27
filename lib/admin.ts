"use client";

import { useEffect, useState } from "react";
import { get, onValue, ref, remove, serverTimestamp, set } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { findByUsername } from "@/lib/social";
import { readAccounts, type Account } from "@/lib/account";
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
 * The one address that is an admin without being granted it.
 *
 * Verification is deliberately not required. Firebase Auth will not issue two
 * accounts for one address, so this address can only ever belong to whoever
 * registered it first — and requiring a verified email would lock the owner out
 * of their own admin area until they had clicked a link that email/password
 * sign-up never sends.
 */
export const OWNER_EMAIL = "alexleyvalp@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}

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

/** One account, with whatever it answered attached. */
export type AdminRow = Account & { survey: SurveyRecord | null };

export type AdminData = {
  rows: AdminRow[];
  /** Accounts that exist, whether or not they ever answered anything. */
  accounts: number;
  named: number;
  answered: number;
  skipped: number;
};

/**
 * Everything the admin screen reads, in one pass.
 *
 * Two reads and a join rather than one denormalised node: the survey is kept
 * out of the profile because a profile is readable by every signed-in player,
 * and copying answers into it to save a read here would undo exactly that.
 */
export async function readAdminData(): Promise<AdminData> {
  const [accounts, surveySnap] = await Promise.all([
    readAccounts(),
    get(ref(realtimeDb, "surveys")),
  ]);

  const surveys = (surveySnap.val() ?? {}) as Record<string, SurveyRecord>;

  const rows: AdminRow[] = accounts.map((account) => ({
    ...account,
    survey: surveys[account.uid] ?? null,
  }));

  return {
    rows,
    accounts: rows.length,
    named: rows.filter((row) => row.username).length,
    answered: rows.filter((row) => row.survey?.answers).length,
    skipped: rows.filter((row) => row.survey?.skipped).length,
  };
}
