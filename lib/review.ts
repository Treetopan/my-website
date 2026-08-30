import { DIFFICULTY, type Difficulty, type Question } from "@/lib/curriculum";
import {
  describeResponse,
  describeReveal,
  isBlank,
  type QuestionKind,
  type Response,
  type Reveal,
} from "@/lib/questions";

/**
 * What the student sees after a game. The point is not the score — it is
 * knowing which idea to go back to, so everything here is organised by
 * concept rather than by question order.
 */

export type AnswerDetail = {
  questionId: string;
  topic: string;
  /** The whole question, so the summary can describe any kind of answer. */
  question: Question;
  /** The right answer, as the server revealed it. */
  reveal: Reveal;
  /** What was submitted. Blank when the clock ran out. */
  response: Response;
  difficulty: Difficulty;
  correct: boolean;
  /** 0–1. Only the proximity kinds land between the two. */
  score: number;
  /**
   * How quickly it was answered, 0–1. The table measures the clock still
   * left; the race, which has no clock, measures how far inside par.
   */
  speed: number;
  /**
   * How long the answer actually took, in milliseconds. Written by practice,
   * which has the room at the end to report a time back; the games price
   * speed against par instead and leave this off.
   */
  ms?: number;
  /**
   * The rule behind the question, or the worked steps for this roll. Arrives
   * with the verdict on a miss and is carried no further than the summary —
   * nothing about a finished session is written down anywhere.
   */
  steps?: string[];
};

/** The question text, for a summary that no longer stores it separately. */
export function promptOf(d: AnswerDetail): string {
  return d.question.prompt;
}

/** The right answer in words, whatever kind of question it was. */
export function answerOf(d: AnswerDetail): string {
  return describeReveal(d.reveal, d.question);
}

/** What the student said, in words. */
export function givenOf(d: AnswerDetail): string {
  return describeResponse(d.response, d.question);
}

/** Whether the clock ran out rather than an answer being wrong. */
export function ranOut(d: AnswerDetail): boolean {
  return isBlank(d.response);
}

// ─── Grouping ────────────────────────────────────────────

/**
 * How each kind of question reads to a student. A summary that names problem
 * types back to them has to use their word for it: "line" and "fill" are what
 * the code calls these, not what the question felt like to answer.
 */
export const FORMAT: Record<QuestionKind, string> = {
  choice: "Multiple choice",
  fill: "Typed answer",
  slider: "Placed on a scale",
  point: "Placed on a grid",
  line: "Drawn line",
  order: "Put in order",
};

/**
 * One slice of a session — a concept, a question format, a difficulty. The
 * three are the same shape because they are the same question asked three
 * ways: of the answers that fell in here, how many landed?
 */
export type Bucket = {
  /** Stable across renders, for list keys. */
  key: string;
  label: string;
  right: number;
  wrong: number;
  total: number;
  /** 0–1. An empty bucket never reaches a caller, so this is never NaN. */
  accuracy: number;
  /** Mean pace across the correct answers only, 0–1. */
  pace: number;
};

/**
 * Groups answers by whatever `of` says they have in common, keeping the order
 * the buckets first appeared in — every ranking below sorts a copy, so the
 * unsorted order stays the order the session actually asked them in.
 */
export function bucketBy(
  details: AnswerDetail[],
  of: (d: AnswerDetail) => { key: string; label: string },
): Bucket[] {
  const map = new Map<string, Bucket & { paces: number[] }>();

  for (const d of details) {
    const { key, label } = of(d);
    const b = map.get(key) ?? {
      key,
      label,
      right: 0,
      wrong: 0,
      total: 0,
      accuracy: 0,
      pace: 0,
      paces: [],
    };

    b.total++;
    if (d.correct) {
      b.right++;
      b.paces.push(d.speed);
    } else {
      b.wrong++;
    }
    map.set(key, b);
  }

  return [...map.values()].map(({ paces, ...b }) => ({
    ...b,
    accuracy: b.right / b.total,
    pace: paces.length ? paces.reduce((a, c) => a + c, 0) / paces.length : 0,
  }));
}

export function byTopic(details: AnswerDetail[]): Bucket[] {
  return bucketBy(details, (d) => ({ key: d.topic, label: d.topic }));
}

export function byFormat(details: AnswerDetail[]): Bucket[] {
  return bucketBy(details, (d) => ({
    key: d.question.kind,
    label: FORMAT[d.question.kind],
  }));
}

export function byDifficulty(details: AnswerDetail[]): Bucket[] {
  return bucketBy(details, (d) => ({
    key: d.difficulty,
    label: DIFFICULTY[d.difficulty].name,
  }));
}

/**
 * Worst first: most missed, then — where two were missed the same number of
 * times — the one that was got right least. Missing two out of two outranks
 * missing two out of six, which is the distinction a raw miss count loses.
 */
export function struggles(buckets: Bucket[]): Bucket[] {
  return buckets
    .filter((b) => b.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy);
}

/** Clean sweeps only, quickest first. Being fast is what separates them. */
export function solid(buckets: Bucket[]): Bucket[] {
  return buckets
    .filter((b) => b.wrong === 0 && b.right > 0)
    .sort((a, b) => b.pace - a.pace);
}

export type TopicTally = {
  topic: string;
  right: number;
  wrong: number;
  /** Mean clock remaining across correct answers, 0–1. */
  pace: number;
};

