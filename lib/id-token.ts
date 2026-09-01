import "server-only";

import { decodeProtectedHeader, importX509, jwtVerify } from "jose";
import type { CryptoKey } from "jose";

/**
 * Verifying a Firebase ID token, without the Admin SDK's Auth half.
 *
 * `firebase-admin/auth` is not usable in this deployment and no runtime
 * setting makes it so. It reaches jwks-rsa, which `require`s jose, and jose is
 * ES-only; `firebase-admin` is on Next's list of packages left unbundled, so
 * that require happens inside Turbopack's `externalImport` shim rather than in
 * Node's CJS loader — and that path throws ERR_REQUIRE_ESM whatever Node the
 * host is running. It was tried on Node 24 and threw exactly as it did before.
 *
 * The load-bearing detail for anyone tempted to try again: this never
 * reproduces locally. `next dev` resolves externals a different way and never
 * builds the `[externals]_firebase-admin_auth_*` chunk the failure lives in, so
 * a local run is green while production 500s. Local green is not evidence here.
 * Only a deployed build is.
 *
 * So the token is verified directly against Google's signing keys. jose is the
 * same library underneath, imported rather than required, which is the whole
 * of the difference — it is a direct dependency now and gets bundled, so
 * nothing externalises it and nothing requires it.
 *
 * What `verifyIdToken` actually enforces, and what is reproduced below:
 * an RS256 signature by one of Google's current securetoken keys, an issuer of
 * `https://securetoken.google.com/<projectId>`, an audience of `<projectId>`,
 * an expiry in the future, and a non-empty subject, which is the uid.
 *
 * What is deliberately not reproduced is the revocation check, for the reason
 * it was never wanted: a network round trip on every graded answer to close a
 * window one token lifetime wide is the wrong trade.
 */

/** Google's public keys for Firebase ID tokens, as X.509 certificates by kid. */
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/** Used when the response says nothing about how long its keys are good for. */
const FALLBACK_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * The soonest an unknown `kid` may trigger a refetch.
 *
 * A token names the key that signed it, and a name we do not hold is normally
 * a rotation — worth one fetch. It is also free for anyone to make up, so
 * without a floor a stream of invented kids becomes a stream of requests to
 * Google made on our behalf. Rotations are hours apart; a minute costs a
 * genuine one nothing.
 */
const REFETCH_FLOOR_MS = 60_000;

/**
 * Something is wrong with us, not with the token.
 *
 * Kept separate because the two want opposite answers: a bad token is the
 * caller's problem and gets 401, while keys we cannot fetch are ours and must
 * refuse rather than admit. Telling a player their sign-in expired when the
 * truth is that we could not reach Google would be a lie they cannot act on.
 */
export class KeySourceError extends Error {}

type Bundle = {
  /** kid → certificate, as fetched. */
  pems: Record<string, string>;
  /** kid → the same certificate imported, because importing is not free and
   *  this is the hot path of every graded answer. */
  keys: Map<string, CryptoKey>;
  /** When `Cache-Control` says these stop being fresh. */
  expiresAt: number;
  fetchedAt: number;
};

let bundle: Bundle | null = null;

/** In-flight fetch, so a burst of requests arriving on a cold instance asks
 *  Google once rather than once each. */
let inflight: Promise<Bundle> | null = null;

async function fetchBundle(now: number): Promise<Bundle> {
  let res: globalThis.Response;
  try {
    // `no-store` because the freshness of these is managed here, by the
    // max-age Google sends, rather than by Next's data cache.
    res = await fetch(CERTS_URL, { cache: "no-store" });
  } catch (cause) {
    throw new KeySourceError("Could not reach Google's key endpoint.", {
      cause,
    });
  }

  if (!res.ok) {
    throw new KeySourceError(`Google's key endpoint answered ${res.status}.`);
  }

  const pems = (await res.json()) as Record<string, string>;
  if (!pems || typeof pems !== "object" || Object.keys(pems).length === 0) {
    throw new KeySourceError("Google's key endpoint returned no keys.");
  }

  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "");

  bundle = {
    pems,
    keys: new Map(),
    fetchedAt: now,
    expiresAt: now + (maxAge ? Number(maxAge[1]) * 1000 : FALLBACK_MAX_AGE_MS),
  };
  return bundle;
}

/**
 * The current keys, fetched if what we hold has gone stale.
 *
 * A failed refresh falls back to keys we already have rather than refusing.
 * They are public keys and the signature still has to pass against them, so
 * the worst case is accepting a token signed by a key Google has since retired
 * — retired is not compromised, and the alternative is that every game in
 * progress stops because a cache refresh picked a bad moment.
 */
async function current(now: number): Promise<Bundle> {
  if (bundle && now < bundle.expiresAt) return bundle;
  if (inflight) return inflight;

  const held = bundle;
  inflight = fetchBundle(now).finally(() => {
    inflight = null;
  });

  try {
    return await inflight;
  } catch (error) {
    if (held) {
      console.warn(
        "[id-token] Could not refresh Google's signing keys; carrying on with " +
          `the ones already held. ${(error as Error).message}`,
      );
      return held;
    }
    throw error;
  }
}

/** The certificate for a kid, imported once and kept. */
async function keyFor(held: Bundle, kid: string): Promise<CryptoKey | null> {
  const cached = held.keys.get(kid);
  if (cached) return cached;

  const pem = held.pems[kid];
  if (!pem) return null;

  const key = await importX509(pem, "RS256");
  held.keys.set(kid, key);
  return key;
}

/**
 * Checks a Firebase ID token and returns the uid inside it.
 *
 * Throws `KeySourceError` when the failure is ours, and a plain error when the
 * token is simply not good — expired, forged, or issued for another project.
 * The caller owes those two different answers.
 */
export async function verifyIdToken(
  token: string,
  projectId: string,
  now = Date.now(),
): Promise<string> {
  // Pinned rather than taken from the token. An unpinned algorithm is how a
  // verifier gets talked into checking a signature the attacker chose the
  // rules for, and Firebase only ever signs these one way.
  const header = decodeProtectedHeader(token);
  if (header.alg !== "RS256") throw new Error("Unexpected token algorithm.");
  if (!header.kid) throw new Error("Token names no signing key.");

  let held = await current(now);
  let key = await keyFor(held, header.kid);

  // A kid we do not hold is usually a rotation we have not noticed yet, so it
  // is worth one look — but no more often than the floor allows.
  if (!key && now - held.fetchedAt > REFETCH_FLOOR_MS) {
    held = await current(held.expiresAt);
    key = await keyFor(held, header.kid);
  }

  if (!key) throw new Error("Token signed by an unknown key.");

  const { payload } = await jwtVerify(token, key, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    currentDate: new Date(now),
  });

  // Everything above is jose's; the subject is ours to insist on. Firebase
  // puts the uid here, and a token without one identifies nobody even though
  // it verified.
  const uid = payload.sub;
  if (typeof uid !== "string" || !uid || uid.length > 128) {
    throw new Error("Token carries no usable subject.");
  }

  return uid;
}
