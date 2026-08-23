import type { Difficulty } from "@/lib/curriculum";

/**
 * What the student sees after a game. The point is not the score — it is
 * knowing which idea to go back to, so everything here is organised by
 * concept rather than by question order.
 */

export type AnswerDetail = {
  questionId: string;
  prompt: string;
  topic: string;
  options: string[];
  answer: number;
  /** Null when the clock ran out. */
  chosen: number | null;
  difficulty: Difficulty;
  correct: boolean;
  /** Fraction of the clock still left when answered, 0–1. */
  speed: number;
};

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

export function tallyByTopic(details: AnswerDetail[]): TopicTally[] {
  const map = new Map<string, { right: number; wrong: number; paces: number[] }>();

  for (const d of details) {
    const t = map.get(d.topic) ?? { right: 0, wrong: 0, paces: [] };
    if (d.correct) {
      t.right++;
      t.paces.push(d.speed);
    } else {
      t.wrong++;
    }
    map.set(d.topic, t);
  }

  return [...map.entries()].map(([topic, t]) => ({
    topic,
    right: t.right,
    wrong: t.wrong,
    pace: t.paces.length
      ? t.paces.reduce((a, b) => a + b, 0) / t.paces.length
      : 0,
  }));
}

export function summarize(details: AnswerDetail[]): Summary {
  const total = details.length;
  const correct = details.filter((d) => d.correct).length;
  const tallies = tallyByTopic(details);

  return {
    correct,
    total,
    accuracy: total === 0 ? 0 : correct / total,
    timedOut: details.filter((d) => d.chosen === null).length,

    // Most missed first; ties broken by the one you got least right, so a
    // concept you missed twice out of two outranks two out of four.
    weak: tallies
      .filter((t) => t.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || a.right - b.right),

    // Clean sweeps only. Being fast is what separates them.
    strong: tallies
      .filter((t) => t.wrong === 0 && t.right > 0)
      .sort((a, b) => b.pace - a.pace),

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