export type Summary = {
  correct: number;
  total: number;
  /** 0–1. Zero-question sessions report 0 rather than NaN. */
  accuracy: number;
  timedOut: number;
  /** Concepts missed at least once, worst first. */
  weak: TopicTally[];
  /** Concepts answered correctly every time, quickest first. */
  strong: TopicTally[];
  /** Every question to go back to, in the order they were asked. */
  review: AnswerDetail[];
};

function asTally(b: Bucket): TopicTally {
  return { topic: b.label, right: b.right, wrong: b.wrong, pace: b.pace };
}

export function tallyByTopic(details: AnswerDetail[]): TopicTally[] {
  return byTopic(details).map(asTally);
}

export function summarize(details: AnswerDetail[]): Summary {
  const total = details.length;
  const correct = details.filter((d) => d.correct).length;
  const topics = byTopic(details);

  return {
    correct,
    total,
    accuracy: total === 0 ? 0 : correct / total,
    timedOut: details.filter(ranOut).length,
    weak: struggles(topics).map(asTally),
    strong: solid(topics).map(asTally),
    review: details.filter((d) => !d.correct),
  };
}

/**
 * One line naming what to do next. Written as a sentence rather than a stat
 * because a student reads this and closes the tab.
 */
export function verdict(s: Summary): string {
  if (s.total === 0) return "No questions answered.";
  if (s.correct === s.total) return "Clean sweep — nothing to review.";

  if (s.weak.length === 1) return `One idea to go back to: ${s.weak[0].topic}.`;

  if (s.weak.length > 1) {
    const worst = s.weak.slice(0, 2).map((t) => t.topic);
    return `Start with ${worst.join(" and ")}.`;
  }

  return "Review the questions below.";
}

// ─── Practice ────────────────────────────────────────────

/**
 * The same session, read three ways.
 *
 * Practice has nobody to beat, so the report at the end is the whole point of
 * it rather than a footnote under a result — and one ranking of concepts is
 * not enough to act on. A student who is fine on the ideas but loses every
 * question they have to *type* has a different problem from one who cannot do
 * quadratics, and only the split by format tells the two apart.
 */
export type Practice = Summary & {
  /** Every concept asked about: missed ones worst first, then the clean ones. */
  topics: Bucket[];
  /** Every way a question was asked, worst first. */
  formats: Bucket[];
  /** How each difficulty went, easiest first. */
  difficulties: Bucket[];
  /** The longest unbroken run of correct answers. */
  bestRun: number;
  /** Middle time per answer, in ms, or null when none were timed. */
  medianMs: number | null;
};

const RAMP: Difficulty[] = ["easy", "medium", "hard"];

export function reviewPractice(details: AnswerDetail[]): Practice {
  const topics = byTopic(details);
  const times = details
    .map((d) => d.ms)
    .filter((ms): ms is number => typeof ms === "number");

  return {
    ...summarize(details),
    topics: [...struggles(topics), ...solid(topics)],
    formats: byFormat(details).sort((a, b) => a.accuracy - b.accuracy),
    difficulties: byDifficulty(details).sort(
      (a, b) =>
        RAMP.indexOf(a.key as Difficulty) - RAMP.indexOf(b.key as Difficulty),
    ),
    bestRun: bestRun(details),
    medianMs: median(times),
  };
}

/** The longest streak of correct answers, in a row, anywhere in the set. */
export function bestRun(details: AnswerDetail[]): number {
  let best = 0;
  let run = 0;
  for (const d of details) {
    run = d.correct ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** The middle value, or null for none. An even count takes both middles. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const at = sorted.length >> 1;
  return sorted.length % 2 ? sorted[at] : (sorted[at - 1] + sorted[at]) / 2;
}

/**
 * How far apart two formats have to be before the gap is worth naming rather
 * than being the ordinary bounce of a dozen questions.
 */
const FORMAT_GAP = 0.25;

/**
 * The kind of question that went worst, when it went *clearly* worst.
 *
 * Null most of the time, and deliberately: with a dozen questions split three
 * ways one format is always nominally last, and saying so every session would
 * teach a student to distrust the one line here that is worth reading. It has
 * to have been missed at least twice, and beaten by a wide margin, before it
 * is a problem type rather than a coincidence.
 */
export function weakestFormat(p: Practice): Bucket | null {
  const seen = p.formats.filter((b) => b.total >= 2);
  if (seen.length < 2) return null;

  // `formats` is already sorted worst-accuracy first, and filtering keeps that.
  const worst = seen[0];
  if (worst.wrong < 2) return null;

  const best = Math.max(...seen.slice(1).map((b) => b.accuracy));
  return best - worst.accuracy >= FORMAT_GAP ? worst : null;
}

/**
 * One sentence on what went well, always. A set that went badly still went
 * well somewhere, and the honest version of that — a run, a concept, a count —
 * is worth more than encouragement that names nothing.
 */
export function praise(p: Practice): string {
  if (p.total === 0) return "Nothing was answered.";
  if (p.correct === p.total) {
    return `Every one of ${p.total}, first time. Nothing here needs another look.`;
  }

  const clean = p.topics.filter((b) => b.wrong === 0 && b.right > 1);
  if (clean.length > 0) {
    const named = clean
      .slice(0, 2)
      .map((b) => b.label)
      .join(" and ");
    const rest =
      clean.length > 2
        ? `, and ${clean.length - 2} more went the same way`
        : "";
    return `${named} came back clean${rest}.`;
  }

  if (p.bestRun >= 3) {
    return `${p.bestRun} correct in a row was the best of it.`;
  }

  if (p.correct > 0) {
    return `${p.correct} of ${p.total} landed — the list below is what stands between that and all of them.`;
  }

  return "Nothing landed this time. This set is worth reading through rather than repeating.";
}
