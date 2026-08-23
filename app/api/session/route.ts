import type { NextRequest } from "next/server";
import { getSubunit, type Question } from "@/lib/curriculum";
import { createSession, mintAllowed } from "@/lib/session-store";
import { hasGenerators, mintInstances } from "@/lib/templates.server";

export const dynamic = "force-dynamic";

const MAX_LENGTH = 60;

/** How long a generated game runs, when nothing asks for a length. A bank has
 *  a natural size to default to; a generator does not. */
const GENERATED_LENGTH = 10;

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

  const { subunitId, length } = (body ?? {}) as {
    subunitId?: unknown;
    length?: unknown;
  };

  if (typeof subunitId !== "string") {
    return Response.json({ error: "Missing subunit." }, { status: 400 });
  }

  const subunit = getSubunit(subunitId);
  const generated = hasGenerators(subunitId);

  if (!subunit || (subunit.questions.length === 0 && !generated)) {
    return Response.json({ error: "Unknown subunit." }, { status: 400 });
  }

  const want =
    typeof length === "number" && Number.isInteger(length) && length > 0
      ? Math.min(length, MAX_LENGTH)
      : subunit.questions.length || GENERATED_LENGTH;

  // Generated questions are minted here rather than derived on the client,
  // because building the options means knowing the answer. The browser gets
  // finished questions and cannot tell them from bank ones.
  const questions: Question[] = generated ? mintInstances(subunitId, want) : [];

  // Reshuffle each time the bank is exhausted, so a long game does not repeat
  // in the same order it just played. Minted questions are already unique and
  // already in a random order, so they only need topping up.
  while (questions.length < want && subunit.questions.length > 0) {
    questions.push(...shuffle(subunit.questions));
  }
  questions.length = Math.min(want, questions.length);

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

  const session = await createSession(subunitId, order, now);

  // The question text goes out with the order. A bank question could still be
  // looked up locally, but a generated one exists nowhere else, so every game
  // takes its questions from here and the two kinds stay interchangeable.
  return Response.json({ sessionId: session.id, order, questions });
}
