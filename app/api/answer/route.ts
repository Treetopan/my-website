import type { NextRequest } from "next/server";
import { getSubunit, type Question } from "@/lib/curriculum";
import { answerFor } from "@/lib/answers.server";
import { claimPosition, getSession } from "@/lib/session-store";
import { resolveInstance } from "@/lib/templates.server";
import { botResponse, grade, type Answer } from "@/lib/grading.server";
import {
  PASS,
  parseResponse,
  type Response as Answered,
  type Reveal,
} from "@/lib/questions";

export const dynamic = "force-dynamic";

/** More seats than any room has, so a malformed table cannot become a loop. */
const MAX_SEATS = 8;

/**
 * Grades one position in a session, once.
 *
 * A blank response means the clock ran out. It still consumes that position's
 * single grading — otherwise "submit nothing and read the answer" would be a
 * free oracle, which is the thing this endpoint exists to prevent.
 *
 * The verdict carries a score rather than just a verdict. Two of the question
 * kinds are graded by proximity, so "wrong" is not one thing: a point placed a
 * unit off and a point placed in the wrong quadrant are different answers and
 * the response says so.
 *
 * Two shapes go in. One response is one player answering their own turn. A
 * `table` of them is a mirror duel, where everybody answered the same question
 * at the same time and the position has to produce a verdict each — still on
 * one claim, because it is still one question being graded once. Splitting it
 * into a request per player would mean the second player's grading is a second
 * look at a position that has already been revealed, which is exactly what the
 * claim exists to refuse.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { sessionId, position, response, bot, table } = (body ?? {}) as {
    sessionId?: unknown;
    position?: unknown;
    response?: unknown;
    bot?: unknown;
    table?: unknown;
  };

  if (typeof sessionId !== "string" || !Number.isInteger(position)) {
    return Response.json(
      { error: "Missing session or position." },
      { status: 400 },
    );
  }

  const at = position as number;

  const seats = table === undefined ? null : parseTable(table);
  if (table !== undefined && !seats) {
    return Response.json({ error: "Invalid table." }, { status: 400 });
  }

  const botAccuracy =
    typeof bot === "number" && bot >= 0 && bot <= 1 ? bot : null;
  const answered = parseResponse(response);

  if (!seats && !answered && botAccuracy === null) {
    return Response.json({ error: "Invalid response." }, { status: 400 });
  }

  const session = await getSession(sessionId, Date.now());
  if (!session) {
    return Response.json(
      { error: "Session expired. Start the game again." },
      { status: 404 },
    );
  }

  if (at < 0 || at >= session.order.length) {
    return Response.json({ error: "No such question." }, { status: 400 });
  }

  const found = resolve(session.subunitId, session.order[at]);
  if (!found) {
    return Response.json({ error: "No answer on file." }, { status: 500 });
  }
  const { question, answer } = found;

  // Claimed only once there is definitely a verdict to give, so a question that
  // fails to resolve does not silently burn the player's single attempt at it.
  // The claim is atomic: two requests racing for the same position cannot both
  // win it, which is the guarantee the whole session mechanism exists for.
  if (!(await claimPosition(sessionId, at))) {
    return Response.json({ error: "Already answered." }, { status: 409 });
  }

  // ── A whole table at once: the duel ──────────────────
  //
  // The host sends this, having read every player's answer back out of the
  // write-once node they each wrote it to. That the host assembles it is the
  // same trust already placed in a host that resolves rounds — and a host who
  // called this early to peek would burn the position and break the round for
  // themselves, which is a poor way to cheat.
  if (seats) {
    const results: Record<string, Graded> = {};
    let reveal: Reveal | null = null;

    for (const seat of seats) {
      const submitted =
        seat.bot !== null
          ? botResponse(answer, question, seat.bot)
          : (seat.response as Answered);

      const verdict = grade(answer, submitted);
      reveal = verdict.reveal;
      results[seat.uid] = {
        score: verdict.score,
        correct: verdict.correct,
        response: submitted,
      };
    }

    return Response.json({ results, reveal, pass: PASS });
  }

  // ── One player, one turn ─────────────────────────────
  //
  // A bot's turn is rolled here rather than on the host's machine, because
  // producing a plausible wrong answer requires knowing the right one.
  const submitted =
    botAccuracy !== null
      ? botResponse(answer, question, botAccuracy)
      : (answered as Answered);

  const { score, correct, reveal } = grade(answer, submitted);

  return Response.json({
    score,
    correct,
    reveal,
    response: submitted,
    /** The bar a score has to clear to count as right, so the UI can say so. */
    pass: PASS,
  });
}

type Graded = { score: number; correct: boolean; response: Answered };

type Seat = { uid: string; response: Answered | null; bot: number | null };

/**
 * Reads a duel's table of answers out of the request.
 *
 * Every seat needs either a response or a bot accuracy, and no seat may
 * appear twice — a repeated uid would quietly overwrite a player's verdict
 * with somebody else's.
 */
function parseTable(value: unknown): Seat[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SEATS) {
    return null;
  }

  const seen = new Set<string>();
  const seats: Seat[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const { uid, response, bot } = raw as {
      uid?: unknown;
      response?: unknown;
      bot?: unknown;
    };

    if (typeof uid !== "string" || !uid || uid.length > 128) return null;
    if (seen.has(uid)) return null;
    seen.add(uid);

    const accuracy =
      typeof bot === "number" && bot >= 0 && bot <= 1 ? bot : null;
    const answered = parseResponse(response);
    if (!answered && accuracy === null) return null;

    seats.push({ uid, response: answered, bot: accuracy });
  }

  return seats;
}

/**
 * The question at a position and the answer to it.
 *
 * A generated question carries everything needed to grade it in its id: the
 * generator and the seed. Re-running them rebuilds the same question and
 * recomputes the same answer, so there is nothing to have stored and nothing
 * to have gone stale. A bank question keeps its answer in the key.
 */
function resolve(
  subunitId: string,
  questionId: string,
): { question: Question; answer: Answer } | null {
  const instance = resolveInstance(questionId);
  if (instance) return instance;

  const subunit = getSubunit(subunitId);
  const question = subunit?.questions.find((q) => q.id === questionId);
  const banked = answerFor(questionId);

  if (!question || banked === undefined) return null;
  return { question, answer: { kind: "choice", index: banked } };
}
