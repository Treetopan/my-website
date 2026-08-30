import type { NextRequest } from "next/server";
import { getSubunit, type Question, type Subunit } from "@/lib/curriculum";
import { MAX_SUBUNITS } from "@/lib/selection";
import { createSession, mintAllowed } from "@/lib/session-store";
import { hasSpatial, spatialGenerators } from "@/lib/templates";
import { hasGenerators, mintInstances } from "@/lib/templates.server";

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

/** Fisher–Yates. Server-side, so nothing about the order is predictable. */
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One subunit's questions, up to `want` of them.
 *
 * Generated questions are minted here rather than derived on the client,
 * because building the options means knowing the answer. The browser gets
 * finished questions and cannot tell them from bank ones.
 *
 * A bank is reshuffled each time it is exhausted, so a long game does not
 * repeat in the same order it just played. Never for a duel: a bank question
 * is answered by choosing, so topping up from one would fill a placed-answer
 * game with questions it cannot settle.
 */
function fill(subunit: Subunit, want: number, placed: boolean): Question[] {
  const out: Question[] = hasGenerators(subunit.id)
    ? mintInstances(
        subunit.id,
        want,
        placed ? spatialGenerators(subunit.id) : undefined,
      )
    : [];

  while (!placed && out.length < want && subunit.questions.length > 0) {
    out.push(...shuffle(subunit.questions));
  }

  out.length = Math.min(want, out.length);
  return out;
}

/**
 * Opens a grading session and hands back the question order.
 *
 * The server owns the order so that grading can be keyed to a position rather
 * than a question id — a turn-based game that runs past the end of the bank
 * comes round to the same question at a new position, which is a new grading
 * rather than a replay of an old one.
 */
export async function POST(req: NextRequest) {
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
  const pools = subunits.map((s) => fill(s, want, placed));
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

  const now = Date.now();
  const caller =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

  if (!(await mintAllowed(caller, now))) {
    return Response.json(
      { error: "Too many sessions. Wait a minute." },
      { status: 429 },
    );
  }

  const session = await createSession(subunitIds, order, now);

  // The question text goes out with the order. A bank question could still be
  // looked up locally, but a generated one exists nowhere else, so every game
  // takes its questions from here and the two kinds stay interchangeable.
  return Response.json({ sessionId: session.id, order, questions });
}
