import "server-only";

import type { NextRequest } from "next/server";
import { adminProjectId } from "./firebase-admin";
import { KeySourceError, verifyIdToken } from "./id-token";

/**
 * Who is asking.
 *
 * `/api/session` and `/api/answer` took anybody's word for it until now. They
 * did not need to know who was calling, so they did not ask, and the answer
 * was that anybody could call them: a browser console on a signed-out page
 * could mint sessions and grade against them all day. Neither the session
 * mechanism nor the one-claim-per-position rule says anything about identity —
 * they say a position is graded once, not that the person grading it is a
 * player. So identity has to come from somewhere else, and this is it.
 *
 * A Firebase ID token is a short-lived JWT the client SDK already holds,
 * signed by Google. Checking that signature is what turns "the body says this
 * is uid X" into "this really is uid X". `id-token.ts` does the checking, and
 * has the long story about why it does not use the Admin SDK to do it.
 *
 * The uid is worth having for its own sake and also as a rate-limiting key
 * that means something: an IP is a building, and a uid is a person. See
 * `session-store.ts`.
 */

/**
 * The result of asking. Either there is a caller to go on with, or there is a
 * response to send back instead — never both, and never a uid that was not
 * checked.
 *
 * `uid` is null in exactly one case: a development server that cannot name the
 * Firebase project, where nothing can be checked and refusing everything would
 * mean `next dev` could not open a game. Callers must treat null as
 * "unidentified but let through", not as a uid.
 */
export type Caller =
  | { ok: true; uid: string | null }
  | { ok: false; response: Response };

/**
 * Verifies the bearer token on a request and returns the uid inside it.
 *
 * Three outcomes, and they are deliberately not collapsed. A caller with no
 * usable token is refused with 401, which tells a client to sign in again and
 * is something it can act on. A failure on our side — keys we could not fetch,
 * a project we cannot name — is refused with 503, because telling somebody
 * their sign-in expired when the truth is that we could not reach Google is a
 * lie they would act on by signing in again, pointlessly. And a verified token
 * yields a uid.
 *
 * Every path that is not a verified uid is a refusal. That is the fail-closed
 * property this whole file exists for: there is no branch here that lets an
 * unchecked caller through in production.
 */
export async function verifyCaller(req: NextRequest): Promise<Caller> {
  const projectId = adminProjectId();

  // No project id, so there is nothing to check a token against. The only
  // honest answers are "refuse everything" and "check nobody", and which is
  // right depends entirely on where this is running.
  if (!projectId) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[caller] No Firebase project id in production — ID tokens cannot be " +
          "checked, so /api/session and /api/answer are refusing every " +
          "request. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID.",
      );
      return { ok: false, response: unavailable() };
    }

    console.warn(
      "[caller] No Firebase project id — ID tokens are not being checked and " +
        "every caller is treated as anonymous. Fine for `next dev`; this " +
        "would be a refusal in production.",
    );
    return { ok: true, uid: null };
  }

  const token = bearer(req);
  if (!token) return { ok: false, response: unauthorized("Sign in to play.") };

  try {
    return { ok: true, uid: await verifyIdToken(token, projectId) };
  } catch (error) {
    if (error instanceof KeySourceError) {
      // Ours, not theirs. Refusing is still the right answer — this is the one
      // place where being unable to check must never mean letting through.
      console.error(`[caller] Cannot verify ID tokens: ${error.message}`);
      return { ok: false, response: unavailable() };
    }

    // Expired, malformed, signed by somebody else, or issued for another
    // project. The client cannot act differently on any of those, and saying
    // which would tell somebody probing exactly how their forgery fell short.
    return {
      ok: false,
      response: unauthorized("Your sign-in has expired. Sign in again."),
    };
  }
}

/**
 * The token out of an `Authorization: Bearer …` header.
 *
 * A header rather than the JSON body, so the same reading works on a request
 * with no body and so a token is never sat in a field beside game data that
 * gets logged. The scheme is matched case-insensitively because that is what
 * the spec says, whatever every client we have actually sends.
 */
function bearer(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;

  const [scheme, ...rest] = header.split(" ");
  if (scheme.toLowerCase() !== "bearer") return null;

  const token = rest.join(" ").trim();
  return token || null;
}

/**
 * The address a request came from, as far as the proxy in front of us will say.
 *
 * `x-forwarded-for` is a list each proxy appends to, so the first entry is the
 * original client — and, being a header, is trivially forged by anyone talking
 * to this server directly. That is tolerable for the one thing it keys: a
 * ceiling on traffic that has not identified itself yet, where the alternative
 * is no ceiling at all. It is not tolerable as a statement about who somebody
 * is, which is why nothing else here reads it and why the uid above exists.
 */
export function callerIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

function unauthorized(error: string): Response {
  return Response.json({ error }, { status: 401 });
}

/** Our fault, not the caller's, and still a refusal. */
function unavailable(): Response {
  return Response.json(
    { error: "The server can't verify sign-ins right now." },
    { status: 503 },
  );
}
