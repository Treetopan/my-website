/**
 * The duel's rule, checked case by case.
 *
 * The whole mechanic is two lines — you score what your answer was worth, and
 * the closest answer also takes the gap — so the interesting part is the
 * edges: a dead heat, a round nobody answered, a table of three where the top
 * two tie. Each of those has to pay nobody, and each of them is a different
 * reason for it.
 *
 * Run with `npm run check:duel`.
 */

import { champion, pointsFor, settle } from "../lib/duel";
import type { RoomPlayer } from "../lib/rtdb";

let failures = 0;

function check(what: string, got: unknown, want: unknown) {
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a === b) return;
  failures++;
  console.error(`  ${what}\n      got  ${a}\n      want ${b}`);
}

// ─── Settling a round ────────────────────────────────────

check(
  "a clear winner takes the difference",
  settle([
    { uid: "a", score: 0.9 },
    { uid: "b", score: 0.4 },
  ]),
  { closestUid: "a", gap: 0.5 },
);

check(
  "a dead heat pays nobody",
  settle([
    { uid: "a", score: 0.8 },
    { uid: "b", score: 0.8 },
  ]),
  { closestUid: null, gap: 0 },
);

check(
  "two wrong answers pay nobody, however wrong",
  settle([
    { uid: "a", score: 0 },
    { uid: "b", score: 0 },
  ]),
  { closestUid: null, gap: 0 },
);

check(
  "being the only one to score at all takes the lot",
  settle([
    { uid: "a", score: 1 },
    { uid: "b", score: 0 },
  ]),
  { closestUid: "a", gap: 1 },
);

check(
  "a duel of one has nobody to be closer than",
  settle([{ uid: "a", score: 1 }]),
  { closestUid: null, gap: 0 },
);

check(
  "with three at the table the gap is against the runner-up",
  settle([
    { uid: "a", score: 0.9 },
    { uid: "b", score: 0.7 },
    { uid: "c", score: 0.1 },
  ]),
  { closestUid: "a", gap: 0.2 },
);

check(
  "a tie at the top pays nobody, whoever is third",
  settle([
    { uid: "a", score: 0.9 },
    { uid: "b", score: 0.9 },
    { uid: "c", score: 0.1 },
  ]),
  { closestUid: null, gap: 0 },
);

check(
  "the order the table arrives in does not decide it",
  settle([
    { uid: "b", score: 0.4 },
    { uid: "a", score: 0.9 },
  ]),
  { closestUid: "a", gap: 0.5 },
);

// ─── What a round is worth ───────────────────────────────

check("a perfect answer nobody matched", pointsFor(1, 1, 20), 40);
check("a perfect answer that was matched", pointsFor(1, 0, 20), 20);
check("part marks still pay", pointsFor(0.55, 0, 20), 11);
check("a wrong answer pays nothing", pointsFor(0, 0, 20), 0);
check("nothing subtracts", pointsFor(-1, -1, 20), 0);

// ─── Who won the duel ────────────────────────────────────

const player = (score: number): RoomPlayer => ({
  displayName: "x",
  isBot: false,
  alive: true,
  inRound: true,
  seat: 0,
  score,
  correct: 0,
  joinedAt: 0,
});

check("the higher total wins", champion({ a: player(40), b: player(31) }), "a");
check("level is not a win", champion({ a: player(31), b: player(31) }), null);
check("an empty room has no winner", champion({}), null);
check("alone at the table still counts", champion({ a: player(10) }), "a");

// ─── Report ──────────────────────────────────────────────

if (failures) {
  console.error(`\n${failures} duel rule failure(s).\n`);
  process.exit(1);
}
console.log("\nOK — the duel settles the way it says it does.\n");
