/**
 * One-off: removes `users/{uid}/email` from every account that still has one.
 *
 * Sign-up used to mirror the address into the profile, and a profile is
 * readable by every signed-in player. The code that wrote it is gone and the
 * rules now refuse the field, but neither of those touches a row already
 * written — so this does, once.
 *
 * Run it with the service account set, from the repo root:
 *
 *   FIREBASE_SERVICE_ACCOUNT='...' npm run strip:emails
 *
 * It prints what it found first and writes nothing else. Deleting is not a
 * write of the field, so the `.validate: false` in the rules does not stand in
 * the way — and the Admin SDK bypasses the rules regardless.
 */

import { adminDb } from "../lib/firebase-admin";

/** RTDB takes a multi-location update as one atomic write; keep them modest. */
const CHUNK = 500;

async function main() {
  const db = adminDb();
  if (!db) {
    console.error(
      "No FIREBASE_SERVICE_ACCOUNT in the environment — there is nothing to " +
        "connect to. Set it and run again.",
    );
    process.exit(1);
  }

  const snapshot = await db.ref("users").get();
  const rows = (snapshot.val() ?? {}) as Record<
    string,
    { email?: unknown } | null
  >;

  const uids = Object.entries(rows)
    .filter(([, row]) => row != null && row.email !== undefined)
    .map(([uid]) => uid);

  console.log(`${Object.keys(rows).length} account(s) in users/.`);

  if (uids.length === 0) {
    console.log("None of them carries an email. Nothing to do.");
    return;
  }

  console.log(`${uids.length} still carries one. Removing.`);

  for (let at = 0; at < uids.length; at += CHUNK) {
    const batch = uids.slice(at, at + CHUNK);
    await db.ref("users").update(
      Object.fromEntries(batch.map((uid) => [`${uid}/email`, null])),
    );
    console.log(`  ${Math.min(at + batch.length, uids.length)} / ${uids.length}`);
  }

  console.log("Done. Firebase Auth still holds every address; the database does not.");
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
