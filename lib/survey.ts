"use client";

import { onValue, ref, serverTimestamp, set } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { SUBJECTS } from "@/lib/curriculum";

/**
 * The one-time survey a player is shown the first time they sign in.
 *
 * It exists to answer the questions the app cannot answer for itself: where
 * people came from, what they are here to do, and how much time they mean to
 * give it. Everything else about a player — what they play, how well, how often
 * — is already recorded, so nothing that could be measured is asked here.
 *
 * The survey is *declared* rather than written out as markup, because the same
 * declaration has to serve two screens that would otherwise drift apart: the
 * form a player fills in, and the tally an admin reads. Adding a question here
 * adds it to both.
 *
 * Answers live at `surveys/{uid}` rather than on the player's profile, because
 * a profile is readable by every signed-in user — that is what lets a room show
 * names — and none of this should be. See `database.rules.json`.
 */

export type SurveyOption = { value: string; label: string };

export type SurveyQuestion =
  /** A row of one-tap chips. The default: an answer should cost one press. */
  | {
      id: string;
      kind: "choice";
      prompt: string;
      note?: string;
      options: SurveyOption[];
    }
  /** A dropdown, for the one question with too many answers to lay out flat. */
  | {
      id: string;
      kind: "select";
      prompt: string;
      note?: string;
      placeholder: string;
      groups: { label: string; options: SurveyOption[] }[];
    }
  /** Free text. At most one of these — it is the slowest thing to answer. */
  | {
      id: string;
      kind: "text";
      prompt: string;
      note?: string;
      placeholder: string;
    };

/** Matches the ceiling the database rules enforce, so the form can't overrun it. */
export const ANSWER_MAX = 500;

/**
 * Courses, as the survey offers them: grouped by subject, in the order the
 * library shows them. Built from the curriculum rather than typed out again, so
 * a course added there appears here without anybody remembering to. A subject
 * with no courses yet is skipped — an empty group is a heading over nothing.
 */
const COURSE_GROUPS = SUBJECTS.map((subject) => ({
  label: subject.name,
  options: subject.courses.map((course) => ({
    value: course.id,
    label: course.name,
  })),
})).filter((group) => group.options.length > 0);

export const SURVEY: SurveyQuestion[] = [
  {
    id: "heard",
    kind: "choice",
    prompt: "How did you hear about hunat?",
    options: [
      { value: "friend", label: "A friend or classmate" },
      { value: "teacher", label: "A teacher or my school" },
      { value: "search", label: "Search" },
      { value: "social", label: "Social media" },
      { value: "forum", label: "Reddit or a forum" },
      { value: "other", label: "Somewhere else" },
    ],
  },
  {
    id: "stage",
    kind: "choice",
    prompt: "Where are you right now?",
    note: "So the questions land at the right level.",
    options: [
      { value: "middle", label: "Middle school" },
      { value: "9-10", label: "9th–10th grade" },
      { value: "11-12", label: "11th–12th grade" },
      { value: "college", label: "College" },
      { value: "teacher", label: "Teacher or parent" },
      { value: "other", label: "Something else" },
    ],
  },
  {
    id: "goal",
    kind: "choice",
    prompt: "What are you here to do?",
    options: [
      { value: "keep-up", label: "Keep up with a class" },
      { value: "test", label: "Prepare for a test" },
      { value: "ap", label: "Get ready for an AP exam" },
      { value: "ahead", label: "Get ahead of my class" },
      { value: "relearn", label: "Relearn something I forgot" },
      { value: "fun", label: "Just for fun" },
    ],
  },
  {
    id: "course",
    kind: "select",
    prompt: "What are you working on first?",
    placeholder: "Pick a course",
    groups: [
      ...COURSE_GROUPS,
      {
        label: "Not listed",
        options: [{ value: "other", label: "Something else" }],
      },
    ],
  },
  {
    id: "frequency",
    kind: "choice",
    prompt: "How often do you want to practise?",
    note: "An honest answer is worth more here than an ambitious one.",
    options: [
      { value: "daily", label: "Every day" },
      { value: "most-days", label: "Most days" },
      { value: "weekly", label: "Once a week" },
      { value: "sometimes", label: "Now and then" },
      { value: "unsure", label: "Not sure yet" },
    ],
  },
  {
    id: "minutes",
    kind: "choice",
    prompt: "How long in one sitting?",
    options: [
      { value: "5", label: "Under 10 minutes" },
      { value: "10", label: "10–20 minutes" },
      { value: "20", label: "20–45 minutes" },
      { value: "45", label: "45 minutes or more" },
    ],
  },
  {
    id: "wish",
    kind: "text",
    prompt: "What would make this worth coming back to?",
    note: "Optional, and read by a person.",
    placeholder: "A subject, a game mode, something in your way",
  },
];

