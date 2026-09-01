import type { NextRequest } from "next/server";
import { getSubunit, type Question, type Subunit } from "@/lib/curriculum";
import { buildPool } from "@/lib/pool.server";
import { MAX_SUBUNITS } from "@/lib/selection";
import {
  createSession,
  mintAllowedForIp,
  mintAllowedForUser,
  sessionsAreShared,
} from "@/lib/session-store";
import { callerIp, verifyCaller } from "@/lib/caller";
import { hasSpatial } from "@/lib/templates";
import { hasGenerators } from "@/lib/templates.server";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 60;

/** How long a generated game runs, when nothing asks for a length. A bank has
 *  a natural size to default to; a generator does not. */
const GENERATED_LENGTH = 10;

/**
 * What each subunit past the first adds to a game nobody asked a length for.
 *
 * Picking four subunits mixes them; it does not stack four games end to end.
 * A few more questions is enough for every subunit to come round several
 * times, and the session still finishes in about the time the library
 * advertised.
 */
const EXTRA_PER_SUBUNIT = 3;

/**
 * Which backing the sessions are on, for the tile on the admin screen.
 *
 * Without a service account the store falls back to this process's memory,
 * which is right for `next dev` and wrong for anything running more than one
 * instance: a game opened on one and graded on another is graded by a server
 * that has never heard of the session, and the player gets a 404 halfway
 * through. That is a deployment that looks fine until it is under load, and
 * until now the only thing that said so was a line in the log.
 *
 * Not gated on admin, and it cannot be: verifying that somebody is one means
 * reading the database with a service account, which is the very thing that
 * may be missing. What it discloses is one bit about how this deployment is
 * configured, to somebody who could infer the same bit by playing a game on a
 * bad one — worth less than the deploy it catches.
 */
export function GET() {
  return Response.json({ shared: sessionsAreShared() });
}

/**
 * Opens a grading session and hands back the question order.
 *
 * The server owns the order so that grading can be keyed to a position rather
 * than a question id — a turn-based game that runs past the end of the bank
 * comes round to the same question at a new position, which is a new grading
 * rather than a replay of an old one.
 *
 * Signed-in players only. This used to take anybody's word for it and had no
 * way not to: it never asked who was calling, so a browser console on a
 * signed-out page could mint sessions all day. It asks now — see `caller.ts`.
 */
export async function POST(req: NextRequest) {
  const now = Date.now();

  // Three gates, and all of them before a single question is dealt. Filling
  // the pools runs generators, and that is not work worth doing for a caller
  // who is about to be turned away — the same reasoning `/api/answer` gives
  // for counting before it reads a session.
  //
  // Cheapest first, which is also safest first: the IP ceiling is a counter
  // and the token check is a signature verification, so the counter guards the
  // verification rather than the other way round. Nobody spends our CPU
  // without first getting past something that costs them nothing to fail.
  if (!(await mintAllowedForIp(callerIp(req), now))) {
    return Response.json(
      { error: "Too many sessions. Wait a minute." },
      { status: 429 },
    );
  }

  const caller = await verifyCaller(req);
  if (!caller.ok) return caller.response;

  // A uid of null is a dev server with no service account, where there is
  // nothing to verify a token against and the ceiling above is the only limit
  // there is. In production that case is a refusal, not a null.
  if (caller.uid && !(await mintAllowedForUser(caller.uid, now))) {
    return Response.json(
      { error: "Too many sessions. Wait a minute." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { subunitIds: asked, length, spatial } = (body ?? {}) as {
    subunitIds?: unknown;
    length?: unknown;
    spatial?: unknown;
  };

  if (
    !Array.isArray(asked) ||
    asked.length === 0 ||
    !asked.every((id) => typeof id === "string")
  ) {
    return Response.json({ error: "Missing subunits." }, { status: 400 });
  }

  if (asked.length > MAX_SUBUNITS) {
    return Response.json(
      { error: `A session mixes at most ${MAX_SUBUNITS} subunits.` },
      { status: 400 },
    );
  }

  const subunitIds = [...new Set(asked as string[])];

  // A duel asks for placed answers only, because it is settled on which of
  // two answers was closer. Refused here as well as hidden in the library:
  // the library is a convenience, and this is the rule. Every subunit in the
  // mix has to pass it — one that cannot be settled would deal dead rounds.
  const placed = spatial === true;

  const subunits: Subunit[] = [];
  for (const id of subunitIds) {
    const subunit = getSubunit(id);
    if (!subunit || (subunit.questions.length === 0 && !hasGenerators(id))) {
      return Response.json({ error: "Unknown subunit." }, { status: 400 });
    }
    if (placed && !hasSpatial(id)) {
      return Response.json(
        { error: "Nothing here is answered on a grid." },
        { status: 400 },
      );
    }
    subunits.push(subunit);
  }

  const base = Math.max(
    ...subunits.map((s) => s.questions.length || GENERATED_LENGTH),
  );

  const want =
    typeof length === "number" && Number.isInteger(length) && length > 0
      ? Math.min(length, MAX_LENGTH)
      : Math.min(MAX_LENGTH, base + EXTRA_PER_SUBUNIT * (subunits.length - 1));

  // Each subunit fills its own pool and the game is dealt round-robin off the
  // fronts of them. Pooling everything and shuffling once would let a subunit
  // that mints freely crowd out one with a short bank; dealing in turn gives
  // every subunit picked its share, which is the point of picking several.
  //
  // A pool is not always all its own: a subunit with too few generators to
  // fill a session without repeating itself borrows from its neighbours in the
  // same unit. See `pool.server.ts` — including why the session still reports
  // the subunit that was picked.
  const pools = subunits.map((s) => buildPool(s, want, placed));
  const questions: Question[] = [];

  for (let round = 0; questions.length < want; round++) {
    let dealt = false;
    for (const pool of pools) {
      if (round >= pool.length) continue;
      questions.push(pool[round]);
      dealt = true;
      if (questions.length === want) break;
    }
    if (!dealt) break;
  }

  const order = questions.map((q) => q.id);

  const session = await createSession(subunitIds, order, now);

  // The question text goes out with the order. A bank question could still be
  // looked up locally, but a generated one exists nowhere else, so every game
  // takes its questions from here and the two kinds stay interchangeable.
  return Response.json({ sessionId: session.id, order, questions });
}
