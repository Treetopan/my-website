import "server-only";

import {
  among,
  ask,
  dp,
  fill,
  frac,
  head,
  line,
  order,
  other,
  point,
  properFraction,
  shuffled,
  signed,
  slider,
  type Built,
  type Rng,
} from "./kit";

/**
 * Grade 8 generators.
 *
 * Keyed by subunit, and in the same order as this subunit's entry in
 * `GENERATED` — a generator's index is baked into every instance id it has
 * minted, so append rather than insert.
 *
 * Same two rules as the three courses below it. What is new is the `line`
 * kind: this is the year lines arrive, and a line is the one thing a student
 * can get right in a way that four options cannot ask about and a typed answer
 * only describes. Six generators here hand over two draggable handles instead.
 *
 * The course stops deliberately short of Algebra 1. Slope and intercept are
 * read, drawn and interpreted; point-slope form, standard form and elimination
 * belong to the course after this one.
 */

// ─── Small helpers ───────────────────────────────────────

/** A second slope: never zero, and never the one already drawn. */
function otherSlope(r: Rng, avoid: number, limit: number): number {
  let value = r.nonzero(-limit, limit);
  while (value === avoid) value = r.nonzero(-limit, limit);
  return value;
}

/**
 * "3x - 4": a slope and an intercept written the way they are read, with a
 * coefficient of 1 left implicit and a zero intercept left out.
 */
function slopeExpr(slope: number, intercept: number): string {
  if (slope === 0) return String(intercept);
  return `${head(slope, "x")}${signed(intercept)}`;
}

/** The same, as an equation. */
function lineText(slope: number, intercept: number): string {
  return `y = ${slopeExpr(slope, intercept)}`;
}

/** Numbers written three ways, no two of them equal, for ordering. */
const IRRATIONAL_POOL = [
  { text: "√2", value: Math.SQRT2 },
  { text: "√5", value: Math.sqrt(5) },
  { text: "√10", value: Math.sqrt(10) },
  { text: "√17", value: Math.sqrt(17) },
  { text: "π", value: Math.PI },
  { text: "1/2", value: 0.5 },
  { text: "1.75", value: 1.75 },
  { text: "3", value: 3 },
  { text: "9/2", value: 4.5 },
  { text: "5", value: 5 },
];

/**
 * Boxes whose space diagonal is a whole number.
 *
 * √(a² + b² + c²) almost never comes out whole, and a Grade 8 answer of
 * "√173" is a different question from the one being asked, so the boxes are
 * chosen rather than rolled.
 */
const QUADRUPLES = [
  [1, 2, 2, 3],
  [2, 3, 6, 7],
  [1, 4, 8, 9],
  [4, 4, 7, 9],
  [2, 6, 9, 11],
  [6, 6, 7, 11],
  [3, 4, 12, 13],
  [6, 8, 24, 26],
] as const;

/** "12π", and the two coefficients that do not want writing out. */
function pi(coefficient: number): string {
  if (coefficient === 0) return "0";
  if (coefficient === 1) return "π";
  return `${coefficient}π`;
}

/** π to the two places these questions use, so the answers stay exact. */
const PI = 3.14;

/** Right triangles with whole sides, so no answer needs a calculator. */
const TRIPLES = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [9, 12, 15],
  [8, 15, 17],
  [12, 16, 20],
  [7, 24, 25],
  [10, 24, 26],
  [20, 21, 29],
] as const;

/** Perfect squares, for the roots that come out whole. */
function square(r: Rng, from: number, to: number): number {
  const root = r.int(from, to);
  return root * root;
}

/** A number that is not a perfect square, so its root is irrational. */
function nonSquare(r: Rng, from: number, to: number): number {
  let n = r.int(from, to);
  while (Number.isInteger(Math.sqrt(n))) n = r.int(from, to);
  return n;
}

