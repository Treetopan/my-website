import type { NextRequest } from "next/server";
import { getSubunit } from "@/lib/curriculum";
import { answerFor } from "@/lib/answers.server";
import { claimPosition, getSession } from "@/lib/session-store";
import { resolveInstance } from "@/lib/templates.server";
import { botResponse, grade, type Answer } from "@/lib/grading.server";
import { PASS, parseResponse, type Response as Answered } from "@/lib/questions";

export const dynamic = "force-dynamic";

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
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { sessionId, position, response, bot } = (body ?? {}) as {
    sessionId?: unknown;
    position?: unknown;
    response?: unknown;
    bot?: unknown;
  };

  if (typeof sessionId !== "string" || !Number.isInteger(position)) {
    return Response.json(
      { error: "Missing session or position." },
      { status: 400 },
    );
  }

  const at = position as number;

  const botAccuracy =
    typeof bot === "number" && bot >= 0 && bot <= 1 ? bot : null;
  const answered = parseResponse(response);

  if (!answered && botAccuracy === null) {
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

  const questionId = session.order[at];

  // A generated question carries everything needed to grade it in its id: the
  // generator and the seed. Re-running them rebuilds the same question and
  // recomputes the same answer, so there is nothing to have stored and nothing
  // to have gone stale.
  const instance = resolveInstance(questionId);

  const subunit = instance ? null : getSubunit(session.subunitId);
  const question =
    instance?.question ?? subunit?.questions.find((q) => q.id === questionId);

  // Bank questions are all multiple choice and keep their answers in the key.
  const banked = instance ? undefined : answerFor(questionId);
  const answer: Answer | null = instance
    ? instance.answer
    : banked === undefined
      ? null
      : { kind: "choice", index: banked };

  if (!question || !answer) {
    return Response.json({ error: "No answer on file." }, { status: 500 });
  }

  // Claimed only once there is definitely a verdict to give, so a question that
  // fails to resolve does not silently burn the player's single attempt at it.
  // The claim is atomic: two requests racing for the same position cannot both
  // win it, which is the guarantee the whole session mechanism exists for.
  if (!(await claimPosition(sessionId, at))) {
    return Response.json({ error: "Already answered." }, { status: 409 });
  }

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
