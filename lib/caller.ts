import "server-only";

import type { NextRequest } from "next/server";
import { adminAuth } from "./firebase-admin";

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
 * A Firebase ID token is a short-lived JWT the client SDK already holds, and
 * it is signed by Google. Verifying the signature is what turns "the body says
 * this is uid X" into "this really is uid X", and only a service account can
 * do it — which is why this needs the Admin SDK and why the answer below is
 * different when there is not one.
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
 * `uid` is null in exactly one case: a development server with no service
 * account, where nothing can be verified and refusing everything would mean
 * `next dev` could not open a game. Callers must treat null as "unidentified
 * but let through", not as a uid.
 */
export type Caller =
  | { ok: true; uid: string | null }
  | { ok: false; response: Response };

/** How long a verified token is good for is Firebase's business — an hour, in
 *  practice, and the client SDK refreshes it before then without being asked. */

/**
 * Verifies the bearer token on a request and returns the uid inside it.
 *
 * Revocation is deliberately not checked. `verifyIdToken` will ask Firebase
 * whether the token has been revoked if told to, and that is a network round
 * trip on every graded answer to close a window that is at most one token
 * lifetime wide, on an endpoint whose worst case is somebody playing a game as
 * themselves for another hour. The signature and the expiry are the checks
 * worth paying for here.
 */
export async function verifyCaller(req: NextRequest): Promise<Caller> {
  const auth = await adminAuth();

  // No service account. Nothing can be verified, so the only honest answers
  // are "refuse everything" and "check nobody", and which is right depends
  // entirely on where this is running.
  if (!auth) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed. A deployment that has lost its key is a deployment where
      // this check is not happening, and quietly serving everybody would be
      // exactly the hole this file was written to close. 503 rather than 401
      // because the caller's credentials are not the problem and telling them
      // to sign in again would be a lie they cannot act on.
      console.error(
        "[caller] No FIREBASE_SERVICE_ACCOUNT in production — ID tokens cannot " +
          "be verified, so /api/session and /api/answer are refusing every " +
          "request. Set the service-account key.",
      );
      return {
        ok: false,
        response: Response.json(
          { error: "The server can't verify sign-ins right now." },
          { status: 503 },
        ),
      };
    }

    console.warn(
      "[caller] No FIREBASE_SERVICE_ACCOUNT — ID tokens are not being verified " +
        "and every caller is treated as anonymous. Fine for `next dev`; this " +
        "would be a refusal in production.",
    );
    return { ok: true, uid: null };
  }

  const token = bearer(req);
  if (!token) return { ok: false, response: unauthorized("Sign in to play.") };

  try {
    const decoded = await auth.verifyIdToken(token);
    return { ok: true, uid: decoded.uid };
  } catch {
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
