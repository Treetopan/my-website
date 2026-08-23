import type { NextRequest } from "next/server";
import { getSubunit } from "@/lib/curriculum";
import { answerFor } from "@/lib/answers.server";
import { getSession } from "@/lib/session-store";
import { resolveInstance } from "@/lib/templates.server";

export const dynamic = "force-dynamic";

/**
 * Grades one position in a session, once.
 *
 * `choice: null` means the clock ran out. It still consumes that position's
 * single grading — otherwise "send null and read the answer" would be a free
 * oracle, which is the thing this endpoint exists to prevent.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { sessionId, position, choice, bot } = (body ?? {}) as {
    sessionId?: unknown;
    position?: unknown;
    choice?: unknown;
    bot?: unknown;
  };

  if (typeof sessionId !== "string" || !Number.isInteger(position)) {
    return Response.json(
      { error: "Missing session or position." },
      { status: 400 },
    );
  }

  const at = position as number;

  const validChoice =
    choice === null || (typeof choice === "number" && Number.isInteger(choice));
  const botAccuracy =
    typeof bot === "number" && bot >= 0 && bot <= 1 ? bot : null;

  if (!validChoice && botAccuracy === null) {
    return Response.json({ error: "Invalid choice." }, { status: 400 });
  }

  const session = getSession(sessionId, Date.now());
  if (!session) {
    return Response.json(
      { error: "Session expired. Start the game again." },
      { status: 404 },
    );
  }

  if (at < 0 || at >= session.order.length) {
    return Response.json({ error: "No such question." }, { status: 400 });
  }

  if (session.graded.has(at)) {
    return Response.json({ error: "Already answered." }, { status: 409 });
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
  const answer = instance ? instance.answer : answerFor(questionId);

  if (!question || answer === undefined) {
    return Response.json({ error: "No answer on file." }, { status: 500 });
  }

  session.graded.add(at);

  // A bot's turn is rolled here rather than on the host's machine, because
  // choosing a plausible wrong option requires knowing the right one.
  if (botAccuracy !== null) {
    const right = Math.random() < botAccuracy;
    const wrong = question.options.map((_, i) => i).filter((i) => i !== answer);
    const picked = right
      ? answer
      : wrong[Math.floor(Math.random() * wrong.length)];

    return Response.json({ correct: right, answer, choice: picked });
  }

  return Response.json({
    correct: choice === answer,
    answer,
    choice: choice as number | null,
  });
}
