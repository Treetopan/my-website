import type { NextRequest } from "next/server";
import {
  getSubunit,
  subunitIdOfQuestion,
  type Question,
} from "@/lib/curriculum";
import { answerFor } from "@/lib/answers.server";
import {
  awaitVerdict,
  claimPosition,
  getSession,
  gradeAllowedForIp,
  gradeAllowedForUser,
  releasePosition,
  rememberVerdict,
} from "@/lib/session-store";
import { callerIp, verifyCaller } from "@/lib/caller";
import { resolveInstance } from "@/lib/templates.server";
import { botResponse, grade, type Answer } from "@/lib/grading.server";
import { coachingFor } from "@/lib/coaching.server";
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
 *
 * Signed-in players only, as of the token check below. Holding a live session
 * and winning a position's one claim were never statements about who you are —
 * they say a position is graded once, not that a player is the one grading it.
 * See `caller.ts`.
 */
export async function POST(req: NextRequest) {
  const now = Date.now();

  // All three gates before the body is even parsed, and long before the
  // session is fetched: a caller in a loop costs a counter rather than a read
  // and a transaction. Minting is limited the same way, on budgets of its own,
  // so a burst of answering cannot lock anybody out of starting a game.
  //
  // Cheapest first. The IP ceiling is a counter and the token check is a
  // signature verification, so the counter guards the verification — a caller
  // who has proved nothing yet cannot make us do that work over and over.
  if (!(await gradeAllowedForIp(callerIp(req), now))) {
    return Response.json(
      { error: "Too many answers at once. Wait a minute." },
      { status: 429 },
    );
  }

  const caller = await verifyCaller(req);
  if (!caller.ok) return caller.response;

  // Refused here, before the claim, so nothing has been spent — which is what
  // lets a client resend the same answer after a 429, and what makes a client
  // safe to retry after a 401 it has fixed by refreshing its token.
  //
  // A uid of null is a dev server with no service account; see the session
  // route for why that is a null here and a refusal in production.
  if (caller.uid && !(await gradeAllowedForUser(caller.uid, now))) {
    return Response.json(
      { error: "Too many answers at once. Wait a minute." },
      { status: 429 },
    );
  }

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

  const session = await getSession(sessionId, now);
  if (!session) {
    return Response.json(
      { error: "Session expired. Start the game again." },
      { status: 404 },
    );
  }

  if (at < 0 || at >= session.order.length) {
    return Response.json({ error: "No such question." }, { status: 400 });
  }

  // The claim comes first, before the question is rebuilt and long before
  // anything is graded. That ordering is the whole of this endpoint's
  // idempotency:
  //
  //   · Exactly one caller is told `claimed`, and only that caller grades.
  //     Two requests racing for the same position cannot both win it — the
  //     guarantee the session mechanism exists for, and untouched by any of
  //     what follows.
  //
  //   · Everybody else is served the verdict the winner recorded. That is a
  //     read of a stored object and nothing else: no generator re-run, no
  //     second scoring, and above all no second roll of a bot's answer, which
  //     is the one thing here that would come out different if it ran twice.
  //
  // So a repeat request is safe to send. A double tap, a retry over a
  // connection that dropped the first reply, a turn resolved by both the
  // answer listener and the clock — all of them get the one verdict this
  // position will ever have.
  const claim = await claimPosition(sessionId, at);
  if (!claim.claimed) {
    // Either the winner has already recorded it, or it is still grading and
    // worth waiting a moment for.
    const stored = claim.verdict ?? (await awaitVerdict(sessionId, at));
    if (stored) return Response.json(stored);

    // Claimed, but no verdict inside the budget. Nothing can be said about
    // this position now or later, which is what 409 has always meant here.
    return Response.json({ error: "Already answered." }, { status: 409 });
  }

  const found = resolve(session.subunitIds, session.order[at]);
  if (!found) {
    // Nothing to grade after all. The claim is handed back rather than
    // spending the player's single attempt at this question on a fault of
    // ours, which is what holding the claim until now would have done.
    await releasePosition(sessionId, at);
    return Response.json({ error: "No answer on file." }, { status: 500 });
  }
  const { question, answer } = found;

  // A session mixes several subunits, so the method a miss is explained with
  // is the one belonging to the question that was actually asked rather than
  // to whichever subunit was picked first.
  const from = subunitIdOfQuestion(question.id) ?? session.subunitIds[0];

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
    let missed = false;

    for (const seat of seats) {
      const submitted =
        seat.bot !== null
          ? botResponse(answer, question, seat.bot)
          : (seat.response as Answered);

      const verdict = grade(answer, submitted);
      reveal = verdict.reveal;
      if (!verdict.correct) missed = true;
      results[seat.uid] = {
        score: verdict.score,
        correct: verdict.correct,
        response: submitted,
      };
    }

    // One explanation for the table rather than one per seat: it is a property
    // of the question, not of who missed it, and the duel is eight rounds of
    // this going over the wire. Each client shows it only if it was their miss.
    const payload = {
      results,
      reveal,
      pass: PASS,
      ...(missed
        ? { steps: coachingFor(found.steps, question.topic, from) }
        : {}),
    };

    // Recorded before it is sent, so a repeat that arrives while this reply is
    // still in flight finds the verdict rather than an unfinished claim.
    await rememberVerdict(sessionId, at, payload);
    return Response.json(payload);
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

  const payload = {
    score,
    correct,
    reveal,
    response: submitted,
    /** The bar a score has to clear to count as right, so the UI can say so. */
    pass: PASS,
    // Only ever on a miss, so a right answer costs exactly what it always did.
    // Never sent with the question itself — a method line beside an unanswered
    // question is a hint, and this is a game.
    ...(correct
      ? {}
      : { steps: coachingFor(found.steps, question.topic, from) }),
  };

  // Recorded before it is sent. A bot's answer was rolled once, above, and
  // what is stored here is the only copy of it that will ever exist for this
  // position — every later request for it is served from this.
  await rememberVerdict(sessionId, at, payload);
  return Response.json(payload);
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
 *
 * A bank question is looked for across every subunit the session was opened
 * on, and nowhere else: the position already fixes which question this is, and
 * keeping the search inside the session is what stops an id from somewhere
 * else in the curriculum being graded here.
 */
function resolve(
  subunitIds: string[],
  questionId: string,
): { question: Question; answer: Answer; steps?: string[] } | null {
  const instance = resolveInstance(questionId);
  if (instance) return instance;

  const banked = answerFor(questionId);
  if (banked === undefined) return null;

  for (const subunitId of subunitIds) {
    const question = getSubunit(subunitId)?.questions.find(
      (q) => q.id === questionId,
    );
    if (question) return { question, answer: { kind: "choice", index: banked } };
  }

  return null;
}
