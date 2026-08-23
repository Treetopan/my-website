import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import type { Database } from "firebase-admin/database";

/**
 * The Admin SDK, for the one thing the client SDK cannot do: hold data the
 * browser must never read.
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
 * Credentials come from a service-account key in the environment. Without one
 * this returns null and the caller falls back to in-process memory, which is
 * correct for `next dev` and wrong for anything with more than one instance —
 * see `session-store.ts`.
 */

let cached: Database | null | undefined;

/** The Admin database, or null when no service account is configured. */
export function adminDb(): Database | null {
  if (cached !== undefined) return cached;
  cached = connect();
  return cached;
}

function connect(): Database | null {
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
  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(credentials), databaseURL });

  return getDatabase(app);
}
