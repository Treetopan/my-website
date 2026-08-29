/**
 * The curriculum tree: subject → course → unit → subunit → questions.
 *
 * Difficulty lives on the SUBUNIT and is never something the student picks.
 * It describes how hard the material is to answer *quickly*, which is why it
 * sets the clock and the XP rather than filtering anything. A student drills
 * down to what they're studying; the difficulty label just tells them what
 * they're walking into.
 *
 * Content here is a stocked slice, not a full syllabus. Math is the stocked
 * subject; Science and History are listed empty and read as coming soon, so
 * the hierarchy stays honest about what is missing — fill them in here and
 * nothing else in the app has to change.
 */

import {
  ALGEBRA_1,
  ALGEBRA_2,
  AP_CALCULUS_AB,
  AP_CALCULUS_BC,
  GEOMETRY,
  GRADE_5,
  GRADE_6,
  GRADE_7,
  GRADE_8,
  PRECALCULUS,
  type UnitSpec,
} from "./curriculum-math";
import { generatorCount, hasSpatial } from "./templates";

export type Difficulty = "easy" | "medium" | "hard";

/**
 * A question is one of several kinds — multiple choice, typed, a slider, a
 * placed point, a drawn line. The shapes live in `questions.ts` and are
 * re-exported here because the curriculum is where most code meets them.
 *
 * Every question carries a `topic`: the concept it tests. A subunit is one
 * topic, but a student misses individual ideas inside it, and that is what the
 * post-game summary names back to them instead of just a score.
 */
export type { Question } from "./questions";
import type { Question } from "./questions";

export type Subunit = {
  id: string;
  code: string;
  name: string;
  difficulty: Difficulty;
  questions: Question[];
};

export type Unit = {
  id: string;
  code: string;
  name: string;
  subunits: Subunit[];
};

export type Course = {
  id: string;
  name: string;
  blurb: string;
  units: Unit[];
};

export type Subject = {
  id: string;
  name: string;
  blurb: string;
  courses: Course[];
};

export const DIFFICULTY: Record<
  Difficulty,
  { name: string; note: string; seconds: number; xp: number }
> = {
  easy: {
    name: "Easy",
    note: "Recall — you either know it or you don't",
    seconds: 15,
    xp: 10,
  },
  medium: {
    name: "Medium",
    note: "A step of reasoning before you answer",
    seconds: 22,
    xp: 20,
  },
  hard: {
    name: "Hard",
    note: "Multi-step. Slow to answer even when you know it",
    seconds: 30,
    xp: 35,
  },
};

/**
 * [prompt, [4 options], topic] — no answer index. The correct option lives in
 * lib/answers.server.ts and is never shipped to the browser.
 */
type Row = [string, [string, string, string, string], string];

function sub(
  unitId: string,
  code: string,
  name: string,
  difficulty: Difficulty,
  rows: Row[],
): Subunit {
  const id = `${unitId}/${code}`;
  return {
    id,
    code,
    name,
    difficulty,
    questions: rows.map((r, i) => ({
      kind: "choice" as const,
      id: `${id}/q${i}`,
      prompt: r[0],
      options: [...r[1]],
      topic: r[2],
    })),
  };
}

function unit(courseId: string, code: string, name: string, make: (id: string) => Subunit[]): Unit {
  const id = `${courseId}/${code}`;
  return { id, code, name, subunits: make(id) };
}

/**
 * Builds a course's units from an outline spec — the full unit and subunit
 * tree, with the question banks still empty. A student can read the whole
 * syllabus this way; `isStocked` keeps them out of a course that has nothing
 * to ask yet.
 */
function outline(courseId: string, specs: UnitSpec[]): Unit[] {
  return specs.map(([code, name, subunits]) =>
    unit(courseId, code, name, (u) =>
      subunits.map(([c, n, difficulty]) => sub(u, c, n, difficulty, [])),
    ),
  );
}

/**
 * A subject with no courses is one we have not stocked yet. The library shows
 * it as coming soon rather than hiding it, because what is missing is part of
 * what the app is for.
 */
