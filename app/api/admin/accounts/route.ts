import type { NextRequest } from "next/server";
import type { Auth } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isOwnerEmail } from "@/lib/owner";
import { EMPTY_PROGRESS, type Progress } from "@/lib/progression";
import type { Account } from "@/lib/account";

export const dynamic = "force-dynamic";

/**
 * The account list the admin screen shows, emails included.
 *
 * Emails used to be mirrored into `users/{uid}` and read straight off it. That
 * node is readable by every signed-in player — it is what lets a room show a
 * name — and `usernames` maps a name to a uid, so between the two, any account
 * that signed up could walk the whole app and read everybody's address. The
 * audience is school students; that had to go.
 *
 * So the address lives in exactly one place, which is where it already lived:
 * Firebase Auth. Only a service account may ask about somebody else's, which
 * makes this a server's job rather than the browser's.
 *
 * The admin check here is the same one the rules make — the owner by the
 * address on their token, or a row under `admins/{uid}` — because this route
 * hands over more than the rules would and must not be the softer of the two.
 * The ID token is verified rather than trusted: a uid in the body would be a
 * claim, a signed token is a fact.
 *
 * The accounts themselves are read with the Admin SDK rather than passed up
 * from the client, so there is one answer to "who exists" and it is the
 * server's. `toAccount` is duplicated from `account.ts` in miniature rather
 * than imported: that module is a client module, and a route handler that
 * imports one gets a reference to it, not the function.
 */

/** An account as this screen needs it: the row, plus the address beside it. */
type WithEmail = Account & { email: string | null };

/** Firebase Auth's page size for `listUsers`, and its maximum. */
const PAGE = 1000;

export async function GET(req: NextRequest) {
  const auth = await adminAuth();
  const db = adminDb();

  if (!auth || !db) {
    return Response.json(
      {
        error:
          "The server has no Firebase service account, so it cannot read emails. Set FIREBASE_SERVICE_ACCOUNT.",
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

  const [snapshot, emails] = await Promise.all([db.ref("users").get(), all(auth)]);
  const raw = (snapshot.val() ?? {}) as Record<string, unknown>;

  const accounts: WithEmail[] = Object.entries(raw)
    .map(([uid, row]) => toAccount(uid, row, emails.get(uid) ?? null))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return Response.json({ accounts });
}

/**
 * Every account's address, keyed by uid.
 *
 * Paged, because `listUsers` caps a page at a thousand and a beta that outgrows
 * that should keep working rather than quietly showing the first thousand.
 */
async function all(auth: Auth): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();

  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(PAGE, pageToken);
    for (const user of page.users) out.set(user.uid, user.email ?? null);
    pageToken = page.pageToken;
  } while (pageToken);

  return out;
}

/**
 * The database drops keys whose value is null and an account created before a
 * field existed simply lacks it, so every field is read defensively rather than
 * trusted — a missing `progress` is an empty one, not a crash.
 */
function toAccount(uid: string, raw: unknown, email: string | null): WithEmail {
  const row = (raw ?? {}) as Record<string, unknown>;
  return {
    uid,
    username: typeof row.username === "string" ? row.username : null,
    email,
    createdAt: typeof row.createdAt === "number" ? row.createdAt : null,
    progress: {
      ...EMPTY_PROGRESS,
      ...((row.progress ?? {}) as Partial<Progress>),
    },
  };
}
