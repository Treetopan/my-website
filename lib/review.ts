import type { Difficulty, Question } from "@/lib/curriculum";
import {
  describeResponse,
  describeReveal,
  isBlank,
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
    timedOut: details.filter(ranOut).length,

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