// ─── One player's record ─────────────────────────────────

export type SurveyAnswers = Record<string, string>;

export type SurveyRecord = {
  /** When it was answered or waved off. */
  at: number;
  /** True when the player pressed Skip. There are then no answers. */
  skipped?: boolean;
  answers?: SurveyAnswers;
};

/**
 * What is known about a player's survey right now.
 *
 * `unavailable` is its own state rather than being folded into "none" because
 * the gate turns on this: a record that cannot be read must never be read as a
 * record that does not exist, or a database that is briefly unreachable would
 * put the survey in front of somebody who has already answered it — and, worse,
 * in front of somebody whose Skip would fail for the same reason, leaving them
 * no way past it.
 */
export type SurveyState =
  | { status: "loading" }
  | { status: "none" }
  | { status: "done"; record: SurveyRecord }
  | { status: "unavailable" };

export function watchSurvey(uid: string, cb: (state: SurveyState) => void) {
  return onValue(
    ref(realtimeDb, `surveys/${uid}`),
    (snap) => {
      const record = snap.val() as SurveyRecord | null;
      cb(record ? { status: "done", record } : { status: "none" });
    },
    () => cb({ status: "unavailable" }),
  );
}

/**
 * Writes the answers. Blank ones are dropped rather than stored empty, so a
 * question nobody answered reads as unanswered in the tally instead of as an
 * answer of "". A form submitted with nothing filled in is a skip, and is
 * recorded as one.
 */
export async function saveSurvey(uid: string, answers: SurveyAnswers) {
  const kept: SurveyAnswers = {};
  for (const question of SURVEY) {
    const value = answers[question.id]?.trim();
    if (value) kept[question.id] = value.slice(0, ANSWER_MAX);
  }

  await set(ref(realtimeDb, `surveys/${uid}`), {
    at: serverTimestamp(),
    ...(Object.keys(kept).length ? { answers: kept } : { skipped: true }),
  });
}

/** Recorded rather than left blank: a skip is itself an answer worth counting. */
export async function skipSurvey(uid: string) {
  await set(ref(realtimeDb, `surveys/${uid}`), {
    at: serverTimestamp(),
    skipped: true,
  });
}

// ─── Reading answers back ────────────────────────────────

/** Every option of a question, flat, whatever shape it is declared in. */
export function optionsOf(question: SurveyQuestion): SurveyOption[] {
  if (question.kind === "choice") return question.options;
  if (question.kind === "select") return question.groups.flatMap((g) => g.options);
  return [];
}

/**
 * The label an answer should be shown under. Falls back to the stored value, so
 * that retiring an option — a course leaving the curriculum, say — leaves old
 * answers legible rather than blank.
 */
export function labelFor(question: SurveyQuestion, value: string): string {
  return optionsOf(question).find((o) => o.value === value)?.label ?? value;
}

export type TallyRow = { value: string; label: string; count: number };

/**
 * Counts one question across a set of records, in the order the options are
 * declared — so the same question reads the same way every time it is looked
 * at, rather than reordering itself as answers come in.
 *
 * Answers no longer in the option list are kept and appended, because dropping
 * them would quietly change the total the percentages are taken against.
 */
export function tally(
  question: SurveyQuestion,
  records: SurveyRecord[],
): { rows: TallyRow[]; answered: number } {
  const counts = new Map<string, number>();
  let answered = 0;

  for (const record of records) {
    const value = record.answers?.[question.id];
    if (!value) continue;
    answered++;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const declared: TallyRow[] = optionsOf(question).map((option) => ({
    value: option.value,
    label: option.label,
    count: counts.get(option.value) ?? 0,
  }));

  const extra: TallyRow[] = [...counts.entries()]
    .filter(([value]) => !declared.some((row) => row.value === value))
    .map(([value, count]) => ({ value, label: value, count }));

  return { rows: [...declared, ...extra], answered };
}
