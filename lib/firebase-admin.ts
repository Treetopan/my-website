import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import type { Database } from "firebase-admin/database";

/**
 * The Admin SDK, for the two things the client SDK cannot do: hold data the
 * browser must never read, and read a user record that is not your own.
 *
 * The web config in `firebase.ts` is public and authorises nothing — what
 * protects data there is `database.rules.json`. Grading sessions cannot be
 * protected that way. A session records which questions were served and which
 * positions have been graded, and the rules language has no way to say "the
 * server may write this and nobody may read it", because read permission
 * cascades downward and a signed-in user is still a user. The Admin SDK sits
 * outside the rules entirely, so `sessions/` can be denied to everyone in the
 * rules and still be readable here.
 *
 * The auth half is what the admin screen runs on. Emails are not kept in the
 * database — see `account.ts` — so listing them means asking Firebase Auth,
 * and only a service account may ask about somebody else's.
 *
 * Credentials come from a service-account key in the environment. Without one
 * these return null and the caller falls back to in-process memory, which is
 * correct for `next dev` and wrong for anything with more than one instance —
 * see `session-store.ts`.
 */

let cached: App | null | undefined;

/** The Admin app, or null when no service account is configured. */
function adminApp(): App | null {
  if (cached !== undefined) return cached;
  cached = connect();
  return cached;
}

/** The Admin database, or null when no service account is configured. */
export function adminDb(): Database | null {
  const app = adminApp();
  return app ? getDatabase(app) : null;
}

/**
 * Firebase Auth as the server sees it, or null for the same reason.
 *
 * The import is deferred rather than written at the top of this file, and that
 * is load-bearing rather than tidiness. `firebase-admin/auth` reaches
 * jwks-rsa, which reaches jose; jose ships ES modules only, and jwks-rsa still
 * `require`s it, so loading that chain is only safe on a runtime that can
 * require an ES module — Node has done so since 22.12, and it throws
 * ERR_REQUIRE_ESM before that.
 *
 * `firebase-admin` is on Next's default list of packages left unbundled, so
 * none of that is settled during the build; it is a real import on the server
 * at request time. A top-level import here would therefore put the chain in
 * the graph of every route that touches a session, and only the admin screen
 * ever reads a user record. Deferring it keeps the game endpoints off the
 * chain, so they cannot fail over a dependency they never call.
 */
export async function adminAuth(): Promise<Auth | null> {
  const app = adminApp();
  if (!app) return null;

  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(app);
}

function connect(): App | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ??
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    "https://game-learning-platform-default-rtdb.firebaseio.com";

  if (!raw) return null;

  let credentials: { projectId: string; clientEmail: string; privateKey: string };
  try {
    // Accepts the service-account JSON either raw or base64-encoded, because
    // hosting dashboards differ on whether a multi-line value survives paste.
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);

    credentials = {
      projectId: parsed.project_id ?? parsed.projectId,
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      // Escaped newlines are what you get when the key is pasted into a
      // single-line env var, which is the usual way it arrives.
      privateKey: (parsed.private_key ?? parsed.privateKey ?? "").replace(
        /\\n/g,
        "\n",
      ),
    };
  } catch {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON or base64 JSON. " +
        "Falling back to in-memory sessions.",
    );
    return null;
  }

  if (!credentials.projectId || !credentials.clientEmail || !credentials.privateKey) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key. " +
        "Falling back to in-memory sessions.",
    );
    return null;
  }

  // Next re-evaluates modules on HMR, and initializeApp twice throws.
  return getApps().length
    ? getApp()
    : initializeApp({ credential: cert(credentials), databaseURL });
}
