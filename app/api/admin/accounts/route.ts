import type { NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isOwnerEmail } from "@/lib/owner";

export const dynamic = "force-dynamic";

/**
 * How many accounts there are. That is the whole of what this hands over.
 *
 * It used to hand over a row per account with the address beside it, joined on
 * from Firebase Auth with a service account — the one place an address still
 * lives, now that nothing copies one into the database. An admin screen does
 * not need to know who anybody is to know how a beta is going, and an address
 * that is never read cannot leak, so the join is gone: the rows are counted
 * here and what crosses to the browser is two integers.
 *
 * Counted on the server rather than in the browser for the same reason. The
 * rules let an admin read the whole of `users`, so a client could count them
 * itself — but that pulls every account into a page to arrive at a number,
 * which is collecting the thing this stopped collecting and then throwing it
 * away. The identities never leave this function.
 *
 * The admin check here is the same one the rules make — the owner by the
 * address on their token, or a row under `admins/{uid}`. The ID token is
 * verified rather than trusted: a uid in the body would be a claim, a signed
 * token is a fact.
 */

export async function GET(req: NextRequest) {
  const auth = await adminAuth();
  const db = adminDb();

  if (!auth || !db) {
    return Response.json(
      {
        error:
          "The server has no Firebase service account, so it cannot count the accounts. Set FIREBASE_SERVICE_ACCOUNT.",
      },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return Response.json({ error: "You are not signed in." }, { status: 401 });
  }

  let caller;
  try {
    caller = await auth.verifyIdToken(token);
  } catch {
    return Response.json(
      { error: "That sign-in is no longer valid. Sign in again." },
      { status: 401 },
    );
  }

  // Exactly what `database.rules.json` asks of a read of the `users` root.
  const granted =
    isOwnerEmail(caller.email) ||
    (await db.ref(`admins/${caller.uid}`).get()).exists();

  if (!granted) {
    return Response.json({ error: "This area is for admins." }, { status: 403 });
  }

  const snapshot = await db.ref("users").get();
  const rows = Object.values(
    (snapshot.val() ?? {}) as Record<string, { username?: unknown } | null>,
  );

  return Response.json({
    accounts: rows.length,
    // An account that has not claimed a name yet has not finished signing in,
    // which is worth telling apart from one that never came back.
    named: rows.filter((row) => typeof row?.username === "string").length,
  });
}
