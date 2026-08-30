import "server-only";

import {
  compareCodes,
  siblingSubunits,
  type Question,
  type Subunit,
} from "./curriculum";
import { generatorCount, spatialGenerators } from "./templates";
import { mintInstances } from "./templates.server";

/**
 * One subunit's questions for one session.
 *
 * Most of this is what `/api/session` always did: mint from the subunit's own
 * generators, top up from its bank if it has one, and cut to length. What is
 * new is the answer to a subunit that is too thin to fill a session on its own.
 *
 * Algebra 2 through Calculus BC carry exactly one generator per subunit. A
 * ten-question session on one of those is one template with the numbers
 * reshuffled — which reads as a bug rather than as revision, and is the fastest
 * way to make somebody close the tab. Writing five hundred more generators is
 * the real fix; until then, a thin subunit borrows from its neighbours.
 *
 * The borrowing is deliberately narrow:
 *
 *  · Only a subunit under `DEPTH` generators borrows at all. Grades 5–8,
 *    Algebra 1 and Geometry are at the floor already and are untouched.
 *  · Never outside the unit. A student who picked 4.3 picked a chapter too, so
 *    4.2 is material they chose to be in and 6.1 is not.
 *  · Nearest first, by code, so the borrowed question is the closest thing to
 *    what they actually asked for.
 *  · Never from a subunit with nothing to mint, and under a placed-answer
 *    filter, never from one whose generators cannot settle a duel.
 *
 * The session still reports the subunit the student picked. It does not
 * pretend a borrowed question came from there: an instance id carries its own
 * subunit, so the clock, the XP, the method shown on a miss and the topic named
 * in the summary all follow the question rather than the selection.
 */

/**
 * How many distinct generators a session wants to reach before a subunit stops
 * reading as one template. The same floor `check:depth` gates the finished
 * courses on, and the reason this number is 3 rather than 2.
 */
export const DEPTH = 3;

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
 * A subunit's pool, up to `want` questions.
 *
 * Generated questions are minted here rather than derived on the client,
 * because building the options means knowing the answer. The browser gets
 * finished questions and cannot tell them from bank ones — or, now, tell a
 * borrowed one from an own one except by the topic it names.
 *
 * A bank is reshuffled each time it is exhausted, so a long game does not
 * repeat in the same order it just played. Never for a duel: a bank question is
 * answered by choosing, so topping up from one would fill a placed-answer game
 * with questions it cannot settle.
 */
export function buildPool(
  subunit: Subunit,
  want: number,
  placed: boolean,
): Question[] {
  const out = interleave(
    sources(subunit, want, placed).map((s) =>
      mintInstances(s.id, s.share, s.only),
    ),
  );

  while (!placed && out.length < want && subunit.questions.length > 0) {
    out.push(...shuffle(subunit.questions));
  }

  out.length = Math.min(want, out.length);
  return out;
}

/** A subunit to mint from, how many to take, and which of its generators. */
type Source = { id: string; share: number; only?: number[] };

/**
 * Where the pool comes from, and in what proportion.
 *
 * A subunit at the floor is one source and takes the whole session, which is
 * exactly what happened before any of this existed. A thin one keeps the share
 * its own generators can cover without any single template being more than a
 * `DEPTH`-th of the session — four of ten on one generator, eight of ten on
 * two — and lends out the remainder.
 */
function sources(subunit: Subunit, want: number, placed: boolean): Source[] {
  const only = (id: string) => (placed ? spatialGenerators(id) : undefined);
  const whole: Source[] = [
    { id: subunit.id, share: want, only: only(subunit.id) },
  ];

  const own = generatorCount(subunit.id);
  // Nothing to mint at all: a bank-only subunit, filled from its bank above.
  // Nothing thin about it, either — borrowing is about generators.
  if (own === 0) return [];
  if (own >= DEPTH) return whole;

  const lenders = lendersFor(subunit, own, placed);
  // A thin subunit in a unit of thin subunits, or a duel where the neighbours
  // cannot settle one. Nothing to borrow, so nothing changes.
  if (lenders.length === 0) return whole;

  const mine = Math.min(want, own * Math.ceil(want / DEPTH));
  const shares = spread(want - mine, lenders.length);

  return [
    { id: subunit.id, share: mine, only: only(subunit.id) },
    ...lenders.map((s, i) => ({ id: s.id, share: shares[i], only: only(s.id) })),
  ].filter((s) => s.share > 0);
}

/**
 * The siblings to borrow from: nearest first, and only as many as it takes to
 * bring the session within reach of `DEPTH` distinct generators. A subunit one
 * generator short borrows from one neighbour, not from the whole unit.
 */
function lendersFor(subunit: Subunit, own: number, placed: boolean): Subunit[] {
  const out: Subunit[] = [];
  let reach = own;

  for (const sibling of nearest(subunit)) {
    if (reach >= DEPTH) break;

    const usable = placed
      ? spatialGenerators(sibling.id).length
      : generatorCount(sibling.id);
    if (usable === 0) continue;

    out.push(sibling);
    reach += usable;
  }

  return out;
}

/**
 * A subunit's siblings ordered by how close their code is to its own, so 4.3
 * reaches for 4.2 and 4.4 before 4.1 and 4.5. Ties go to the earlier code,
 * which puts the material the student has already covered ahead of material
 * the unit has not reached yet.
 */
function nearest(subunit: Subunit): Subunit[] {
  const siblings = siblingSubunits(subunit.id);

  // They arrive in code order without the subunit itself, so its own place in
  // that order is however many of them sort before it.
  const at = siblings.filter(
    (s) => compareCodes(s.code, subunit.code) < 0,
  ).length;

  return siblings
    .map((sibling, i) => ({ sibling, gap: i < at ? at - i : i + 1 - at }))
    .sort((a, b) => a.gap - b.gap)
    .map((s) => s.sibling);
}

/** `total` split as evenly as it goes, the remainder to the nearest lenders. */
function spread(total: number, into: number): number[] {
  const each = Math.floor(total / into);
  const extra = total % into;
  return Array.from({ length: into }, (_, i) => each + (i < extra ? 1 : 0));
}

/**
 * Merges the sources into one pool, spread rather than concatenated.
 *
 * The order inside a pool matters: a session that mixes several subunits deals
 * off the fronts of their pools and never reaches the back, so borrowed
 * questions parked at the end would simply never be asked. Each step takes from
 * whichever source has used the least of its share, which keeps the mix even at
 * every length and still opens the session with the subunit that was picked.
 */
function interleave(parts: Question[][]): Question[] {
  const out: Question[] = [];
  const taken = parts.map(() => 0);
  const total = parts.reduce((n, p) => n + p.length, 0);

  for (let i = 0; i < total; i++) {
    let pick = -1;
    let lowest = Infinity;

    for (let j = 0; j < parts.length; j++) {
      if (taken[j] >= parts[j].length) continue;
      const used = taken[j] / parts[j].length;
      if (used < lowest) {
        lowest = used;
        pick = j;
      }
    }

    if (pick < 0) break;
    out.push(parts[pick][taken[pick]++]);
  }

  return out;
}