export const GRADE_8: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.1 Rational and irrational numbers ──
  "math/grade-8/unit-1/1.1": [
    // Which one is irrational is a classification, and the only ask here that
    // four options do not answer for you.
    (r) => {
      const irrational = `√${r.pick([2, 3, 5, 7, 11, 13, 17, 19])}`;
      const rational = [
        `√${square(r, 2, 9)}`,
        `${r.int(1, 9)}/${r.int(2, 9)}`,
        `${dp(r.int(1, 99) / 100)}`,
        `-${r.int(2, 20)}`,
      ];
      return ask(
        "Which of these is irrational?",
        irrational,
        shuffled(rational, r).slice(0, 3),
        r,
      );
    },
    (r) => {
      const pool = [
        { text: "√2", irrational: true },
        { text: "√9", irrational: false },
        { text: "π", irrational: true },
        { text: "3/8", irrational: false },
        { text: "√7", irrational: true },
        { text: "0.75", irrational: false },
        { text: "√25", irrational: false },
        { text: "√11", irrational: true },
      ];
      const shown = shuffled(pool, r).slice(0, 5);
      return fill(
        `How many of these are irrational? ${shown.map((s) => s.text).join(", ")}`,
        shown.filter((s) => s.irrational).length,
        { hint: "a number from 0 to 5" },
      );
    },
    (r) => {
      const root = r.int(2, 12);
      return slider(`√${root * root} is rational. Place its value.`, {
        min: 0,
        max: 15,
        step: 1,
        value: root,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 1.2 Converting repeating decimals to fractions ──
  "math/grade-8/unit-1/1.2": [
    (r) => {
      const digit = r.int(1, 8);
      return fill(
        `The decimal 0.${digit}${digit}${digit}... repeats forever. Write it as a fraction in lowest terms.`,
        frac(digit, 9),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const first = r.int(1, 9);
      const second = r.int(0, 9);
      return fill(
        `A repeating decimal repeats the two digits ${first}${second} for ever and equals ?/99. What is the numerator?`,
        first * 10 + second,
        { hint: "a number" },
      );
    },
    (r) => {
      const digit = r.int(1, 8);
      return slider(
        `Place the numerator: 0.${digit}${digit}${digit}... = ?/9`,
        { min: 0, max: 9, step: 1, value: digit, full: 1, zero: 3 },
      );
    },
  ],

  // ── 1.3 Approximating irrational numbers ──
  "math/grade-8/unit-1/1.3": [
    (r) => {
      const n = nonSquare(r, 5, 99);
      return fill(
        `Between which two consecutive whole numbers does √${n} lie? Type the smaller one.`,
        Math.floor(Math.sqrt(n)),
        { hint: "a number" },
      );
    },
    (r) => {
      const n = nonSquare(r, 5, 99);
      return fill(`Round √${n} to the nearest whole number.`, Math.round(Math.sqrt(n)), {
        hint: "a number",
      });
    },
    (r) => {
      const n = nonSquare(r, 5, 99);
      return slider(`Place √${n} on a number line, to the nearest tenth.`, {
        min: 0,
        max: 10,
        step: 0.1,
        value: dp(Math.sqrt(n), 1),
        full: 0.1,
        zero: 1,
      });
    },
  ],

  // ── 1.4 Comparing and ordering irrational numbers ──
  "math/grade-8/unit-1/1.4": [
    // Ordering is the ask this subunit is about, and it is the one a list of
    // four options cannot pose.
    (r) =>
      order(
        "Put these numbers in order, smallest first.",
        shuffled(IRRATIONAL_POOL, r)
          .slice(0, 4)
          .sort((a, b) => a.value - b.value)
          .map((n) => n.text),
        r,
      ),
    (r) => {
      const n = nonSquare(r, 5, 99);
      const whole = r.int(2, 9);
      return fill(
        `Which is greater, √${n} or ${whole}? Type the greater one.`,
        Math.sqrt(n) > whole ? `√${n}` : String(whole),
        { hint: "one of the two" },
      );
    },
    (r) => {
      const n = nonSquare(r, 5, 99);
      return slider(`Place √${n} to the nearest tenth on a 0 to 10 line.`, {
        min: 0,
        max: 10,
        step: 0.1,
        value: dp(Math.sqrt(n), 1),
        full: 0.1,
        zero: 1,
      });
    },
  ],

  // ── 1.5 Square roots and cube roots ──
  "math/grade-8/unit-1/1.5": [
    (r) => {
      const root = r.int(2, 15);
      return fill(`What is √${root * root}?`, root, { hint: "a number" });
    },
    (r) => {
      const root = r.int(2, 8);
      return fill(`What is the cube root of ${root ** 3}?`, root, {
        hint: "a number",
      });
    },
    (r) => {
      const root = r.int(2, 8);
      return slider(`Place the cube root of ${root ** 3}.`, {
        min: 0,
        max: 10,
        step: 1,
        value: root,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 1.6 Solving x² = p and x³ = p ──
  "math/grade-8/unit-1/1.6": [
    (r) => {
      const root = r.int(2, 15);
      return fill(
        `Solve x² = ${root * root}. What is the positive solution?`,
        root,
        { hint: "a number" },
      );
    },
    (r) => {
      const root = r.int(2, 8);
      return fill(`Solve x³ = ${root ** 3}.`, root, { hint: "a number" });
    },
    (r) => {
      const root = r.int(2, 12);
      return slider(`Solve x² = ${root * root} and place the positive solution.`, {
        min: 0,
        max: 15,
        step: 1,
        value: root,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 2.1 Properties of integer exponents ──
  "math/grade-8/unit-2/2.1": [
    (r) => {
      const base = r.int(2, 9);
      const first = r.int(2, 8);
      const second = r.int(2, 8);
      return fill(
        `Simplify to a single power: ${base}^${first} × ${base}^${second}`,
        `${base}^${first + second}`,
        { hint: "a power of the same base" },
      );
    },
    (r) => {
      const base = r.int(2, 9);
      const second = r.int(2, 6);
      const first = second + r.int(1, 7);
      return fill(
        `What is the exponent when ${base}^${first} is divided by ${base}^${second}?`,
        first - second,
        { hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(2, 9);
      const first = r.int(2, 6);
      const second = r.int(2, 5);
      return slider(`Place the exponent of (${base}^${first})^${second}.`, {
        min: 0,
        max: 30,
        step: 1,
        value: first * second,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 2.2 Zero and negative exponents ──
  "math/grade-8/unit-2/2.2": [
    (r) => {
      const base = r.int(2, 6);
      const exponent = r.int(2, 4);
      return fill(
        `Evaluate ${base}^-${exponent} as a fraction.`,
        frac(1, base ** exponent),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const base = r.int(2, 9);
      const exponent = r.int(2, 8);
      return fill(
        `${base}^0 × ${base}^${exponent} = ${base}^? What is the exponent?`,
        exponent,
        { hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(2, 9);
      const negative = r.int(1, 5);
      const positive = negative + r.int(1, 6);
      return slider(
        `Place the exponent of ${base}^-${negative} × ${base}^${positive}.`,
        { min: 0, max: 12, step: 1, value: positive - negative, full: 1, zero: 3 },
      );
    },
  ],

  // ── 2.3 Simplifying exponential expressions ──
  "math/grade-8/unit-2/2.3": [
    (r) => {
      const base = r.int(2, 9);
      const inner = r.int(2, 5);
      const power = r.int(2, 4);
      const divide = r.int(1, inner * power - 1);
      return fill(
        `Simplify to a single power: (${base}^${inner})^${power} ÷ ${base}^${divide}`,
        `${base}^${inner * power - divide}`,
        { hint: "a power of the same base" },
      );
    },
    (r) => {
      const base = r.int(2, 9);
      const negative = r.int(1, 5);
      const positive = negative + r.int(1, 8);
      return fill(
        `What is the exponent in ${base}^${positive} × ${base}^-${negative}?`,
        positive - negative,
        { hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(2, 9);
      const first = r.int(1, 4);
      const second = r.int(1, 4);
      const power = r.int(2, 3);
      return slider(
        `Place the exponent of (${base}^${first} × ${base}^${second})^${power}.`,
        { min: 0, max: 30, step: 1, value: (first + second) * power, full: 1, zero: 5 },
      );
    },
  ],

  // ── 2.4 Scientific notation ──
  "math/grade-8/unit-2/2.4": [
    (r) => {
      const lead = dp(r.int(11, 99) / 10, 1);
      const exponent = r.int(2, 6);
      return fill(
        `Write ${dp(lead * 10 ** exponent, 1)} in scientific notation. Type it like 3.4 × 10^5.`,
        `${lead} × 10^${exponent}`,
        {
          accept: [`${lead}x10^${exponent}`, `${lead}*10^${exponent}`],
          hint: "a number times a power of ten",
        },
      );
    },
    (r) => {
      const lead = dp(r.int(11, 99) / 10, 1);
      const exponent = r.int(2, 6);
      return fill(
        `Write ${lead} × 10^${exponent} as a plain number.`,
        dp(lead * 10 ** exponent, 1),
        { hint: "a number" },
      );
    },
    (r) => {
      const lead = dp(r.int(11, 99) / 10, 1);
      const exponent = r.int(2, 8);
      return slider(
        `Place the exponent when ${dp(lead * 10 ** exponent, 1)} is written in scientific notation.`,
        { min: 0, max: 10, step: 1, value: exponent, full: 1, zero: 3 },
      );
    },
  ],

  // ── 2.5 Operations in scientific notation ──
  "math/grade-8/unit-2/2.5": [
    (r) => {
      const first = r.int(2, 3);
      const second = r.int(2, 3);
      const firstPower = r.int(2, 8);
      const secondPower = r.int(2, 8);
      return fill(
        `(${first} × 10^${firstPower}) × (${second} × 10^${secondPower}) = ? × 10^${firstPower + secondPower}. What is the leading number?`,
        first * second,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(4, 9);
      const second = r.int(2, 3);
      const secondPower = r.int(2, 6);
      const firstPower = secondPower + r.int(1, 6);
      return fill(
        `Divide (${first} × 10^${firstPower}) by (${second} × 10^${secondPower}). What is the exponent of the answer?`,
        firstPower - secondPower,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 3);
      const second = r.int(2, 3);
      const firstPower = r.int(2, 6);
      const secondPower = r.int(2, 6);
      return slider(
        `Place the exponent of (${first} × 10^${firstPower}) × (${second} × 10^${secondPower}).`,
        { min: 0, max: 15, step: 1, value: firstPower + secondPower, full: 1, zero: 3 },
      );
    },
  ],

  // ── 2.6 Comparing magnitudes ──
  "math/grade-8/unit-2/2.6": [
    (r) => {
      const lead = r.int(2, 9);
      const smaller = r.int(2, 6);
      const larger = smaller + r.int(1, 5);
      return fill(
        `How many times larger is ${lead} × 10^${larger} than ${lead} × 10^${smaller}?`,
        10 ** (larger - smaller),
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 9);
      const second = r.int(2, 9);
      const firstPower = r.int(2, 9);
      const secondPower = other(r, firstPower, 2, 9);
      return fill(
        `Which is larger, ${first} × 10^${firstPower} or ${second} × 10^${secondPower}? Type the exponent of the larger one.`,
        Math.max(firstPower, secondPower),
        { hint: "a number" },
      );
    },
    (r) => {
      const lead = r.int(2, 9);
      const smaller = r.int(2, 6);
      const larger = smaller + r.int(1, 6);
      return slider(
        `Place the difference in exponents between ${lead} × 10^${larger} and ${lead} × 10^${smaller}.`,
        { min: 0, max: 10, step: 1, value: larger - smaller, full: 1, zero: 3 },
      );
    },
  ],

  // ── 2.7 Choosing units for very large or small quantities ──
  "math/grade-8/unit-2/2.7": [
    // Which unit fits is a judgement about scale, and it is a name rather than
    // a number.
    (r) => {
      const measure = r.pick([
        { thing: "the distance between two cities", unit: "Kilometres" },
        { thing: "the thickness of a hair", unit: "Millimetres" },
        { thing: "the mass of a person", unit: "Kilograms" },
        { thing: "the mass of a grain of rice", unit: "Milligrams" },
      ]);
      return among(
        `Which unit best measures ${measure.thing}?`,
        measure.unit,
        ["Kilometres", "Millimetres", "Kilograms", "Milligrams"],
        r,
      );
    },
    (r) => {
      const thousands = r.int(2, 90);
      return fill(
        `A distance of ${thousands} × 10^3 m is how many kilometres?`,
        thousands,
        { unit: "kilometres", hint: "a number" },
      );
    },
    (r) => {
      const lead = r.int(2, 9);
      const exponent = r.int(4, 6);
      return slider(
        `A mass is ${lead} × 10^${exponent} grams. Place how many kilograms that is.`,
        {
          min: 0,
          max: 9000,
          step: 10,
          value: lead * 10 ** (exponent - 3),
          unit: "kilograms",
          full: 10,
          zero: 900,
        },
      );
    },
  ],

  // ── 3.1 Solving multi-step equations ──
  "math/grade-8/unit-3/3.1": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      const x = r.int(2, 12);
      return fill(`Solve for x: ${a}(x + ${b}) = ${a * (x + b)}`, x, {
        hint: "a number",
      });
    },
    (r) => {
      const c = r.int(2, 5);
      const a = c + r.int(2, 7);
      const b = r.int(2, 15);
      const x = r.int(2, 10);
      return fill(
        `Collect and solve: ${a}x + ${b} - ${c}x = ${(a - c) * x + b}`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 10);
      const x = r.int(2, 12);
      return slider(`Solve ${a}(x - ${b}) = ${a * (x - b)} and place x.`, {
        min: 0,
        max: 15,
        step: 1,
        value: x,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 3.2 Equations with variables on both sides ──
  "math/grade-8/unit-3/3.2": [
    (r) => {
      const c = r.int(2, 6);
      const a = c + r.int(1, 6);
      const b = r.int(2, 20);
      const x = r.int(2, 12);
      return fill(
        `Solve for x: ${a}x + ${b} = ${c}x + ${b + (a - c) * x}`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const cheap = r.int(2, 6);
      const dear = cheap + r.int(1, 5);
      const miles = r.int(2, 12);
      const base = miles * (dear - cheap);
      return fill(
        `Two taxis charge $${base} plus $${cheap} a mile and nothing plus $${dear} a mile. At how many miles do they cost the same?`,
        miles,
        { unit: "miles", hint: "a number" },
      );
    },
    (r) => {
      const c = r.int(2, 5);
      const a = c + r.int(1, 5);
      const x = r.int(2, 10);
      const b = r.int(1, (a - c) * x - 1);
      return slider(
        `Solve ${a}x - ${b} = ${c}x + ${(a - c) * x - b} and place x.`,
        { min: 0, max: 12, step: 1, value: x, full: 1, zero: 3 },
      );
    },
  ],

  // ── 3.3 Equations with rational coefficients ──
  "math/grade-8/unit-3/3.3": [
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5, 6]);
      const x = d * r.int(2, 6);
      const b = r.int(2, 15);
      return fill(
        `Solve for x: (${n}/${d})x + ${b} = ${(n * x) / d + b}`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      // A coefficient ending in .1 would print "1x", which reads as a
      // coefficient of 1 with a stray decimal in front of it.
      let tenths = r.int(11, 49);
      while (tenths % 10 === 1) tenths = r.int(11, 49);
      const coefficient = dp(tenths / 10, 1);
      const x = r.int(2, 12);
      const b = r.int(2, 15);
      return fill(
        `Multiply through and solve: ${coefficient}x + ${b} = ${dp(coefficient * x + b, 1)}`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5]);
      const x = d * r.int(2, 5);
      return slider(`Solve (${n}/${d})x = ${(n * x) / d} and place x.`, {
        min: 0,
        max: 25,
        step: 1,
        value: x,
        full: 1,
        zero: 5,
      });
    },
  ],

  // ── 3.4 One solution, no solution, infinitely many ──
  "math/grade-8/unit-3/3.4": [
    // How many solutions is a classification, and the three answers are the
    // whole of what this subunit teaches.
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 15);
      const kind = r.int(0, 2);
      const c = r.int(2, 9);
      const equation =
        kind === 0
          ? `${a}x + ${b} = ${a}x + ${other(r, b, 2, 15)}`
          : kind === 1
            ? `${a}x + ${b} = ${a}x + ${b}`
            : `${a}x + ${b} = ${other(r, a, 2, 9)}x + ${c}`;
      return among(
        `How many solutions does ${equation} have?`,
        kind === 0 ? "None" : kind === 1 ? "Infinitely many" : "Exactly one",
        ["None", "Infinitely many", "Exactly one", "Exactly two"],
        r,
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 15);
      return fill(
        `${a}x + ${b} = ${a}x + ? has infinitely many solutions. What is the missing number?`,
        b,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const c = other(r, a, 2, 9);
      const b = r.int(2, 15);
      const d = r.int(2, 15);
      return fill(
        `How many solutions does ${a}x + ${b} = ${c}x + ${d} have? Type a number.`,
        1,
        { hint: "a number" },
      );
    },
  ],

  // ── 3.5 Justifying each step ──
  "math/grade-8/unit-3/3.5": [
    // Solving is a sequence, so the order of the steps is asked as one.
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 15);
      const x = r.int(2, 12);
      return order(
        `Put the steps of solving ${a}x + ${b} = ${a * x + b} in order.`,
        [
          `Subtract ${b} from both sides`,
          `Divide both sides by ${a}`,
          `Write x = ${x}`,
          "Check by substituting back",
        ],
        r,
      );
    },
    // Naming the property is a name, which is what four options are for.
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      return among(
        `Which property lets you write ${a}(x + ${b}) as ${a}x + ${a * b}?`,
        "The distributive property",
        [
          "The distributive property",
          "The commutative property",
          "The associative property",
          "The identity property",
        ],
        r,
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 15);
      const x = r.int(2, 12);
      return fill(
        `In solving ${a}x + ${b} = ${a * x + b}, what do you subtract from both sides first?`,
        b,
        { hint: "a number" },
      );
    },
  ],

  // ── 3.6 Modeling with linear equations ──
  "math/grade-8/unit-3/3.6": [
    (r) => {
      const base = r.int(10, 40);
      const perGig = r.int(2, 9);
      const gigabytes = r.int(2, 15);
      return fill(
        `A phone plan costs $${base} plus $${perGig} a gigabyte, and the bill was $${base + perGig * gigabytes}. How many gigabytes were used?`,
        gigabytes,
        { unit: "gigabytes", hint: "a number" },
      );
    },
    (r) => {
      const width = r.int(3, 20);
      const extra = r.int(2, 10);
      return fill(
        `The perimeter of a rectangle is ${2 * (2 * width + extra)} cm and the length is ${extra} cm more than the width. What is the width?`,
        width,
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const rate = r.int(2, 9);
      const hours = r.int(2, 10);
      const end = r.int(5, 40);
      return slider(
        `A tank holds ${end + rate * hours} litres and loses ${rate} litres an hour. Place the hours until it holds ${end}.`,
        { min: 0, max: 12, step: 1, value: hours, unit: "hours", full: 1, zero: 3 },
      );
    },
  ],

  // ── 4.1 Proportional relationships as lines through the origin ──
  "math/grade-8/unit-4/4.1": [
    // A line is the one answer four options cannot ask for and a typed one
    // only describes, so this subunit hands over the handles.
    (r) => {
      const slope = r.nonzero(-3, 3);
      return line(`Draw the line ${lineText(slope, 0)}.`, {
        span: 10,
        slope,
        intercept: 0,
      });
    },
    (r) => {
      const slope = r.nonzero(-4, 4);
      const x = r.int(2, 6);
      return fill(
        `A line through the origin passes through (${x}, ${slope * x}). What is its equation? Type it like y = 3x.`,
        lineText(slope, 0),
        { hint: "an equation in x and y" },
      );
    },
    (r) => {
      const slope = r.nonzero(-3, 3);
      const x = r.int(1, 3);
      return point(`Plot the point where ${lineText(slope, 0)} meets x = ${x}.`, {
        span: 10,
        x,
        y: slope * x,
      });
    },
  ],

  // ── 4.2 Slope as a constant rate of change ──
  "math/grade-8/unit-4/4.2": [
    (r) => {
      const rise = r.int(2, 24);
      const run = r.int(2, 8);
      return fill(
        `A line rises ${rise} for every ${run} across. What is its slope?`,
        frac(rise, run),
        { hint: "a number or fraction" },
      );
    },
    (r) => {
      const rate = r.int(2, 12);
      const minutes = r.int(2, 9);
      return fill(
        `A tank fills ${rate * minutes} litres every ${minutes} minutes. What is the rate a minute?`,
        rate,
        { unit: "litres a minute", hint: "a number" },
      );
    },
    (r) => {
      const slope = r.int(1, 9);
      const run = r.int(2, 6);
      return slider(
        `Place the slope of a line rising ${slope * run} for every ${run} across.`,
        { min: 0, max: 10, step: 1, value: slope, full: 1, zero: 3 },
      );
    },
  ],

  // ── 4.3 Similar triangles and why slope is constant ──
  "math/grade-8/unit-4/4.3": [
    (r) => {
      const rise = r.int(2, 9);
      const run = r.int(2, 6);
      const times = r.int(2, 5);
      return fill(
        `On a line, one slope triangle rises ${rise} over a run of ${run}. Another has a run of ${run * times}. What is its rise?`,
        rise * times,
        { hint: "a number" },
      );
    },
    // Why the slope does not change is a reason, not a number.
    (r) =>
      among(
        "Why is the slope of a straight line the same wherever you measure it?",
        "The slope triangles along it are similar",
        [
          "The slope triangles along it are similar",
          "Because the line is straight, so nothing can change",
          "Because slopes are always whole numbers",
          "Because the axes meet at a right angle",
        ],
        r,
      ),
    (r) => {
      const rise = r.int(2, 8);
      const run = r.int(2, 5);
      const times = r.int(2, 4);
      return slider(
        `A slope triangle has a rise of ${rise} and a run of ${run}. Place the rise of a similar triangle with a run of ${run * times}.`,
        { min: 0, max: 32, step: 1, value: rise * times, full: 1, zero: 5 },
      );
    },
  ],

  // ── 4.4 Slope from two points ──
  "math/grade-8/unit-4/4.4": [
    (r) => {
      const x1 = r.int(-8, 4);
      const x2 = x1 + r.int(1, 6);
      const y1 = r.int(-9, 9);
      const y2 = r.int(-9, 9);
      return fill(
        `What is the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2})?`,
        frac(y2 - y1, x2 - x1),
        { hint: "a number or fraction" },
      );
    },
    (r) => {
      const slope = r.nonzero(-4, 4);
      const x1 = r.int(-5, 5);
      const y1 = r.int(-9, 9);
      const x2 = x1 + r.int(1, 5);
      return fill(
        `A line through (${x1}, ${y1}) has a slope of ${slope}. What is y when x is ${x2}?`,
        y1 + slope * (x2 - x1),
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.int(-5, 5);
      const x1 = r.int(-6, 2);
      const x2 = x1 + r.int(1, 4);
      const y1 = r.int(-8, 8);
      return slider(
        `Place the slope of the line through (${x1}, ${y1}) and (${x2}, ${y1 + slope * (x2 - x1)}).`,
        { min: -6, max: 6, step: 1, value: slope, full: 1, zero: 3 },
      );
    },
  ],

  // ── 4.5 Slope-intercept form ──
  "math/grade-8/unit-4/4.5": [
    (r) => {
      const slope = r.nonzero(-5, 5);
      const intercept = r.nonzero(-9, 9);
      return fill(
        `In ${lineText(slope, intercept)}, what is the y-intercept?`,
        intercept,
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.nonzero(-3, 3);
      const intercept = r.int(-5, 5);
      return line(`Draw the line ${lineText(slope, intercept)}.`, {
        span: 10,
        slope,
        intercept,
      });
    },
    (r) => {
      const slope = r.nonzero(-5, 5);
      const intercept = r.nonzero(-9, 9);
      return slider(`Place the slope of ${lineText(slope, intercept)}.`, {
        min: -6,
        max: 6,
        step: 1,
        value: slope,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 4.6 Graphing from an equation ──
  "math/grade-8/unit-4/4.6": [
    (r) => {
      const slope = r.nonzero(-3, 3);
      const intercept = r.int(-6, 6);
      return line(`Draw the line ${lineText(slope, intercept)}.`, {
        span: 10,
        slope,
        intercept,
      });
    },
    (r) => {
      const slope = r.nonzero(-4, 4);
      const intercept = r.nonzero(-9, 9);
      return point(`Plot the y-intercept of ${lineText(slope, intercept)}.`, {
        span: 10,
        x: 0,
        y: intercept,
      });
    },
    (r) => {
      const slope = r.nonzero(-5, 5);
      const intercept = r.nonzero(-9, 9);
      const x = r.int(-4, 4);
      return fill(
        `On the line ${lineText(slope, intercept)}, what is y when x is ${x}?`,
        slope * x + intercept,
        { hint: "a number" },
      );
    },
  ],

  // ── 4.7 Writing an equation from a graph ──
  "math/grade-8/unit-4/4.7": [
    (r) => {
      const slope = r.nonzero(-4, 4);
      const intercept = r.nonzero(-9, 9);
      const x = r.int(1, 4);
      return fill(
        `A line passes through (0, ${intercept}) and (${x}, ${slope * x + intercept}). What is its equation? Type it like y = 2x + 3.`,
        lineText(slope, intercept),
        { hint: "an equation in x and y" },
      );
    },
    (r) => {
      const slope = r.nonzero(-5, 5);
      const intercept = r.nonzero(-9, 9);
      const x = r.int(2, 6);
      return fill(
        `A line crosses the y-axis at ${intercept} and has a slope of ${slope}. What is y when x is ${x}?`,
        slope * x + intercept,
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.nonzero(-3, 3);
      const intercept = r.int(-6, 6);
      return line(
        `Draw the line through (0, ${intercept}) with a slope of ${slope}.`,
        { span: 10, slope, intercept },
      );
    },
  ],

  // ── 4.8 Comparing relationships across representations ──
  "math/grade-8/unit-4/4.8": [
    (r) => {
      const first = r.int(2, 9);
      const x = r.int(2, 5);
      const second = other(r, first, 2, 9);
      return fill(
        `Line A has a slope of ${first}. Line B passes through (0, 0) and (${x}, ${second * x}). Which has the greater slope? Type A or B.`,
        first > second ? "A" : "B",
        { hint: "A or B" },
      );
    },
    (r) => {
      const slope = r.nonzero(-6, 6);
      const start = r.int(-9, 9);
      return fill(
        `A table pairs 1 with ${start + slope} and 3 with ${start + 3 * slope}. What is the slope?`,
        slope,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 9);
      const second = other(r, first, 2, 9);
      const x = r.int(2, 5);
      return slider(
        `Place the greater of these two slopes: ${first}, and the slope through (0, 0) and (${x}, ${second * x}).`,
        { min: 0, max: 10, step: 1, value: Math.max(first, second), full: 1, zero: 3 },
      );
    },
  ],

  // ── 4.9 Interpreting slope and intercept in context ──
  "math/grade-8/unit-4/4.9": [
    (r) => {
      const perMile = r.int(2, 9);
      const fixed = r.int(2, 15);
      return fill(
        `A taxi costs ${lineText(perMile, fixed)} dollars for x miles. What is the fixed charge before any distance?`,
        fixed,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const perUnit = r.int(2, 12);
      const fixed = r.int(2, 20);
      return fill(
        `A plan costs ${lineText(perUnit, fixed)} dollars for x units. What is the cost of each unit?`,
        perUnit,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const rate = r.int(2, 9);
      const start = r.int(20, 90);
      return slider(
        `A pool drains so that y = ${start} - ${rate}x litres remain after x minutes. Place the litres it started with.`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: start,
          unit: "litres",
          full: 1,
          zero: 10,
        },
      );
    },
  ],

  // ── 5.1 What a solution to a system means ──
  "math/grade-8/unit-5/5.1": [
    (r) => {
      const slope = r.nonzero(-4, 4);
      const intercept = r.nonzero(-9, 9);
      const x = r.int(-4, 4);
      const onIt = r.bool();
      const y = slope * x + intercept + (onIt ? 0 : r.int(1, 5));
      return fill(
        `Is (${x}, ${y}) a solution of ${lineText(slope, intercept)}? Type yes or no.`,
        onIt ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const x = r.int(-5, 5);
      const y = r.int(-6, 6);
      const first = r.nonzero(-3, 3);
      const second = otherSlope(r, first, 3);
      return point(
        `Plot the solution of the system ${lineText(first, y - first * x)} and ${lineText(second, y - second * x)}.`,
        { span: 10, x, y },
      );
    },
    (r) => {
      const x = r.int(-8, 8);
      const y = r.int(-8, 8);
      return fill(
        `Two lines cross at (${x}, ${y}). What is the solution of the system? Type it like (2, 3).`,
        `(${x}, ${y})`,
        { hint: "a pair of coordinates" },
      );
    },
  ],

  // ── 5.2 Solving systems by graphing ──
  "math/grade-8/unit-5/5.2": [
    (r) => {
      const x = r.int(-5, 5);
      const y = r.int(-6, 6);
      const first = r.nonzero(-3, 3);
      const second = otherSlope(r, first, 3);
      return point(
        `Plot where ${lineText(first, y - first * x)} meets ${lineText(second, y - second * x)}.`,
        { span: 10, x, y },
      );
    },
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-8, 8);
      const first = r.nonzero(-4, 4);
      const second = otherSlope(r, first, 4);
      return fill(
        `Where do ${lineText(first, y - first * x)} and ${lineText(second, y - second * x)} cross? Type the x-coordinate.`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-8, 8);
      const first = r.nonzero(-3, 3);
      const second = otherSlope(r, first, 3);
      return slider(
        `Place the x-coordinate where ${lineText(first, y - first * x)} meets ${lineText(second, y - second * x)}.`,
        { min: -10, max: 10, step: 1, value: x, full: 1, zero: 3 },
      );
    },
  ],

  // ── 5.3 Estimating solutions from a graph ──
  "math/grade-8/unit-5/5.3": [
    // The lines are built to cross half way between two whole numbers, which
    // is the case a graph can only be read approximately.
    (r) => {
      const half = r.int(-9, 8) + 0.5;
      const second = r.pick([-3, -1, 1, 2]);
      const first = second + 2;
      const firstIntercept = r.int(-5, 5);
      const secondIntercept = firstIntercept + (first - second) * half;
      return fill(
        `The lines ${lineText(first, firstIntercept)} and ${lineText(second, secondIntercept)} cross between two whole numbers. What is x exactly? Type it as a decimal.`,
        half,
        { hint: "a number" },
      );
    },
    (r) => {
      const half = r.int(-9, 8) + 0.5;
      const second = r.pick([-3, -1, 1, 2]);
      const first = second + 2;
      const firstIntercept = r.int(-5, 5);
      const secondIntercept = firstIntercept + (first - second) * half;
      return slider(
        `Place the x where ${lineText(first, firstIntercept)} meets ${lineText(second, secondIntercept)}.`,
        { min: -10, max: 10, step: 0.5, value: half, full: 0.5, zero: 2 },
      );
    },
    (r) => {
      const half = r.int(-9, 8) + 0.5;
      const second = r.pick([-3, -1, 1, 2]);
      const first = second + 2;
      const firstIntercept = r.int(-5, 5);
      const secondIntercept = firstIntercept + (first - second) * half;
      return fill(
        `Between which two whole numbers does the solution of ${lineText(first, firstIntercept)} and ${lineText(second, secondIntercept)} lie? Type the smaller one.`,
        Math.floor(half),
        { hint: "a number" },
      );
    },
  ],

  // ── 5.4 Solving by substitution ──
  "math/grade-8/unit-5/5.4": [
    (r) => {
      const slope = r.nonzero(-4, 4);
      const intercept = r.nonzero(-9, 9);
      const x = r.int(-5, 5);
      return fill(
        `Solve by substitution: ${lineText(slope, intercept)} and y = ${slope * x + intercept}. What is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(-5, 5);
      const y = r.int(-8, 8);
      const first = r.nonzero(-3, 3);
      const second = otherSlope(r, first, 3);
      return fill(
        `Find y at the solution of ${lineText(first, y - first * x)} and ${lineText(second, y - second * x)}.`,
        y,
        { hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(-6, 6);
      const y = r.int(-8, 8);
      const first = r.nonzero(-3, 3);
      const second = otherSlope(r, first, 3);
      return slider(
        `Place x where ${lineText(first, y - first * x)} and ${lineText(second, y - second * x)} agree.`,
        { min: -10, max: 10, step: 1, value: x, full: 1, zero: 3 },
      );
    },
  ],

  // ── 5.5 Solving by elimination ──
  "math/grade-8/unit-5/5.5": [
    (r) => {
      const x = r.int(2, 20);
      const y = r.int(1, x - 1);
      return fill(
        `Solve by elimination: x + y = ${x + y} and x - y = ${x - y}. What is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const larger = r.int(5, 40);
      const smaller = r.int(1, larger - 1);
      return fill(
        `Two numbers add to ${larger + smaller} and differ by ${larger - smaller}. What is the smaller one?`,
        smaller,
        { hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(2, 12);
      const y = r.int(1, 12);
      const first = r.int(2, 5);
      const second = r.int(2, 5);
      return slider(
        `Place x: ${first}x + y = ${first * x + y} and ${second}x - y = ${second * x - y}.`,
        { min: 0, max: 15, step: 1, value: x, full: 1, zero: 3 },
      );
    },
  ],

  // ── 5.6 Systems with no solution or infinitely many ──
  "math/grade-8/unit-5/5.6": [
    // How many solutions a pair of lines has is a classification, and it is
    // the whole of this subunit.
    (r) =>
      among(
        "How many solutions does a system of two parallel lines have?",
        "None",
        ["None", "Exactly one", "Infinitely many", "Exactly two"],
        r,
      ),
    (r) => {
      const slope = r.nonzero(-5, 5);
      const first = r.nonzero(-9, 9);
      const second = other(r, first, -9, 9);
      return fill(
        `Two lines both have a slope of ${slope} but cross the y-axis at ${first} and ${second}. How many solutions does the system have? Type a number.`,
        0,
        { hint: "a number" },
      );
    },
    (r) => {
      const kind = r.pick([
        { clue: "are the same line written twice", answer: "infinite" },
        { clue: "have the same slope and different intercepts", answer: "0" },
        { clue: "have different slopes", answer: "1" },
      ]);
      return fill(
        `A system's two equations ${kind.clue}. How many solutions are there? Type a number, or infinite.`,
        kind.answer,
        { hint: "a number, or infinite" },
      );
    },
  ],

  // ── 5.7 Modeling with systems ──
  "math/grade-8/unit-5/5.7": [
    (r) => {
      const adultPrice = r.int(8, 20);
      const childPrice = r.int(3, adultPrice - 1);
      const adults = r.int(2, 12);
      const children = r.int(2, 12);
      return fill(
        `Adult tickets cost $${adultPrice} and child tickets $${childPrice}. ${adults + children} tickets cost $${adultPrice * adults + childPrice * children} altogether. How many adult tickets were there?`,
        adults,
        { unit: "tickets", hint: "a number" },
      );
    },
    (r) => {
      const smaller = r.int(5, 40);
      const gap = 2 * r.int(1, 15);
      return fill(
        `Two numbers add to ${2 * smaller + gap} and one is ${gap} more than the other. What is the larger one?`,
        smaller + gap,
        { hint: "a number" },
      );
    },
    (r) => {
      const cheapMonthly = r.int(5, 20);
      const dearMonthly = cheapMonthly + r.int(1, 8);
      const months = r.int(2, 12);
      const join = months * (dearMonthly - cheapMonthly);
      return slider(
        `Gym A costs $${join} to join and $${cheapMonthly} a month; gym B is free to join and $${dearMonthly} a month. Place the month they cost the same.`,
        { min: 0, max: 15, step: 1, value: months, unit: "months", full: 1, zero: 4 },
      );
    },
  ],

  // ── 6.1 What makes a relation a function ──
  "math/grade-8/unit-6/6.1": [
    (r) => {
      const first = r.int(1, 9);
      const second = r.int(1, 9);
      const third = r.int(1, 9);
      const isFunction = r.bool();
      const inputs = isFunction ? [1, 2, 3] : [1, 2, 1];
      return fill(
        `Is {(${inputs[0]}, ${first}), (${inputs[1]}, ${second}), (${inputs[2]}, ${third})} a function? Type yes or no.`,
        isFunction ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    // What a function is is a definition, so it goes on four options.
    (r) =>
      among(
        "What makes a relation a function?",
        "Every input has exactly one output",
        [
          "Every input has exactly one output",
          "Every output has exactly one input",
          "The inputs and outputs are equal",
          "No number appears twice anywhere",
        ],
        r,
      ),
    (r) => {
      const repeated = r.int(1, 9);
      const others = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== repeated), r);
      const inputs = shuffled([repeated, repeated, others[0], others[1]], r);
      return fill(
        `A relation has inputs ${inputs.join(", ")}. Which repeated input stops it being a function?`,
        repeated,
        { hint: "a number" },
      );
    },
  ],

  // ── 6.2 Function notation and language ──
  "math/grade-8/unit-6/6.2": [
    (r) => {
      const slope = r.nonzero(-6, 6);
      const intercept = r.nonzero(-12, 12);
      const x = r.int(-5, 8);
      return fill(
        `If f(x) = ${slopeExpr(slope, intercept)}, what is f(${x})?`,
        slope * x + intercept,
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.nonzero(-6, 6);
      const intercept = r.nonzero(-12, 12);
      const x = r.int(-5, 8);
      return fill(
        `For f(x) = ${slopeExpr(slope, intercept)}, what x gives f(x) = ${slope * x + intercept}?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.int(1, 5);
      const intercept = r.int(0, 9);
      const x = r.int(1, 8);
      return slider(
        `Place f(${x}) when f(x) = ${slopeExpr(slope, intercept)}.`,
        { min: 0, max: 60, step: 1, value: slope * x + intercept, full: 1, zero: 6 },
      );
    },
  ],

  // ── 6.3 Functions from tables, graphs and equations ──
  "math/grade-8/unit-6/6.3": [
    (r) => {
      const slope = r.nonzero(-6, 6);
      const start = r.int(-9, 9);
      return fill(
        `A table pairs 1 with ${start + slope}, 2 with ${start + 2 * slope} and 3 with ${start + 3 * slope}. What is the output at 4?`,
        start + 4 * slope,
        { hint: "a number" },
      );
    },
    (r) => {
      const shape = r.pick([
        { clue: "a vertical line", isFunction: false },
        { clue: "a horizontal line", isFunction: true },
        { clue: "a straight line sloping upwards", isFunction: true },
        { clue: "a circle", isFunction: false },
      ]);
      return fill(
        `Does the graph of ${shape.clue} represent a function? Type yes or no.`,
        shape.isFunction ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const slope = r.nonzero(-2, 2);
      const intercept = r.int(-4, 4);
      const x = r.int(-3, 3);
      return point(
        `The function is ${lineText(slope, intercept)}. Plot the point at x = ${x}.`,
        { span: 10, x, y: slope * x + intercept },
      );
    },
  ],

  // ── 6.4 Linear versus nonlinear functions ──
  "math/grade-8/unit-6/6.4": [
    // Which equation is not linear is a classification of form.
    (r) => {
      const first = r.int(2, 9);
      const second = r.int(2, 9);
      const third = r.int(2, 9);
      return ask(
        "Which of these is not a linear function?",
        `y = x² + ${first}`,
        [`y = ${second}x + ${third}`, `y = ${first}x`, `y = x - ${second}`],
        r,
      );
    },
    (r) => {
      const start = r.int(1, 9);
      const step = r.int(2, 6);
      const linear = r.bool();
      const second = linear ? start + step : start + step + 1;
      const third = linear ? start + 2 * step : start + 2 * step + 4;
      return fill(
        `A table pairs 1 with ${start}, 2 with ${second} and 3 with ${third}. Is the function linear? Type yes or no.`,
        linear ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const constant = r.int(1, 12);
      return fill(
        `In y = x² + ${constant}, the outputs rise by different amounts. What is the rise from x = 2 to x = 3?`,
        5,
        { hint: "a number" },
      );
    },
  ],

  // ── 6.5 Rate of change and initial value ──
  "math/grade-8/unit-6/6.5": [
    (r) => {
      const start = r.int(2, 30);
      const step = r.int(2, 12);
      const at = r.int(2, 10);
      return fill(
        `A function starts at ${start} and rises ${step} each step. What is its value at step ${at}?`,
        start + step * at,
        { hint: "a number" },
      );
    },
    (r) => {
      const start = r.int(-9, 9);
      const slope = r.nonzero(-6, 6);
      const x = r.int(2, 8);
      return fill(
        `From (0, ${start}) to (${x}, ${start + slope * x}), what is the rate of change?`,
        slope,
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.nonzero(-6, 6);
      const intercept = r.int(0, 20);
      return slider(`Place the initial value of ${lineText(slope, intercept)}.`, {
        min: 0,
        max: 20,
        step: 1,
        value: intercept,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 6.6 Comparing functions in different forms ──
  "math/grade-8/unit-6/6.6": [
    (r) => {
      const first = r.int(2, 9);
      const second = other(r, first, 2, 9);
      const intercept = r.int(-9, 9);
      const x = r.int(2, 5);
      return fill(
        `Which has the greater rate of change: ${lineText(first, intercept)}, or a line through (0, 0) and (${x}, ${second * x})? Type 1 or 2.`,
        first > second ? 1 : 2,
        { hint: "1 or 2" },
      );
    },
    (r) => {
      const slope = r.nonzero(-5, 5);
      const first = r.int(-9, 9);
      const second = other(r, first, -9, 9);
      return fill(
        `Function A is ${lineText(slope, first)} and function B passes through (0, ${second}). Which has the greater initial value? Type A or B.`,
        first > second ? "A" : "B",
        { hint: "A or B" },
      );
    },
    (r) => {
      const first = r.int(2, 9);
      const second = other(r, first, 2, 9);
      const x = r.int(2, 5);
      return slider(
        `Place the greater rate of change: ${first}, or the slope through (0, 0) and (${x}, ${second * x}).`,
        { min: 0, max: 10, step: 1, value: Math.max(first, second), full: 1, zero: 3 },
      );
    },
  ],

  // ── 6.7 Sketching a graph from a verbal description ──
  "math/grade-8/unit-6/6.7": [
    // A description turned into a line, which is the only honest way to ask
    // whether it was understood.
    (r) => {
      const start = r.int(4, 9);
      const rate = r.int(1, 3);
      return line(
        `A tank starts with ${start} litres and loses ${rate} litres a minute. Draw litres against minutes.`,
        { span: 10, slope: -rate, intercept: start },
      );
    },
    (r) => {
      const rate = r.int(2, 9);
      const hours = r.int(2, 9);
      return fill(
        `A journey starts ${rate * hours} km from home and closes ${rate} km each hour. After how many hours is the distance zero?`,
        hours,
        { unit: "hours", hint: "a number" },
      );
    },
    (r) => {
      const rate = r.int(1, 4);
      const hours = r.int(2, 6);
      const start = rate * hours + r.int(2, 15);
      return slider(
        `A candle is ${start} cm tall and burns ${rate} cm an hour. Place its height after ${hours} hours.`,
        {
          min: 0,
          max: 40,
          step: 1,
          value: start - rate * hours,
          unit: "centimetres",
          full: 1,
          zero: 5,
        },
      );
    },
  ],

  // ── 6.8 Qualitative graph analysis ──
  "math/grade-8/unit-6/6.8": [
    // What a shape of graph means is a reading, not a calculation.
    (r) => {
      const shape = r.pick([
        { clue: "is flat for a while", meaning: "The quantity is not changing" },
        { clue: "rises steeply", meaning: "The quantity is growing quickly" },
        { clue: "falls steadily", meaning: "The quantity is shrinking at a steady rate" },
      ]);
      return among(
        `A graph ${shape.clue}. What does that say about the quantity?`,
        shape.meaning,
        [
          "The quantity is not changing",
          "The quantity is growing quickly",
          "The quantity is shrinking at a steady rate",
          "The quantity has become negative",
        ],
        r,
      );
    },
    (r) => {
      const falling = r.bool();
      return fill(
        `A graph ${falling ? "falls steeply and then flattens" : "rises steeply and then flattens"}. Is the quantity increasing or decreasing? Type increasing or decreasing.`,
        falling ? "decreasing" : "increasing",
        { hint: "increasing or decreasing" },
      );
    },
    (r) => {
      const x1 = r.int(0, 5);
      const x2 = x1 + r.int(2, 5);
      const y1 = r.int(0, 20);
      const slope = r.int(1, 9);
      return fill(
        `Between x = ${x1} and x = ${x2} a graph rises from ${y1} to ${y1 + slope * (x2 - x1)}. What is its average rate of change?`,
        slope,
        { hint: "a number" },
      );
    },
  ],

  // ── 7.1 Translations ──
  "math/grade-8/unit-7/7.1": [
    (r) => {
      const x = r.int(-9, 4);
      const y = r.int(-9, 4);
      const right = r.int(1, 6);
      const up = r.int(1, 6);
      return point(
        `Translate (${x}, ${y}) ${right} right and ${up} up. Plot the image.`,
        { span: 10, x: x + right, y: y + up },
      );
    },
    (r) => {
      const x = r.int(-8, 4);
      const y = r.int(-8, 4);
      const right = r.int(1, 6);
      const up = r.int(1, 6);
      return fill(
        `A translation moves (${x}, ${y}) to (${x + right}, ${y + up}). How far right does it move?`,
        right,
        { unit: "units", hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(-4, 9);
      const y = r.int(-4, 9);
      const left = r.int(1, 6);
      const down = r.int(1, 6);
      return point(
        `Plot the image of (${x}, ${y}) under a translation of ${left} left and ${down} down.`,
        { span: 10, x: x - left, y: y - down },
      );
    },
  ],

  // ── 7.2 Reflections ──
  "math/grade-8/unit-7/7.2": [
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      const acrossX = r.bool();
      return point(
        `Reflect (${x}, ${y}) across the ${acrossX ? "x" : "y"}-axis. Plot the image.`,
        { span: 10, x: acrossX ? x : -x, y: acrossX ? -y : y },
      );
    },
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      return fill(
        `Reflecting (${x}, ${y}) across the y-axis gives which x-coordinate?`,
        -x,
        { hint: "a number" },
      );
    },
    // Which coordinate a reflection changes is a rule, not a value.
    (r) => {
      const acrossX = r.bool();
      return among(
        `A reflection across the ${acrossX ? "x" : "y"}-axis changes which coordinate?`,
        acrossX ? "The y-coordinate" : "The x-coordinate",
        [
          "The x-coordinate",
          "The y-coordinate",
          "Both of them",
          "Neither of them",
        ],
        r,
      );
    },
  ],

  // ── 7.3 Rotations ──
  "math/grade-8/unit-7/7.3": [
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      return point(
        `Rotate (${x}, ${y}) 90° counterclockwise about the origin. Plot the image.`,
        { span: 10, x: -y, y: x },
      );
    },
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      return fill(
        `Rotating (${x}, ${y}) 180° about the origin gives which x-coordinate?`,
        -x,
        { hint: "a number" },
      );
    },
    (r) => {
      const turn = r.pick([30, 45, 60, 72, 90, 120]);
      return fill(
        `A rotation of ${turn}° about its centre maps a figure onto itself. How many times does that happen in a full turn?`,
        360 / turn,
        { hint: "a number" },
      );
    },
  ],

  // ── 7.4 Sequences of transformations ──
  "math/grade-8/unit-7/7.4": [
    (r) => {
      const x = r.int(-8, 4);
      const y = r.nonzero(-9, 9);
      const right = r.int(1, 5);
      return point(
        `Translate (${x}, ${y}) ${right} right and then reflect across the x-axis. Plot the image.`,
        { span: 10, x: x + right, y: -y },
      );
    },
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.int(-8, 4);
      const up = r.int(1, 5);
      return fill(
        `Reflect (${x}, ${y}) across the y-axis and then translate ${up} up. What is the y-coordinate of the image?`,
        y + up,
        { hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(-5, 5);
      const y = r.int(-8, 8);
      const right = r.int(1, 5);
      const left = r.int(1, 5);
      return slider(
        `A point at (${x}, ${y}) is translated ${right} right and then ${left} left. Place its final x-coordinate.`,
        { min: -10, max: 10, step: 1, value: x + right - left, full: 1, zero: 3 },
      );
    },
  ],

  // ── 7.5 Congruence through rigid motions ──
  "math/grade-8/unit-7/7.5": [
    // Which motion is not rigid is a classification, and it is the point of
    // the subunit.
    (r) =>
      among(
        "Which transformation does not always preserve size and shape?",
        "A dilation",
        ["A dilation", "A translation", "A reflection", "A rotation"],
        r,
      ),
    (r) => {
      const pool = [
        { name: "translation", rigid: true },
        { name: "reflection", rigid: true },
        { name: "rotation", rigid: true },
        { name: "dilation by 2", rigid: false },
        { name: "dilation by 3", rigid: false },
      ];
      const shown = shuffled(pool, r).slice(0, 4);
      return fill(
        `How many of these preserve congruence: ${shown.map((s) => s.name).join(", ")}?`,
        shown.filter((s) => s.rigid).length,
        { hint: "a number from 0 to 4" },
      );
    },
    (r) => {
      const motion = r.pick([
        { clue: "translated 5 right", congruent: true },
        { clue: "reflected across the y-axis", congruent: true },
        { clue: "rotated 90° about the origin", congruent: true },
        { clue: "dilated by a scale factor of 3", congruent: false },
      ]);
      return fill(
        `A triangle is ${motion.clue}. Is the image congruent to the original? Type yes or no.`,
        motion.congruent ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
  ],

  // ── 7.6 Dilations and scale factor ──
  "math/grade-8/unit-7/7.6": [
    (r) => {
      const x = r.nonzero(-4, 4);
      const y = r.nonzero(-4, 4);
      const factor = r.int(2, Math.floor(9 / Math.max(Math.abs(x), Math.abs(y))));
      return point(
        `Dilate (${x}, ${y}) by a scale factor of ${factor} about the origin. Plot the image.`,
        { span: 10, x: x * factor, y: y * factor },
      );
    },
    (r) => {
      const x = r.nonzero(-5, 5);
      const y = r.nonzero(-5, 5);
      const factor = r.int(2, 5);
      return fill(
        `A dilation about the origin maps (${x}, ${y}) to (${x * factor}, ${y * factor}). What is the scale factor?`,
        factor,
        { hint: "a number" },
      );
    },
    (r) => {
      const side = r.int(2, 12);
      const factor = r.int(2, 6);
      return slider(
        `Place the scale factor that maps a side of ${side} to a side of ${side * factor}.`,
        { min: 0, max: 8, step: 1, value: factor, full: 1, zero: 2 },
      );
    },
  ],

  // ── 7.7 Similarity through transformations ──
  "math/grade-8/unit-7/7.7": [
    (r) => {
      const factor = r.int(2, 5);
      return fill(
        `A figure is dilated by a scale factor of ${factor} and then translated. Is the image similar to the original? Type yes or no.`,
        "yes",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const first = r.int(2, 12);
      const factor = r.int(2, 5);
      const second = r.int(2, 12);
      return fill(
        `Two similar triangles have matching sides of ${first} and ${first * factor}. A second side of the smaller is ${second}. What is the matching side of the larger?`,
        second * factor,
        { hint: "a number" },
      );
    },
    (r) => {
      const side = r.int(2, 10);
      const factor = r.int(2, 6);
      return slider(
        `Place the scale factor between similar figures whose matching sides are ${side} and ${side * factor}.`,
        { min: 0, max: 8, step: 1, value: factor, full: 1, zero: 2 },
      );
    },
  ],

  // ── 7.8 Angles from parallel lines and a transversal ──
  "math/grade-8/unit-7/7.8": [
    (r) => {
      const angle = 5 * r.int(4, 32);
      return fill(
        `Parallel lines are cut by a transversal and one angle is ${angle}°. What is its co-interior angle?`,
        180 - angle,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const angle = 5 * r.int(4, 32);
      return fill(
        `An angle of ${angle}° has a corresponding angle across a transversal of two parallel lines. What is it?`,
        angle,
        { unit: "degrees", hint: "a number" },
      );
    },
    // What alternate interior angles are is a fact about the configuration.
    (r) =>
      among(
        "Alternate interior angles on parallel lines are always what?",
        "Equal",
        ["Equal", "Supplementary", "Complementary", "Right angles"],
        r,
      ),
  ],

  // ── 7.9 Angle sum and exterior angle of a triangle ──
  "math/grade-8/unit-7/7.9": [
    (r) => {
      const first = 5 * r.int(4, 24);
      const second = 5 * r.int(4, Math.floor((175 - first) / 5));
      return fill(
        `A triangle has angles of ${first}° and ${second}°. What is the third?`,
        180 - first - second,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const first = 5 * r.int(4, 24);
      const second = 5 * r.int(4, Math.floor((175 - first) / 5));
      return fill(
        `An exterior angle of a triangle equals the two remote interior angles, ${first}° and ${second}°. What is the exterior angle?`,
        first + second,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const interior = 5 * r.int(4, 34);
      return slider(
        `Place the exterior angle at a vertex whose interior angle is ${interior}°.`,
        {
          min: 0,
          max: 180,
          step: 5,
          value: 180 - interior,
          unit: "degrees",
          full: 5,
          zero: 30,
        },
      );
    },
  ],

  // ── 7.10 The angle-angle criterion for similarity ──
  "math/grade-8/unit-7/7.10": [
    (r) => {
      const first = 5 * r.int(4, 20);
      const second = 5 * r.int(4, Math.floor((175 - first) / 5));
      const same = r.bool();
      const other2 = same ? second : 5 * r.int(4, Math.floor((175 - first) / 5));
      return fill(
        `Triangle A has angles of ${first}° and ${second}°. Triangle B has angles of ${first}° and ${other2}°. Are they similar? Type yes or no.`,
        second === other2 ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    // How many angle pairs are needed is the criterion itself.
    (r) =>
      among(
        "How many pairs of equal angles prove two triangles similar?",
        "Two",
        ["Two", "One", "Three", "Four"],
        r,
      ),
    (r) => {
      const first = 5 * r.int(4, 20);
      const second = 5 * r.int(4, Math.floor((175 - first) / 5));
      return fill(
        `Two triangles both have angles of ${first}° and ${second}°. What is the third angle in both?`,
        180 - first - second,
        { unit: "degrees", hint: "a number" },
      );
    },
  ],

  // ── 8.1 Understanding the Pythagorean theorem ──
  "math/grade-8/unit-8/8.1": [
    (r) => {
      const legs = r.pick(TRIPLES);
      return fill(
        `In a right triangle with legs of ${legs[0]} and ${legs[1]}, what is c²?`,
        legs[2] ** 2,
        { hint: "a number" },
      );
    },
    // What the theorem says is a statement about right triangles.
    (r) =>
      among(
        "What does a² + b² = c² say about a right triangle?",
        "The squares on the two legs add to the square on the hypotenuse",
        [
          "The squares on the two legs add to the square on the hypotenuse",
          "The three sides add to the perimeter",
          "The two legs are always equal",
          "The hypotenuse is the sum of the legs",
        ],
        r,
      ),
    (r) => {
      const sides = r.pick(TRIPLES);
      return fill(
        `A right triangle has legs of ${sides[0]} and ${sides[1]}. What is the hypotenuse?`,
        sides[2],
        { hint: "a number" },
      );
    },
  ],

  // ── 8.2 Proving the Pythagorean theorem ──
  "math/grade-8/unit-8/8.2": [
    // A proof is a sequence, so it is asked as one.
    (r) =>
      order(
        "Put the steps of the square-within-a-square proof in order.",
        [
          "Draw a square of side a + b",
          "Place four copies of the right triangle inside it",
          "Note that the space left over is a square of side c",
          "Write the big square's area two ways and equate them",
          "Simplify to a² + b² = c²",
        ],
        r,
      ),
    (r) => {
      const legs = r.pick(TRIPLES);
      return fill(
        `Four right triangles with legs of ${legs[0]} and ${legs[1]} are placed inside a square of side ${legs[0] + legs[1]}. What is the area of that big square?`,
        (legs[0] + legs[1]) ** 2,
        { hint: "a number" },
      );
    },
    (r) => {
      const legs = r.pick(TRIPLES);
      return fill(
        `In the proof, four triangles of area ${(legs[0] * legs[1]) / 2} surround a square of area ${(legs[1] - legs[0]) ** 2}. What do they come to altogether?`,
        legs[2] ** 2,
        { hint: "a number" },
      );
    },
  ],

  // ── 8.3 Finding a missing side ──
  "math/grade-8/unit-8/8.3": [
    (r) => {
      const sides = r.pick(TRIPLES);
      return fill(
        `A right triangle has legs of ${sides[0]} and ${sides[1]}. What is the hypotenuse?`,
        sides[2],
        { hint: "a number" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES);
      const known = r.bool() ? sides[0] : sides[1];
      return fill(
        `The hypotenuse is ${sides[2]} and one leg is ${known}. What is the other leg?`,
        known === sides[0] ? sides[1] : sides[0],
        { hint: "a number" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES);
      return slider(
        `Place the hypotenuse of a right triangle with legs of ${sides[0]} and ${sides[1]}.`,
        { min: 0, max: 30, step: 1, value: sides[2], full: 1, zero: 4 },
      );
    },
  ],

  // ── 8.4 The converse of the Pythagorean theorem ──
  "math/grade-8/unit-8/8.4": [
    (r) => {
      const sides = r.pick(TRIPLES);
      const right = r.bool();
      const third = right ? sides[2] : sides[2] + r.int(1, 4);
      return fill(
        `Do sides of ${sides[0]}, ${sides[1]} and ${third} make a right triangle? Type yes or no.`,
        right ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES);
      return fill(
        `Which side is the hypotenuse of a right triangle with sides ${sides[0]}, ${sides[1]} and ${sides[2]}?`,
        sides[2],
        { hint: "a number" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES);
      return fill(
        `For a right triangle, ${sides[0]}² + ${sides[1]}² must equal c². What is that total?`,
        sides[2] ** 2,
        { hint: "a number" },
      );
    },
  ],

  // ── 8.5 Applications in two dimensions ──
  "math/grade-8/unit-8/8.5": [
    (r) => {
      const sides = r.pick(TRIPLES);
      return fill(
        `A ladder ${sides[2]} m long has its foot ${sides[0]} m from a wall. How high up the wall does it reach?`,
        sides[1],
        { unit: "metres", hint: "a number" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES);
      return fill(
        `A rectangle is ${sides[0]} by ${sides[1]}. How long is its diagonal?`,
        sides[2],
        { hint: "a number" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES);
      return slider(
        `A path goes ${sides[0]} m east and then ${sides[1]} m north. Place the straight-line distance from the start.`,
        { min: 0, max: 30, step: 1, value: sides[2], unit: "metres", full: 1, zero: 4 },
      );
    },
  ],

  // ── 8.6 Distance between points on the coordinate plane ──
  "math/grade-8/unit-8/8.6": [
    (r) => {
      const sides = r.pick(TRIPLES.filter((t) => t[0] <= 8 && t[1] <= 8));
      const x = r.int(-8, 0);
      const y = r.int(-8, 0);
      return fill(
        `What is the distance between (${x}, ${y}) and (${x + sides[0]}, ${y + sides[1]})?`,
        sides[2],
        { unit: "units", hint: "a number" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES.filter((t) => t[0] <= 9 && t[1] <= 9));
      return fill(
        `The distance from (0, 0) to (${sides[0]}, ${sides[1]}) is what?`,
        sides[2],
        { unit: "units", hint: "a number" },
      );
    },
    (r) => {
      const sides = r.pick(TRIPLES.filter((t) => t[0] <= 8 && t[1] <= 8));
      const x = r.int(-8, 0);
      const y = r.int(-8, 0);
      return slider(
        `Place the distance between (${x}, ${y}) and (${x + sides[0]}, ${y + sides[1]}).`,
        { min: 0, max: 20, step: 1, value: sides[2], full: 1, zero: 4 },
      );
    },
  ],

  // ── 8.7 Applications in three dimensions ──
  "math/grade-8/unit-8/8.7": [
    (r) => {
      const base = r.pick(TRIPLES);
      const height = r.int(2, 12);
      return fill(
        `A box is ${base[0]} by ${base[1]} by ${height}. What is the diagonal of its base?`,
        base[2],
        { hint: "a number" },
      );
    },
    (r) => {
      const stack = r.pick(TRIPLES);
      return fill(
        `A box has a base diagonal of ${stack[0]} and a height of ${stack[1]}. What is its space diagonal?`,
        stack[2],
        { hint: "a number" },
      );
    },
    (r) => {
      const box = r.pick(QUADRUPLES);
      return slider(
        `Place the space diagonal of a box ${box[0]} by ${box[1]} by ${box[2]}.`,
        { min: 0, max: 30, step: 1, value: box[3], full: 1, zero: 4 },
      );
    },
  ],

  // ── 9.1 Volume of cylinders ──
  "math/grade-8/unit-9/9.1": [
    (r) => {
      const radius = r.int(2, 9);
      const height = r.int(2, 12);
      return fill(
        `A cylinder has a radius of ${radius} and a height of ${height}. What is its volume in terms of π?`,
        pi(radius * radius * height),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const radius = r.int(2, 6);
      const height = r.int(2, 9);
      return fill(
        `Using π ≈ 3.14, what is the volume of a cylinder with a radius of ${radius} cm and a height of ${height} cm?`,
        dp(PI * radius * radius * height),
        { unit: "cubic centimetres", hint: "a decimal" },
      );
    },
    (r) => {
      const radius = r.int(2, 6);
      const height = r.int(2, 12);
      return slider(
        `A cylinder has a volume of ${pi(radius * radius * height)} and a radius of ${radius}. Place its height.`,
        { min: 0, max: 15, step: 1, value: height, full: 1, zero: 3 },
      );
    },
  ],

  // ── 9.2 Volume of cones ──
  "math/grade-8/unit-9/9.2": [
    (r) => {
      const radius = r.int(2, 9);
      const height = 3 * r.int(1, 5);
      return fill(
        `A cone has a radius of ${radius} and a height of ${height}. What is its volume in terms of π?`,
        pi((radius * radius * height) / 3),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const radius = r.int(2, 6);
      const height = 3 * r.int(1, 5);
      return fill(
        `A cylinder of volume ${pi(radius * radius * height)} holds how much more than a cone with the same radius and height? Give it in terms of π.`,
        pi((2 * radius * radius * height) / 3),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const radius = r.int(2, 6);
      const height = 3 * r.int(1, 4);
      return slider(
        `Place the number that multiplies π in the volume of a cone with a radius of ${radius} and a height of ${height}.`,
        {
          min: 0,
          max: 150,
          step: 1,
          value: (radius * radius * height) / 3,
          full: 1,
          zero: 15,
        },
      );
    },
  ],

  // ── 9.3 Volume of spheres ──
  "math/grade-8/unit-9/9.3": [
    (r) => {
      const radius = 3 * r.int(1, 3);
      return fill(
        `A sphere has a radius of ${radius}. What is its volume in terms of π?`,
        pi((4 * radius ** 3) / 3),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const radius = 3 * r.int(1, 3);
      return fill(
        `A sphere's volume is ${pi((4 * radius ** 3) / 3)}. What is its radius?`,
        radius,
        { hint: "a number" },
      );
    },
    (r) => {
      const radius = 3 * r.int(1, 2);
      return slider(
        `Place the number that multiplies π in the volume of a sphere with a radius of ${radius}.`,
        { min: 0, max: 300, step: 1, value: (4 * radius ** 3) / 3, full: 1, zero: 30 },
      );
    },
  ],

  // ── 9.4 Composite solid volume problems ──
  "math/grade-8/unit-9/9.4": [
    (r) => {
      const radius = r.int(2, 6);
      const cylinderHeight = r.int(2, 9);
      const coneHeight = 3 * r.int(1, 4);
      return fill(
        `A cylinder of radius ${radius} and height ${cylinderHeight} has a cone of the same radius and height ${coneHeight} on top. What is the total volume in terms of π?`,
        pi(radius * radius * cylinderHeight + (radius * radius * coneHeight) / 3),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const whole = r.int(40, 400);
      const removed = r.int(5, 39);
      return fill(
        `A cylinder of volume ${pi(whole)} has a cone of volume ${pi(removed)} hollowed out of it. What volume is left, in terms of π?`,
        pi(whole - removed),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const radius = 3 * r.int(1, 2);
      return slider(
        `Place the multiple of π in the volume of a hemisphere with a radius of ${radius}.`,
        { min: 0, max: 150, step: 1, value: (2 * radius ** 3) / 3, full: 1, zero: 15 },
      );
    },
  ],

  // ── 9.5 Scatter plots and association ──
  "math/grade-8/unit-9/9.5": [
    // Naming the association is a classification of the picture.
    (r) => {
      const trend = r.pick([
        { clue: "rise from left to right", answer: "Positive" },
        { clue: "fall from left to right", answer: "Negative" },
        { clue: "scatter with no pattern", answer: "None" },
      ]);
      return among(
        `The points on a scatter plot ${trend.clue}. What association is that?`,
        trend.answer,
        ["Positive", "Negative", "None", "Nonlinear"],
        r,
      );
    },
    (r) => {
      const rising = r.bool();
      return fill(
        `As x increases, y ${rising ? "increases" : "decreases"}. Is the association positive or negative? Type positive or negative.`,
        rising ? "positive" : "negative",
        { hint: "positive or negative" },
      );
    },
    (r) => {
      const total = r.int(12, 40);
      const onTrend = r.int(5, total - 2);
      return fill(
        `A scatter plot has ${total} points and ${onTrend} of them sit on a rising trend. How many do not?`,
        total - onTrend,
        { unit: "points", hint: "a number" },
      );
    },
  ],

  // ── 9.6 Clustering, outliers and linear association ──
  "math/grade-8/unit-9/9.6": [
    (r) => {
      const middle = r.int(20, 40);
      const values = shuffled(
        [
          middle,
          middle + r.int(1, 4),
          middle - r.int(1, 4),
          middle + r.int(40, 80),
        ],
        r,
      );
      const outlier = Math.max(...values);
      return fill(
        `In the data ${values.join(", ")} one value sits far from the rest. Which is the outlier?`,
        outlier,
        { hint: "a number" },
      );
    },
    // What a tight line of points means is an inference about the data.
    (r) =>
      among(
        "Points on a scatter plot that lie close to a straight line show what?",
        "A linear association",
        ["A linear association", "No association", "A single cluster", "An outlier"],
        r,
      ),
    (r) => {
      const first = r.int(4, 20);
      const second = r.int(4, 20);
      return fill(
        `A scatter plot has ${first} points in one cluster and ${second} in another. How many points are there altogether?`,
        first + second,
        { unit: "points", hint: "a number" },
      );
    },
  ],

  // ── 9.7 Fitting a line informally ──
  "math/grade-8/unit-9/9.7": [
    // A line of best fit is drawn, not described.
    (r) => {
      const slope = r.int(1, 3);
      const intercept = r.int(-4, 4);
      return line(
        `Points climb steadily from (0, ${intercept}) with a slope of about ${slope}. Draw the line of best fit.`,
        { span: 10, slope, intercept },
      );
    },
    (r) => {
      const slope = r.nonzero(-5, 5);
      const intercept = r.int(-9, 9);
      const x = r.int(2, 6);
      return fill(
        `A fitted line passes through (0, ${intercept}) and (${x}, ${intercept + slope * x}). What is its slope?`,
        slope,
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.int(-5, 5);
      const intercept = r.int(-9, 9);
      const x = r.int(2, 6);
      return slider(
        `Place the slope of the line through (0, ${intercept}) and (${x}, ${intercept + slope * x}).`,
        { min: -6, max: 6, step: 1, value: slope, full: 1, zero: 3 },
      );
    },
  ],

  // ── 9.8 Interpreting the slope and intercept of a fitted line ──
  "math/grade-8/unit-9/9.8": [
    (r) => {
      const perHour = r.int(2, 20);
      const fixed = r.int(2, 40);
      return fill(
        `A fitted line is ${lineText(perHour, fixed)} for cost against hours. What is the cost of each extra hour?`,
        perHour,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const slope = r.nonzero(-6, 6);
      const intercept = r.int(-9, 20);
      const x = r.int(2, 8);
      return fill(
        `A fitted line ${lineText(slope, intercept)} is used to predict y at x = ${x}. What is the prediction?`,
        slope * x + intercept,
        { hint: "a number" },
      );
    },
    (r) => {
      const slope = r.int(1, 6);
      const intercept = r.int(0, 20);
      const x = r.int(2, 8);
      return slider(
        `Place the predicted y at x = ${x} for the fitted line ${lineText(slope, intercept)}.`,
        { min: 0, max: 70, step: 1, value: slope * x + intercept, full: 1, zero: 7 },
      );
    },
  ],

  // ── 9.9 Two-way tables and relative frequency ──
  "math/grade-8/unit-9/9.9": [
    (r) => {
      const teaDrinkers = r.pick([10, 20, 25, 50]);
      const both = r.int(1, teaDrinkers - 1);
      return fill(
        `Of the ${teaDrinkers} people who like tea, ${both} also like coffee. What fraction of tea drinkers like coffee? Give it in lowest terms.`,
        frac(both, teaDrinkers),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const rowTotal = r.pick([20, 25, 50, 100]);
      const cell = r.int(1, rowTotal - 1);
      return fill(
        `A two-way table has ${cell} in one cell of a row totalling ${rowTotal}. What is the relative frequency, as a percentage?`,
        (cell * 100) / rowTotal,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const total = r.pick([20, 25, 50]);
      const count = r.int(1, total - 1);
      return slider(
        `Place the relative frequency of ${count} out of ${total}, as a percentage.`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: (count * 100) / total,
          unit: "percent",
          full: 1,
          zero: 12,
        },
      );
    },
  ],
};