export const SUBJECTS: Subject[] = [
  {
    id: "science",
    name: "Science",
    blurb: "Biology, chemistry, physics",
    courses: [],
  },
  {
    id: "history",
    name: "History",
    blurb: "World, regional and thematic history",
    courses: [],
  },
  {
    id: "math",
    name: "Math",
    blurb: "Grade 5 through AP Calculus BC",
    // The ten below are the Grade 5 → AP Calculus BC sequence, in order.
    courses: [
      {
        id: "math/grade-5",
        name: "Grade 5",
        blurb: "Decimals, fractions, volume, the coordinate plane",
        units: outline("math/grade-5", GRADE_5),
      },
      {
        id: "math/grade-6",
        name: "Grade 6",
        blurb: "Ratios, negative numbers, expressions, statistics",
        units: outline("math/grade-6", GRADE_6),
      },
      {
        id: "math/grade-7",
        name: "Grade 7",
        blurb: "Proportions, percent, circles, probability",
        units: outline("math/grade-7", GRADE_7),
      },
      {
        id: "math/grade-8",
        name: "Grade 8",
        blurb: "Exponents, lines, transformations, Pythagoras",
        units: outline("math/grade-8", GRADE_8),
      },
      {
        id: "math/algebra-1",
        name: "Algebra 1",
        blurb: "Expressions, linear systems, quadratics, exponentials",
        units: outline("math/algebra-1", ALGEBRA_1),
      },
      {
        id: "math/geometry",
        name: "Geometry",
        blurb: "Proof, congruence, similarity, circles, solids",
        units: outline("math/geometry", GEOMETRY),
      },
      {
        id: "math/algebra-2",
        name: "Algebra 2",
        blurb: "Polynomials, logarithms, trigonometry, conics",
        units: outline("math/algebra-2", ALGEBRA_2),
      },
      {
        id: "math/precalculus",
        name: "Precalculus",
        blurb: "Functions, polar and parametric forms, vectors, limits",
        units: outline("math/precalculus", PRECALCULUS),
      },
      {
        id: "math/ap-calculus-ab",
        name: "AP Calculus AB",
        blurb: "Limits, derivatives, integrals",
        units: outline("math/ap-calculus-ab", AP_CALCULUS_AB),
      },
      {
        id: "math/ap-calculus-bc",
        name: "AP Calculus BC",
        blurb: "Everything in AB, plus series, polar and parametric calculus",
        units: outline("math/ap-calculus-bc", AP_CALCULUS_BC),
      },
    ],
  },
];

// ─── Lookups ─────────────────────────────────────────────

export function getSubject(id: string) {
  return SUBJECTS.find((s) => s.id === id);
}

export function getCourse(id: string) {
  return SUBJECTS.flatMap((s) => s.courses).find((c) => c.id === id);
}

export function getUnit(id: string) {
  return SUBJECTS.flatMap((s) => s.courses)
    .flatMap((c) => c.units)
    .find((u) => u.id === id);
}

export function getSubunit(id: string) {
  return SUBJECTS.flatMap((s) => s.courses)
    .flatMap((c) => c.units)
    .flatMap((u) => u.subunits)
    .find((su) => su.id === id);
}

/** Breadcrumb parts for a subunit id, for headers and results copy. */
export function describe(subunitId: string) {
  for (const subject of SUBJECTS) {
    for (const course of subject.courses) {
      for (const u of course.units) {
        const su = u.subunits.find((s) => s.id === subunitId);
        if (su) return { subject, course, unit: u, subunit: su };
      }
    }
  }
  return null;
}

/** Look a question up by the id the server hands back in a session order. */
export function questionById(id: string): Question | undefined {
  return SUBJECTS.flatMap((s) => s.courses)
    .flatMap((c) => c.units)
    .flatMap((u) => u.subunits)
    .flatMap((su) => su.questions)
    .find((q) => q.id === id);
}

/**
 * Whether a course can actually be played. A course may carry its full unit
 * and subunit outline and still have nothing to ask — the outline is there to
 * be read, but there is no session to start, so the library keeps it
 * selectable-looking but disabled rather than letting a student pick their way
 * down to an empty subunit.
 */
export function isStocked(course: Course) {
  return subunits(course).some(hasContent);
}

/** Whether one subunit can be played, from a bank or from generators. */
export function hasContent(subunit: Subunit) {
  return subunit.questions.length > 0 || generatorCount(subunit.id) > 0;
}

/**
 * Whether one subunit can host a mirror duel.
 *
 * Stricter than `hasContent`, and for a reason rather than for tidiness: a
 * duel is won by whichever answer was closer, and closeness only exists where
 * the question is answered on a grid or a scale. On a typed or a chosen
 * answer both players are simply right, every round is a dead heat, and the
 * game never moves.
 */
export function canDuel(subunit: Subunit) {
  return hasSpatial(subunit.id);
}

/** Every subunit in a course, for callers that want to count them their way. */
export function subunitsOf(course: Course) {
  return subunits(course);
}

export function questionCount(course: Course) {
  return subunits(course).reduce((n, s) => n + s.questions.length, 0);
}

function subunits(course: Course) {
  return course.units.flatMap((u) => u.subunits);
}

/**
 * How a course's stock reads in the library.
 *
 * Generated subunits have no bank to count — a generator can produce questions
 * all day — so they are counted as generators and described as unlimited
 * rather than given a fake total.
 */
export function stockLabel(course: Course): string {
  const banked = questionCount(course);
  const generators = subunits(course).reduce(
    (n, s) => n + generatorCount(s.id),
    0,
  );

  const parts = [`${course.units.length} units`];
  if (banked) parts.push(`${banked} questions`);
  if (generators) parts.push(`${generators} generators · unlimited`);
  if (!banked && !generators) parts.push("no questions yet");

  return parts.join(" · ");
}

/** The same, for one subunit. */
export function subunitStockLabel(subunit: Subunit): string {
  const generators = generatorCount(subunit.id);
  if (generators) return `${generators} generators · unlimited`;
  return `${subunit.questions.length} questions`;
}

/**
 * Deterministic shuffle so every client in a room derives the same order from
 * the room seed — the question list never has to be broadcast.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
