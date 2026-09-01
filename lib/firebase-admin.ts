import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
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
 * There is no auth half, and there cannot be one here. `firebase-admin/auth`
 * reaches jwks-rsa, which `require`s jose, and jose is ES-only. This package
 * is on Next's list of those left unbundled, so that require runs inside
 * Turbopack's `externalImport` shim rather than Node's loader, and throws
 * ERR_REQUIRE_ESM in any deployed build whatever Node the host runs. It was
 * reinstated once behind a deferred import on the theory that Node 24 would
 * take it; production disagreed, on Node 24, with the same error.
 *
 * Checking an ID token turns out not to need a service account at all — only
 * Google's public keys and the project id below. See `id-token.ts`.
 *
 * Credentials come from a service-account key in the environment. Without one
 * these return null and the caller falls back to in-process memory, which is
 * correct for `next dev` and wrong for anything with more than one instance —
 * see `session-store.ts`.
 */

let cached: App | null | undefined;

/** Filled in by `connect` when there is a service account to read it from. */
let projectId: string | null = null;

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
 * The project id these credentials belong to.
 *
 * Wanted by `id-token.ts`, which checks that a token was issued for this
 * project and by Google on its behalf. Read off the service account when there
 * is one, because that is the authoritative answer, and off the environment
 * otherwise — verifying a token needs no credentials, so it should not be held
 * hostage to having them.
 *
 * Null means a project we cannot name, and a token cannot be checked against a
 * project we cannot name; the caller refuses. Naming the wrong one fails the
 * same way rather than the dangerous way — a mismatched issuer or audience
 * turns every token away instead of letting a foreign one through.
 */
export function adminProjectId(): string | null {
  // Runs connect() if it has not run yet, which is what fills projectId in.
  adminApp();

  return (
    projectId ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    null
  );
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

  projectId = credentials.projectId;

  // Next re-evaluates modules on HMR, and initializeApp twice throws.
  return getApps().length
    ? getApp()
    : initializeApp({ credential: cert(credentials), databaseURL });
}
