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

/**
 * Two subunit codes, ordered the way the syllabus orders them.
 *
 * Codes are dotted numbers, so a plain string sort puts "1.10" before "1.9".
 * Exported because the pool builder orders siblings by it too, and a second
 * way of reading a code is a second way of getting it wrong.
 */
export function compareCodes(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);

  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    // A code that is not a dotted number falls back to reading as text, which
    // is at least stable.
    if (Number.isNaN(l) || Number.isNaN(r)) return a.localeCompare(b);
    if (l !== r) return l - r;
  }

  return 0;
}

/**
 * The rest of the unit a subunit belongs to, in code order.
 *
 * A subunit too thin to fill a session on its own borrows from these — see
 * `pool.server.ts`. The unit is the boundary, and deliberately: a student who
 * picked 4.3 picked a chapter as well as a topic, so a question from 4.2 is
 * neighbouring material they chose to be in. One from another unit is material
 * they did not.
 */
export function siblingSubunits(subunitId: string): Subunit[] {
  const found = describe(subunitId);
  if (!found) return [];

  return [...found.unit.subunits]
    .sort((a, b) => compareCodes(a.code, b.code))
    .filter((s) => s.id !== subunitId);
}

export type Selection = {
  subject: Subject;
  course: Course;
  unit: Unit;
  /** In the order the unit lists them, not the order they were picked. */
  subunits: Subunit[];
};

/**
 * The same, for the several subunits a session actually mixes.
 *
 * A selection has to sit inside one unit. That is what the library offers, and
 * it is what lets everything downstream name a single unit in a header rather
 * than trailing a list of them — so a hand-made link that spans two units is
 * refused here instead of being half-rendered.
 */
export function describeAll(subunitIds: string[]): Selection | null {
  if (subunitIds.length === 0) return null;

  const first = describe(subunitIds[0]);
  if (!first) return null;

  const picked = new Set(subunitIds);
  if (!subunitIds.every((id) => first.unit.subunits.some((s) => s.id === id))) {
    return null;
  }

  return {
    subject: first.subject,
    course: first.course,
    unit: first.unit,
    subunits: first.unit.subunits.filter((s) => picked.has(s.id)),
  };
}

/**
 * How a selection names itself in a header. One subunit says its own code; a
 * mix says the unit it came out of and how many of it were taken, because a
 * run of four codes is longer than the header and says less.
 */
export function selectionLabel(s: Selection): string {
  if (s.subunits.length === 1) return s.subunits[0].code;
  return `${s.unit.code.replace("unit-", "Unit ")} · ${s.subunits.length} subunits`;
}

/** The subunits picked, named in full. For a summary, which has the room. */
export function selectionNames(s: Selection): string {
  return s.subunits.map((su) => su.name).join(" · ");
}

/**
 * The difficulty a whole selection reads as, or null when they differ — in
 * which case there is no one number to show, and saying so is more honest
 * than showing whichever subunit happened to be first.
 */
export function selectionDifficulty(s: Selection): Difficulty | null {
  const first = s.subunits[0].difficulty;
  return s.subunits.every((su) => su.difficulty === first) ? first : null;
}

/**
 * The subunit a question came from, read straight off its id.
 *
 * Bank ids are `<subunitId>/q<n>` and generated ones are
 * `<subunitId>/gen/<generator>/<seed>`, so a question always says where it is
 * from. That matters once a session mixes subunits: the clock and the XP are
 * set by the difficulty of the subunit the question came from, not by whichever
 * one happened to be picked first.
 */
export function subunitIdOfQuestion(questionId: string): string | null {
  const generated = questionId.lastIndexOf("/gen/");
  if (generated > 0) return questionId.slice(0, generated);

  const slash = questionId.lastIndexOf("/");
  return slash > 0 ? questionId.slice(0, slash) : null;
}

export function subunitOfQuestion(questionId: string): Subunit | undefined {
  const id = subunitIdOfQuestion(questionId);
  return id ? getSubunit(id) : undefined;
}

/** A question's difficulty, which is its subunit's. Medium if it is unknown. */
export function difficultyOfQuestion(questionId: string): Difficulty {
  return subunitOfQuestion(questionId)?.difficulty ?? "medium";
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
 * A generated subunit can produce questions all day, so a course holding one
 * is simply unlimited and says so. How many generators stand behind that is
 * not the student's business, and printing the number did active harm: it read
 * as a stock level, so Algebra 2's 103 against Geometry's 317 said "Algebra 2
 * is the thinner course" about two courses that both never run out.
 *
 * A banked count is still printed where that is all there is, because there it
 * really is a total — the questions run out at that number.
 */
export function stockLabel(course: Course): string {
  const banked = questionCount(course);
  const unlimited = subunits(course).some((s) => generatorCount(s.id) > 0);

  const parts = [`${course.units.length} units`];
  if (unlimited) parts.push("unlimited questions");
  else if (banked) parts.push(`${banked} questions`);
  else parts.push("no questions yet");

  return parts.join(" · ");
}

/** The same, for one subunit. */
export function subunitStockLabel(subunit: Subunit): string {
  if (generatorCount(subunit.id) > 0) return "unlimited questions";
  return `${subunit.questions.length} questions`;
}

/**
 * The course a quick play starts in when there is nothing else to go on.
 *
 * Algebra 1 rather than the first course in the sequence: the sequence starts
 * at Grade 5, and opening a stranger's first race on Grade 5 decimals guesses
 * downward at somebody who never said how old they are. Algebra 1 sits in the
 * middle, is the course most students arriving at a maths site are in or have
 * just finished, and is stocked end to end.
 *
 * The guess is never hidden: the button that uses this says which unit it is
 * about to play, so a student who is somewhere else can see that before they
 * press it and walk down to their own unit instead.
 */
const QUICK_PLAY_COURSE = "math/algebra-1";

/**
 * A selection to start a race on with no questions asked — the whole point
 * being that a first-time visitor should not have to make five choices before
 * seeing a single question.
 *
 * The first playable unit of the default course, and the first three subunits
 * of it that have anything to ask. Three rather than one because a race across
 * a couple of related subunits is the session the library steers everybody to
 * anyway, and rather than four because this is meant to be the short way in.
 *
 * Falls back to the first playable unit anywhere in the syllabus, so this
 * cannot return an empty selection while the library has anything at all to
 * offer. Null only if nothing is stocked, which is the same state that already
 * disables every course card.
 */
export function quickPlaySelection(): Selection | null {
  const courses = SUBJECTS.flatMap((subject) =>
    subject.courses.map((course) => ({ subject, course })),
  );

  const preferred = courses.filter(({ course }) => course.id === QUICK_PLAY_COURSE);

  for (const { subject, course } of [...preferred, ...courses]) {
    for (const unit of course.units) {
      const ready = unit.subunits.filter(hasContent).slice(0, 3);
      if (ready.length > 0) return { subject, course, unit, subunits: ready };
    }
  }

  return null;
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
