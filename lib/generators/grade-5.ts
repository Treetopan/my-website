import "server-only";

import {
  among,
  ask,
  asMixed,
  dot,
  dp,
  fill,
  frac,
  gcd,
  graph,
  mixed,
  order,
  other,
  point,
  properFraction,
  shuffled,
  slider,
  type Built,
  type Rng,
} from "./kit";

/**
 * Grade 5 generators.
 *
 * Keyed by subunit, and in the same order as this subunit's entry in
 * `GENERATED` — a generator's index is baked into every instance id it has
 * minted, so append rather than insert.
 *
 * Two rules apply here that the older courses were retrofitted with rather
 * than built to:
 *
 *   · Every subunit gets at least three generators that differ in the shape of
 *     the ask, not in their digits. The usual three are: work the thing out,
 *     run it backwards from the answer, and place it on a scale or a grid.
 *     `npm run check:depth` counts those as forms and fails under three.
 *   · Multiple choice is kept for answers that are genuinely a name or a
 *     classification — which shape is this, which place is that digit in.
 *     Anything whose answer is a number the student should be able to produce
 *     is a fill, a slider or a point.
 *
 * Roughly a third of the generators put their numbers in a situation, because
 * that is what these standards are about. The scenarios stay one sentence
 * long: a word problem long enough to be a reading test has stopped measuring
 * the maths.
 */

// ─── Small helpers ───────────────────────────────────────

/**
 * The denominators that divide 20.
 *
 * Anything built from two of them lands on a twentieth, which is what makes a
 * fraction answerable on a slider stepping in 0.05 rather than stranded
 * between two notches.
 */
const TWENTIETHS = [2, 4, 5, 10, 20] as const;

/** Two of them, smaller first, so the two fractions are genuinely unlike. */
function ladderPair(r: Rng): [number, number] {
  const first = r.int(0, TWENTIETHS.length - 2);
  const second = r.int(first + 1, TWENTIETHS.length - 1);
  return [TWENTIETHS[first], TWENTIETHS[second]];
}

/**
 * A numerator no larger than `cap` that leaves the fraction in lowest terms.
 *
 * The ladder denominators all divide 20, so a numerator taken off one of them
 * at random lands on 5/20 as often as on 1/4 — the same number, written the
 * way a student is being taught not to leave it.
 */
function numeratorFor(r: Rng, d: number, cap: number): number {
  const options: number[] = [];
  for (let n = 1; n <= Math.min(cap, d - 1); n++) {
    if (gcd(n, d) === 1) options.push(n);
  }
  return options.length ? r.pick(options) : 1;
}

/** The digits 1–9, shuffled and cut, so no digit repeats inside one numeral. */
function distinctDigits(r: Rng, count: number): number[] {
  return shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], r).slice(0, count);
}

type Place = { name: string; size: number };

/** Millions down to ones: seven places, and seven digits to fill them. */
const WHOLE_PLACES: Place[] = [
  { name: "millions", size: 1_000_000 },
  { name: "hundred thousands", size: 100_000 },
  { name: "ten thousands", size: 10_000 },
  { name: "thousands", size: 1_000 },
  { name: "hundreds", size: 100 },
  { name: "tens", size: 10 },
  { name: "ones", size: 1 },
];

/** Thousands down to thousandths, which is the other half of the standard. */
const DECIMAL_PLACES: Place[] = [
  { name: "thousands", size: 1_000 },
  { name: "hundreds", size: 100 },
  { name: "tens", size: 10 },
  { name: "ones", size: 1 },
  { name: "tenths", size: 0.1 },
  { name: "hundredths", size: 0.01 },
  { name: "thousandths", size: 0.001 },
];

/**
 * A numeral with one digit in every place, and the places it was built from.
 *
 * Every digit is different, which is the only arrangement under which "the
 * value of the digit 7" has exactly one answer.
 */
function placeValueNumber(r: Rng): {
  text: string;
  digits: number[];
  places: Place[];
} {
  const digits = distinctDigits(r, 7);
  const decimals = r.bool();
  const text = decimals
    ? `${digits[0]},${digits[1]}${digits[2]}${digits[3]}.${digits[4]}${digits[5]}${digits[6]}`
    : `${digits[0]},${digits[1]}${digits[2]}${digits[3]},${digits[4]}${digits[5]}${digits[6]}`;
  return { text, digits, places: decimals ? DECIMAL_PLACES : WHOLE_PLACES };
}

const ONES_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

/**
 * Two fractions with different denominators, larger first.
 *
 * Rolled and then put in order rather than rolled until they come out in
 * order: asking a fixed list of denominators for something smaller than 1/8 is
 * a request that never returns.
 */
function unlikePair(
  r: Rng,
  dens: readonly number[],
): [{ n: number; d: number }, { n: number; d: number }] {
  const a = properFraction(r, dens);
  let b = properFraction(r, dens);
  while (b.d === a.d) b = properFraction(r, dens);
  return a.n / a.d > b.n / b.d ? [a, b] : [b, a];
}

/** Fractions with no two of them equal, for comparing and ordering. */
const FRACTION_POOL = [
  { n: 1, d: 6 },
  { n: 1, d: 4 },
  { n: 1, d: 3 },
  { n: 3, d: 8 },
  { n: 2, d: 5 },
  { n: 1, d: 2 },
  { n: 5, d: 8 },
  { n: 2, d: 3 },
  { n: 3, d: 4 },
  { n: 5, d: 6 },
  { n: 7, d: 8 },
] as const;

/**
 * Denominator pairs whose product divides 20, so the product of two fractions
 * built on them still lands on a notch of a slider stepping in 0.05.
 */
const TWENTIETH_PAIRS: [number, number][] = [
  [2, 2],
  [2, 5],
  [5, 2],
  [2, 10],
  [10, 2],
  [4, 5],
  [5, 4],
];

export const GRADE_5: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.1 Place value through millions and thousandths ──
  "math/grade-5/unit-1/1.1": [
    (r) => {
      const { text, digits, places } = placeValueNumber(r);
      const at = r.int(0, places.length - 1);
      return fill(
        `In ${text}, which digit is in the ${places[at].name} place?`,
        digits[at],
        { hint: "a single digit" },
      );
    },
    // The same knowledge the other way round: the digit is given and what it
    // is worth is the question, which is where a place slip actually shows.
    (r) => {
      const { text, digits, places } = placeValueNumber(r);
      const at = r.int(0, places.length - 1);
      return fill(
        `What is the value of the digit ${digits[at]} in ${text}?`,
        dp(digits[at] * places[at].size, 3),
        { hint: "a number" },
      );
    },
    // Naming the place is a classification, so it is the one ask here that
    // four options do not hand over.
    (r) => {
      const { text, digits, places } = placeValueNumber(r);
      const at = r.int(0, places.length - 1);
      return among(
        `In ${text}, the digit ${digits[at]} sits in which place?`,
        places[at].name,
        shuffled(
          places.map((p) => p.name),
          r,
        ),
        r,
      );
    },
  ],

  // ── 1.2 Reading, writing and comparing decimals ──
  "math/grade-5/unit-1/1.2": [
    (r) => {
      const a = dp(r.int(101, 989) / 100);
      const b = dp(a + r.sign() * r.pick([0.01, 0.05, 0.1, 0.5, 1]));
      return fill(
        `Two parcels weigh ${a} kg and ${b} kg. Type the greater weight.`,
        Math.max(a, b),
        { hint: "one of the two numbers" },
      );
    },
    (r) => {
      const value = dp(r.int(1, 99) / 100);
      return slider(`Place ${value} on a number line from 0 to 1.`, {
        min: 0,
        max: 1,
        step: 0.01,
        value,
        full: 0.02,
        zero: 0.15,
      });
    },
    // Written out in words, which is where the difference between a tenth and
    // a thousandth is a reading rather than a calculation.
    (r) => {
      const whole = r.int(1, 9);
      const digit = r.int(1, 9);
      const place = r.pick([
        { name: "tenths", size: 0.1 },
        { name: "hundredths", size: 0.01 },
        { name: "thousandths", size: 0.001 },
      ]);
      return fill(
        `Write this as a decimal: ${ONES_WORDS[whole - 1]} and ${ONES_WORDS[digit - 1]} ${place.name}.`,
        dp(whole + digit * place.size, 3),
        { hint: "a decimal" },
      );
    },
  ],

  // ── 1.3 Rounding decimals ──
  "math/grade-5/unit-1/1.3": [
    (r) => {
      const digits = [r.int(1, 9), r.int(0, 9), r.int(0, 9), r.int(1, 9)];
      const text = `${digits[0]}.${digits[1]}${digits[2]}${digits[3]}`;
      const to = r.pick([
        { name: "whole number", size: 1 },
        { name: "tenth", size: 10 },
        { name: "hundredth", size: 100 },
      ]);
      return fill(
        `Round ${text} to the nearest ${to.name}.`,
        dp(Math.round(Number(text) * to.size) / to.size, 3),
        { hint: "a number" },
      );
    },
    // Rounding backwards. The rounded value is given and the boundary is the
    // answer, which is the half of the rule that gets skipped.
    (r) => {
      const target = dp(r.int(11, 89) / 10, 1);
      return slider(
        `A number rounds to ${target} to the nearest tenth. Place the smallest number it could be.`,
        {
          min: dp(target - 0.5),
          max: dp(target + 0.5),
          step: 0.05,
          value: dp(target - 0.05),
          full: 0.05,
          zero: 0.3,
        },
      );
    },
    (r) => {
      const digits = [r.int(1, 5), r.int(0, 9), r.int(0, 9), r.int(1, 9)];
      const text = `1${digits[0]}.${digits[1]}${digits[2]}${digits[3]}`;
      return fill(
        `A runner finished in ${text} seconds. Rounded to the nearest hundredth, what is that time?`,
        dp(Math.round(Number(text) * 100) / 100),
        { unit: "seconds", hint: "a number" },
      );
    },
  ],

  // ── 1.4 Powers of 10 and exponent notation ──
  "math/grade-5/unit-1/1.4": [
    (r) => {
      const n = r.int(2, 6);
      return fill(`Write 10^${n} as a plain number.`, 10 ** n, {
        hint: "a number",
      });
    },
    (r) => {
      const n = r.int(2, 6);
      return fill(`Ten to what power gives ${10 ** n}?`, n, {
        hint: "an exponent",
      });
    },
    (r) => {
      const n = r.int(2, 6);
      const chain = Array.from({ length: n }, () => "10").join(" × ");
      return slider(`Place the exponent that writes ${chain} as a power of 10.`, {
        min: 0,
        max: 8,
        step: 1,
        value: n,
        full: 1,
        zero: 2,
      });
    },
  ],

  // ── 1.5 Multiplying and dividing by powers of 10 ──
  "math/grade-5/unit-1/1.5": [
    (r) => {
      const a = dp(r.int(11, 99) / 10, 1);
      const power = r.pick([10, 100, 1000]);
      return fill(`What is ${a} × ${power}?`, dp(a * power, 1), {
        hint: "a number",
      });
    },
    // Division by a power of ten, which is the same shift the other way.
    (r) => {
      const each = dp(r.int(5, 95) / 100);
      const count = r.pick([10, 100]);
      return fill(
        `A box holds ${count} identical paperclips and weighs ${dp(each * count, 1)} g in total. What does one paperclip weigh?`,
        each,
        { unit: "grams", hint: "a decimal" },
      );
    },
    (r) => {
      const a = dp(r.int(11, 99) / 10, 1);
      const n = r.int(1, 4);
      return slider(
        `Place the missing exponent: ${a} × 10^? = ${dp(a * 10 ** n, 1)}`,
        { min: 0, max: 6, step: 1, value: n, full: 1, zero: 2 },
      );
    },
  ],

  // ── 1.6 Adding and subtracting decimals ──
  "math/grade-5/unit-1/1.6": [
    (r) => {
      const a = dp(r.int(101, 4999) / 100);
      const b = dp(r.int(101, 4999) / 100);
      return fill(`Add these decimals: ${a} + ${b}`, dp(a + b), {
        hint: "a decimal",
      });
    },
    (r) => {
      const paid = r.pick([10, 20, 50]);
      const bill = dp(r.int(105, paid * 100 - 105) / 100);
      return fill(
        `A bill came to $${bill.toFixed(2)} and you paid with $${paid}. How much change is there?`,
        dp(paid - bill),
        { unit: "dollars", hint: "a decimal" },
      );
    },
    (r) => {
      const total = dp(r.int(20, 99) / 10, 1);
      const known = dp(r.int(5, total * 10 - 5) / 10, 1);
      return slider(`A tank held ${known} litres and now holds ${total} litres. Place how much went in.`, {
        min: 0,
        max: 10,
        step: 0.1,
        value: dp(total - known, 1),
        full: 0.1,
        zero: 1,
      });
    },
  ],

  // ── 1.7 Multiplying decimals ──
  "math/grade-5/unit-1/1.7": [
    (r) => {
      const a = dp(r.int(11, 99) / 10, 1);
      const b = dp(r.int(11, 99) / 10, 1);
      return fill(`Multiply these decimals: ${a} × ${b}`, dp(a * b), {
        hint: "a decimal",
      });
    },
    (r) => {
      const price = dp(r.int(105, 299) / 100);
      const litres = r.int(3, 9);
      return fill(
        `Fuel costs $${price.toFixed(2)} a litre. What do ${litres} litres cost?`,
        dp(price * litres),
        { unit: "dollars", hint: "a decimal" },
      );
    },
    // Counting the decimal places is the rule the digits hang off, and it is
    // the part that survives once the multiplication itself is mechanical.
    (r) => {
      const places = (): { text: string; count: number } => {
        const count = r.int(1, 2);
        const whole = r.int(1, 9);
        const tenths = r.int(1, 9);
        const hundredths = r.int(1, 9);
        return {
          text: count === 1 ? `${whole}.${tenths}` : `${whole}.${tenths}${hundredths}`,
          count,
        };
      };
      const a = places();
      const b = places();
      return slider(
        `Place the number of decimal places in the product of ${a.text} and ${b.text}.`,
        { min: 0, max: 5, step: 1, value: a.count + b.count, full: 1, zero: 2 },
      );
    },
  ],

  // ── 1.8 Dividing decimals ──
  "math/grade-5/unit-1/1.8": [
    (r) => {
      const quotient = dp(r.int(11, 99) / 10, 1);
      const divisor = r.int(2, 9);
      return fill(
        `Divide these decimals: ${dp(quotient * divisor, 1)} ÷ ${divisor}`,
        quotient,
        { hint: "a decimal" },
      );
    },
    (r) => {
      const friends = r.int(3, 8);
      const each = dp(r.int(150, 1200) / 100);
      return fill(
        `${friends} friends split a bill of $${dp(each * friends).toFixed(2)} equally. What does each one pay?`,
        each,
        { unit: "dollars", hint: "a decimal" },
      );
    },
    // A decimal divisor, which is the case that needs both numbers shifted.
    (r) => {
      const quotient = dp(r.int(1, 19) / 10, 1);
      const divisor = dp(r.int(2, 9) / 10, 1);
      return slider(`Place the quotient: ${dp(quotient * divisor)} ÷ ${divisor}`, {
        min: 0,
        max: 2,
        step: 0.1,
        value: quotient,
        full: 0.1,
        zero: 0.6,
      });
    },
  ],

  // ── 2.1 Multi-digit multiplication ──
  "math/grade-5/unit-2/2.1": [
    (r) => {
      const a = r.int(21, 89);
      const b = r.int(21, 89);
      return fill(`Multiply these numbers: ${a} × ${b}`, a * b, {
        hint: "a number",
      });
    },
    (r) => {
      const rows = r.int(18, 45);
      const seats = r.int(22, 48);
      return fill(
        `A theatre has ${rows} rows of ${seats} seats. How many seats is that altogether?`,
        rows * seats,
        { unit: "seats", hint: "a number" },
      );
    },
    (r) => {
      const known = r.int(12, 32);
      const missing = r.int(11, 39);
      return slider(`Place the missing factor: ${known} × ? = ${known * missing}`, {
        min: 0,
        max: 40,
        step: 1,
        value: missing,
        full: 1,
        zero: 5,
      });
    },
  ],

  // ── 2.2 Multi-digit division with remainders ──
  "math/grade-5/unit-2/2.2": [
    (r) => {
      const divisor = r.int(12, 39);
      const quotient = r.int(11, 49);
      const rest = r.int(1, divisor - 1);
      return fill(
        `Divide and give the whole-number quotient: ${divisor * quotient + rest} ÷ ${divisor}`,
        quotient,
        { hint: "a number" },
      );
    },
    (r) => {
      const divisor = r.int(12, 39);
      const quotient = r.int(11, 49);
      const rest = r.int(1, divisor - 1);
      return fill(
        `What is the remainder when ${divisor * quotient + rest} is divided by ${divisor}?`,
        rest,
        { hint: "a number" },
      );
    },
    // The division run backwards, which is the check a student can do on
    // their own answer without being told it.
    (r) => {
      const divisor = r.int(4, 9);
      const quotient = r.int(6, 18);
      const rest = r.int(1, divisor - 1);
      return slider(
        `Eggs are packed ${divisor} to a tray, filling ${quotient} trays with ${rest} left over. Place how many eggs there are.`,
        {
          min: 0,
          max: 180,
          step: 1,
          value: divisor * quotient + rest,
          full: 1,
          zero: 12,
        },
      );
    },
  ],

  // ── 2.3 Interpreting remainders in context ──
  "math/grade-5/unit-2/2.3": [
    // Round up: the people left over still need a van.
    (r) => {
      const seats = r.int(6, 12);
      const people = r.int(40, 160);
      return fill(
        `A van holds ${seats} people and ${people} people need a lift. How many vans are needed?`,
        Math.ceil(people / seats),
        { unit: "vans", hint: "a number" },
      );
    },
    // Round down: a part-full box is not a full box.
    (r) => {
      const perBox = r.int(6, 12);
      const pencils = r.int(50, 200);
      return fill(
        `Pencils are packed ${perBox} to a box and there are ${pencils} of them. How many boxes end up completely full?`,
        Math.floor(pencils / perBox),
        { unit: "boxes", hint: "a number" },
      );
    },
    // And the case where the remainder itself is what was asked for.
    (r) => {
      const baskets = r.int(6, 14);
      const apples = r.int(60, 200);
      return slider(
        `${apples} apples are shared equally among ${baskets} baskets. Place the number left over.`,
        { min: 0, max: 14, step: 1, value: apples % baskets, full: 1, zero: 4 },
      );
    },
  ],

  // ── 2.4 Factors, multiples and divisibility ──
  "math/grade-5/unit-2/2.4": [
    (r) => {
      const n = r.int(12, 96);
      let count = 0;
      for (let i = 1; i <= n; i++) if (n % i === 0) count++;
      return fill(`How many factors does ${n} have?`, count, { hint: "a number" });
    },
    (r) => {
      const divisor = r.pick([3, 4, 6, 7, 8, 9]);
      const floor = r.int(20, 90);
      return fill(
        `Buses leave every ${divisor} minutes, starting at minute 0. Which is the first departure after minute ${floor}?`,
        (Math.floor(floor / divisor) + 1) * divisor,
        { hint: "a number" },
      );
    },
    (r) => {
      const step = r.int(3, 9);
      const which = r.int(3, 6);
      const names = ["third", "fourth", "fifth", "sixth"];
      return slider(`Place the ${names[which - 3]} multiple of ${step}.`, {
        min: 0,
        max: 60,
        step: 1,
        value: step * which,
        full: 1,
        zero: 6,
      });
    },
  ],

  // ── 2.5 Prime and composite numbers ──
  "math/grade-5/unit-2/2.5": [
    // Prime or not is a classification, and the one ask in this subunit that
    // four options do not solve for you.
    (r) => {
      const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
      const composites = [12, 15, 16, 21, 25, 27, 33, 35, 39, 45, 49];
      return ask(
        "Which of these numbers is prime?",
        r.pick(primes),
        shuffled(composites, r).slice(0, 3),
        r,
      );
    },
    (r) => {
      const from = r.int(10, 60);
      const to = from + r.int(10, 30);
      let count = 0;
      for (let n = from; n <= to; n++) if (isPrime(n)) count++;
      return fill(`How many prime numbers are there from ${from} to ${to}?`, count, {
        hint: "a number",
      });
    },
    (r) => {
      const ceiling = r.pick([20, 30, 40, 50, 60]);
      let largest = 2;
      for (let n = 2; n < ceiling; n++) if (isPrime(n)) largest = n;
      return slider(`Place the largest prime number below ${ceiling}.`, {
        min: 0,
        max: 60,
        step: 1,
        value: largest,
        full: 1,
        zero: 6,
      });
    },
  ],

  // ── 2.6 Prime factorization ──
  "math/grade-5/unit-2/2.6": [
    (r) => {
      const n = r.int(30, 140);
      const factors = primeFactors(n);
      return fill(
        `What is the largest prime factor of ${n}?`,
        factors[factors.length - 1],
        { hint: "a prime number" },
      );
    },
    // The exponent rather than the whole factorization, because a typed
    // factorization is graded on its punctuation more than on its maths.
    (r) => {
      const prime = r.pick([2, 3, 5]);
      const exponent = r.int(2, 4);
      const other = r.pick([1, 7, 11, 13]);
      return fill(
        `In the prime factorization of ${prime ** exponent * other}, what is the exponent of ${prime}?`,
        exponent,
        { hint: "a number" },
      );
    },
    (r) => {
      const n = r.int(24, 200);
      return slider(`Place the number of prime factors of ${n}, counting repeats.`, {
        min: 0,
        max: 10,
        step: 1,
        value: primeFactors(n).length,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 2.7 Greatest common factor ──
  "math/grade-5/unit-2/2.7": [
    (r) => {
      const shared = r.int(3, 12);
      const first = r.int(2, 9);
      const a = shared * first;
      const b = shared * other(r, first, 2, 9);
      return fill(`What is the greatest common factor of ${a} and ${b}?`, gcd(a, b), {
        hint: "a number",
      });
    },
    (r) => {
      const bags = r.int(4, 12);
      const first = r.int(2, 7);
      const red = bags * first;
      const blue = bags * other(r, first, 2, 7);
      return fill(
        `${red} red beads and ${blue} blue beads are split into identical bags with none left over. What is the largest number of bags possible?`,
        gcd(red, blue),
        { unit: "bags", hint: "a number" },
      );
    },
    (r) => {
      const shared = r.int(2, 9);
      const first = r.int(2, 5);
      const a = shared * first;
      const b = shared * other(r, first, 2, 5);
      return slider(`Place the greatest common factor of ${a} and ${b}.`, {
        min: 0,
        max: 30,
        step: 1,
        value: gcd(a, b),
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 2.8 Least common multiple ──
  "math/grade-5/unit-2/2.8": [
    (r) => {
      const a = r.int(3, 12);
      const b = other(r, a, 3, 12);
      return fill(
        `What is the least common multiple of ${a} and ${b}?`,
        (a * b) / gcd(a, b),
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.pick([6, 8, 9, 10, 12, 15]);
      const second = r.pick([4, 6, 8, 10, 14, 18]);
      return fill(
        `One bus leaves every ${first} minutes and another every ${second} minutes, and they have just left together. How long until they next leave together?`,
        (first * second) / gcd(first, second),
        { unit: "minutes", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 8);
      const b = other(r, a, 2, 8);
      return slider(`Place the least common multiple of ${a} and ${b}.`, {
        min: 0,
        max: 60,
        step: 1,
        value: (a * b) / gcd(a, b),
        full: 1,
        zero: 8,
      });
    },
  ],

  // ── 3.1 Equivalent fractions ──
  "math/grade-5/unit-3/3.1": [
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const times = r.int(2, 6);
      return fill(
        `Fill in the missing numerator: ${n}/${d} = ?/${d * times}`,
        n * times,
        { hint: "a number" },
      );
    },
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5, 6, 7, 8, 9]);
      const times = r.int(2, 6);
      return fill(`Write ${n * times}/${d * times} in lowest terms.`, frac(n, d), {
        hint: "a fraction",
      });
    },
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const times = r.int(2, 6);
      return slider(
        `Place the missing denominator: ${n}/${d} = ${n * times}/?`,
        { min: 0, max: 60, step: 1, value: d * times, full: 1, zero: 6 },
      );
    },
  ],

  // ── 3.2 Comparing and ordering fractions ──
  "math/grade-5/unit-3/3.2": [
    (r) => {
      const [a, b] = shuffled(FRACTION_POOL, r).slice(0, 2);
      const bigger = a.n / a.d > b.n / b.d ? a : b;
      return fill(
        `Which is greater, ${a.n}/${a.d} or ${b.n}/${b.d}? Type the greater fraction.`,
        `${bigger.n}/${bigger.d}`,
        { hint: "one of the two fractions" },
      );
    },
    // Ordering is the ask this subunit is really about, and it is the one a
    // list of four options cannot pose.
    (r) =>
      order(
        "Put these fractions in order, smallest first.",
        shuffled(FRACTION_POOL, r)
          .slice(0, 4)
          .sort((x, y) => x.n / x.d - y.n / y.d)
          .map((f) => `${f.n}/${f.d}`),
        r,
      ),
    (r) => {
      const { n, d } = properFraction(r, TWENTIETHS);
      return slider(`Place ${n}/${d} on a number line from 0 to 1.`, {
        min: 0,
        max: 1,
        step: 0.05,
        value: dp(n / d),
        full: 0.05,
        zero: 0.2,
      });
    },
  ],

  // ── 3.3 Adding fractions with unlike denominators ──
  "math/grade-5/unit-3/3.3": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      let b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      while (b.d === a.d) b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const sum = asMixed(a.n * b.d + b.n * a.d, a.d * b.d);
      return fill(`Add these fractions: ${a.n}/${a.d} + ${b.n}/${b.d}`, sum.show, {
        accept: sum.accept,
        hint: "a fraction",
      });
    },
    // The addition run backwards: one addend is missing, which is the same
    // common denominator done for a different reason.
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      let b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      while (b.d === a.d) b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const sum = asMixed(a.n * b.d + b.n * a.d, a.d * b.d);
      return fill(
        `The sum of two fractions is ${sum.show} and one of them is ${a.n}/${a.d}. What is the other?`,
        frac(b.n, b.d),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const [d1, d2] = ladderPair(r);
      const n1 = numeratorFor(r, d1, d1 - 1);
      const room = Math.floor(dp((1 - n1 / d1) * d2, 6));
      const n2 = numeratorFor(r, d2, Math.max(1, room));
      return slider(
        `Place the sum ${n1}/${d1} + ${n2}/${d2} on a number line from 0 to 1.`,
        {
          min: 0,
          max: 1,
          step: 0.05,
          value: dp(n1 / d1 + n2 / d2),
          full: 0.05,
          zero: 0.2,
        },
      );
    },
  ],

  // ── 3.4 Subtracting fractions with unlike denominators ──
  "math/grade-5/unit-3/3.4": [
    (r) => {
      const [a, b] = unlikePair(r, [2, 3, 4, 5, 6, 8]);
      return fill(
        `Subtract these fractions: ${a.n}/${a.d} - ${b.n}/${b.d}`,
        frac(a.n * b.d - b.n * a.d, a.d * b.d),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const [a, b] = unlikePair(r, [2, 3, 4, 5, 6, 8]);
      return fill(
        `A jug holds ${a.n}/${a.d} of a litre and ${b.n}/${b.d} of a litre is poured out. How much is left?`,
        frac(a.n * b.d - b.n * a.d, a.d * b.d),
        { unit: "litres", hint: "a fraction" },
      );
    },
    (r) => {
      const [d1, d2] = ladderPair(r);
      const n1 = numeratorFor(r, d1, d1 - 1);
      const n2 = numeratorFor(r, d2, Math.max(1, Math.ceil(dp((n1 / d1) * d2, 6)) - 1));
      return slider(
        `Place the difference ${n1}/${d1} - ${n2}/${d2} on a number line from 0 to 1.`,
        {
          min: 0,
          max: 1,
          step: 0.05,
          value: dp(n1 / d1 - n2 / d2),
          full: 0.05,
          zero: 0.2,
        },
      );
    },
  ],

  // ── 3.5 Adding and subtracting mixed numbers ──
  "math/grade-5/unit-3/3.5": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6]);
      let b = properFraction(r, [2, 3, 4, 5, 6]);
      while (b.d === a.d) b = properFraction(r, [2, 3, 4, 5, 6]);
      const w1 = r.int(1, 5);
      const w2 = r.int(1, 5);
      const sum = asMixed(
        (w1 * a.d + a.n) * b.d + (w2 * b.d + b.n) * a.d,
        a.d * b.d,
      );
      return fill(
        `Add these mixed numbers: ${mixed(w1, a.n, a.d)} + ${mixed(w2, b.n, b.d)}`,
        sum.show,
        { accept: sum.accept, hint: "a mixed number" },
      );
    },
    // Kept where the fraction part does not need regrouping — that case is
    // 3.6, and it is a different piece of work.
    (r) => {
      const d = r.pick([4, 6, 8, 10]);
      const small = r.int(1, d - 2);
      const big = r.int(small + 1, d - 1);
      const w2 = r.int(1, 4);
      const w1 = w2 + r.int(1, 4);
      const rest = asMixed((w1 - w2) * d + (big - small), d);
      return fill(
        `Subtract these mixed numbers: ${mixed(w1, big, d)} - ${mixed(w2, small, d)}`,
        rest.show,
        { accept: rest.accept, hint: "a mixed number" },
      );
    },
    (r) => {
      const w1 = r.int(1, 3);
      const w2 = r.int(1, 3);
      const f1 = r.pick([0.25, 0.5, 0.75]);
      const f2 = r.pick([0.25, 0.5, 0.75]);
      const text = (w: number, f: number) =>
        `${w} ${f === 0.5 ? "1/2" : f === 0.25 ? "1/4" : "3/4"}`;
      return slider(`Two planks are ${text(w1, f1)} m and ${text(w2, f2)} m long. Place their total length.`, {
        min: 0,
        max: 8,
        step: 0.25,
        value: dp(w1 + f1 + w2 + f2),
        full: 0.25,
        zero: 1.5,
      });
    },
  ],

  // ── 3.6 Regrouping with mixed numbers ──
  "math/grade-5/unit-3/3.6": [
    // The regrouping on its own, before it is buried inside a subtraction.
    (r) => {
      const d = r.pick([3, 4, 5, 6, 8]);
      const n = r.int(1, d - 1);
      const whole = r.int(2, 6);
      return fill(
        `Rewrite ${mixed(whole, n, d)} with a fraction greater than one: ${whole - 1} and ?/${d}. What is the numerator?`,
        n + d,
        { hint: "a number" },
      );
    },
    (r) => {
      const d = r.pick([4, 6, 8, 10]);
      const big = r.int(2, d - 1);
      const small = r.int(1, big - 1);
      const w2 = r.int(1, 4);
      const w1 = w2 + r.int(1, 4);
      const rest = asMixed((w1 - w2) * d - (big - small), d);
      return fill(
        `Subtract these mixed numbers: ${mixed(w1, small, d)} - ${mixed(w2, big, d)}`,
        rest.show,
        { accept: rest.accept, hint: "a mixed number" },
      );
    },
    (r) => {
      const d = r.pick([4, 8]);
      const big = r.int(2, d - 1);
      const small = r.int(1, big - 1);
      const w2 = r.int(1, 4);
      const w1 = w2 + r.int(1, 5);
      return slider(
        `Place the whole-number part of ${mixed(w1, small, d)} - ${mixed(w2, big, d)}.`,
        {
          min: 0,
          max: 10,
          step: 1,
          value: w1 - w2 - 1,
          full: 1,
          zero: 3,
        },
      );
    },
  ],

  // ── 3.7 Estimating fraction sums and differences ──
  "math/grade-5/unit-3/3.7": [
    // Odd denominators only, so the sum never lands exactly between two
    // benchmarks and the question always has one answer.
    (r) => {
      const a = properFraction(r, [3, 5, 7, 9, 11]);
      let b = properFraction(r, [3, 5, 7, 9, 11]);
      while (b.d === a.d) b = properFraction(r, [3, 5, 7, 9, 11]);
      const sum = a.n / a.d + b.n / b.d;
      const marks = [
        { text: "0", at: 0 },
        { text: "1/2", at: 0.5 },
        { text: "1", at: 1 },
        { text: "2", at: 2 },
      ];
      const nearest = marks.reduce((best, m) =>
        Math.abs(sum - m.at) < Math.abs(sum - best.at) ? m : best,
      );
      return among(
        `Roughly, ${a.n}/${a.d} + ${b.n}/${b.d} is closest to which of these?`,
        nearest.text,
        marks.map((m) => m.text),
        r,
      );
    },
    (r) => {
      const { n, d } = properFraction(r, [3, 5, 7, 9, 11]);
      return fill(`Round ${n}/${d} to the nearest whole number.`, n / d < 0.5 ? 0 : 1, {
        hint: "0 or 1",
      });
    },
    (r) => {
      const a = properFraction(r, [3, 5, 7, 9, 11]);
      let b = properFraction(r, [3, 5, 7, 9, 11]);
      while (b.d === a.d) b = properFraction(r, [3, 5, 7, 9, 11]);
      return slider(
        `Place the estimate of ${a.n}/${a.d} + ${b.n}/${b.d}, to the nearest whole number.`,
        {
          min: 0,
          max: 3,
          step: 1,
          value: Math.round(a.n / a.d + b.n / b.d),
          full: 1,
          zero: 2,
        },
      );
    },
  ],

  // ── 3.8 Fraction word problems ──
  "math/grade-5/unit-3/3.8": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const b = properFraction(r, [2, 3, 4, 5, 6]);
      return fill(
        `A recipe needs ${a.n}/${a.d} of a cup of flour and you are making ${b.n}/${b.d} of the recipe. How much flour is that?`,
        frac(a.n * b.n, a.d * b.d),
        { unit: "cups", hint: "a fraction" },
      );
    },
    (r) => {
      const [a, b] = unlikePair(r, [2, 3, 4, 5, 6, 8, 10]);
      return fill(
        `A tank is ${a.n}/${a.d} full and then ${b.n}/${b.d} of the tank is drained. What fraction is left?`,
        frac(a.n * b.d - b.n * a.d, a.d * b.d),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const [d1, d2] = ladderPair(r);
      const n1 = numeratorFor(r, d1, d1 - 1);
      const n2 = numeratorFor(r, d2, Math.max(1, Math.ceil(dp((n1 / d1) * d2, 6)) - 1));
      return slider(
        `A trail is ${n1}/${d1} of a mile long and you have walked ${n2}/${d2} of a mile. Place the distance still to go.`,
        {
          min: 0,
          max: 1,
          step: 0.05,
          value: dp(n1 / d1 - n2 / d2),
          unit: "miles",
          full: 0.05,
          zero: 0.2,
        },
      );
    },
  ],

  // ── 4.1 Fraction as division ──
  "math/grade-5/unit-4/4.1": [
    (r) => {
      const d = r.int(2, 9);
      const n = d * r.int(1, 4) + r.int(1, d - 1);
      const value = asMixed(n, d);
      return fill(`Write ${n} ÷ ${d} as a mixed number.`, value.show, {
        accept: value.accept,
        hint: "a mixed number",
      });
    },
    (r) => {
      const people = r.int(3, 8);
      const pizzas = people * r.int(1, 3) + r.int(1, people - 1);
      const value = asMixed(pizzas, people);
      return fill(
        `${pizzas} pizzas are shared equally by ${people} people. How much pizza does each person get?`,
        value.show,
        { accept: value.accept, hint: "a mixed number" },
      );
    },
    (r) => {
      const d = r.pick(TWENTIETHS);
      const n = r.int(1, 5 * d);
      return slider(`Place the value of ${n} ÷ ${d}.`, {
        min: 0,
        max: 6,
        step: 0.05,
        value: dp(n / d),
        full: 0.05,
        zero: 0.5,
      });
    },
  ],

  // ── 4.2 Multiplying a fraction by a whole number ──
  "math/grade-5/unit-4/4.2": [
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const whole = r.int(2, 9);
      const value = asMixed(n * whole, d);
      return fill(
        `Multiply this fraction by a whole number: ${n}/${d} × ${whole}`,
        value.show,
        { accept: value.accept, hint: "a fraction or mixed number" },
      );
    },
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5, 8]);
      const bags = r.int(2, 9);
      const value = asMixed(n * bags, d);
      return fill(
        `A bag holds ${n}/${d} of a kilogram of rice. What do ${bags} bags weigh?`,
        value.show,
        { accept: value.accept, unit: "kilograms", hint: "a mixed number" },
      );
    },
    (r) => {
      const { n, d } = properFraction(r, TWENTIETHS);
      const whole = r.int(2, Math.max(2, Math.floor((5 * d) / n)));
      return slider(`Place the product ${whole} × ${n}/${d}.`, {
        min: 0,
        max: 6,
        step: 0.05,
        value: dp((whole * n) / d),
        full: 0.05,
        zero: 0.5,
      });
    },
  ],

  // ── 4.3 Multiplying two fractions ──
  "math/grade-5/unit-4/4.3": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      return fill(
        `Multiply these fractions: ${a.n}/${a.d} × ${b.n}/${b.d}`,
        frac(a.n * b.n, a.d * b.d),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6]);
      const b = properFraction(r, [2, 3, 4, 5, 6]);
      return fill(
        `One factor is ${a.n}/${a.d} and the product is ${frac(a.n * b.n, a.d * b.d)}. What is the other factor?`,
        frac(b.n, b.d),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const [d1, d2] = r.pick(TWENTIETH_PAIRS);
      const n1 = numeratorFor(r, d1, d1 - 1);
      const n2 = numeratorFor(r, d2, d2 - 1);
      return slider(`Place the product ${n1}/${d1} × ${n2}/${d2}.`, {
        min: 0,
        max: 1,
        step: 0.05,
        value: dp((n1 * n2) / (d1 * d2)),
        full: 0.05,
        zero: 0.2,
      });
    },
  ],

  // ── 4.4 Area models for fraction multiplication ──
  "math/grade-5/unit-4/4.4": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      return fill(
        `A rectangle is ${a.n}/${a.d} m long and ${b.n}/${b.d} m wide. What is its area?`,
        frac(a.n * b.n, a.d * b.d),
        { unit: "square metres", hint: "a fraction" },
      );
    },
    (r) => {
      const columns = r.int(3, 8);
      const rows = r.int(3, 8);
      const shadedColumns = r.int(1, columns - 1);
      const shadedRows = r.int(1, rows - 1);
      return fill(
        `An area model is ${columns} columns across and ${rows} rows down, with ${shadedColumns} columns and ${shadedRows} rows shaded. What fraction of it is shaded both ways?`,
        frac(shadedColumns * shadedRows, columns * rows),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const [columns, rows] = r.pick(TWENTIETH_PAIRS);
      const shadedColumns = r.int(1, columns - 1);
      const shadedRows = r.int(1, rows - 1);
      return slider(
        `A grid ${columns} across and ${rows} down has a block ${shadedColumns} by ${shadedRows} shaded. Place the fraction shaded, as a decimal.`,
        {
          min: 0,
          max: 1,
          step: 0.05,
          value: dp((shadedColumns * shadedRows) / (columns * rows)),
          full: 0.05,
          zero: 0.2,
        },
      );
    },
  ],

  // ── 4.5 Scaling: comparing a product to its factors ──
  "math/grade-5/unit-4/4.5": [
    // Bigger, smaller or the same is a classification, and the whole of what
    // scaling asks before any arithmetic happens.
    (r) => {
      const whole = r.int(4, 40);
      const d = r.int(2, 8);
      const n = r.pick([r.int(1, d - 1), d, d + r.int(1, 6)]);
      const verdict =
        n < d
          ? "Smaller than the number it started at"
          : n > d
            ? "Larger than the number it started at"
            : "Exactly the number it started at";
      return among(
        `${whole} is multiplied by ${frac(n, d)}. Without working it out, the result is`,
        verdict,
        [
          "Smaller than the number it started at",
          "Larger than the number it started at",
          "Exactly the number it started at",
          "Always zero",
        ],
        r,
      );
    },
    (r) => {
      const whole = r.int(4, 40);
      const d = r.int(2, 8);
      const n = r.bool() ? r.int(1, d - 1) : d + r.int(1, 6);
      return fill(
        `Is ${whole} × ${frac(n, d)} greater or less than ${whole}? Type greater or less.`,
        n > d ? "greater" : "less",
        { hint: "greater or less" },
      );
    },
    (r) => {
      const factor = r.pick([0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2]);
      const from = r.pick([4, 8, 12, 16, 20, 24]);
      return slider(
        `Place the scale factor that turns ${from} into ${dp(from * factor)}.`,
        { min: 0, max: 2, step: 0.25, value: factor, full: 0.25, zero: 0.75 },
      );
    },
  ],

  // ── 4.6 Multiplying mixed numbers ──
  "math/grade-5/unit-4/4.6": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5]);
      const b = properFraction(r, [2, 3, 4, 5]);
      const w1 = r.int(1, 4);
      const w2 = r.int(1, 4);
      const value = asMixed((w1 * a.d + a.n) * (w2 * b.d + b.n), a.d * b.d);
      return fill(
        `Multiply these mixed numbers: ${mixed(w1, a.n, a.d)} × ${mixed(w2, b.n, b.d)}`,
        value.show,
        { accept: value.accept, hint: "a mixed number" },
      );
    },
    (r) => {
      const a = properFraction(r, [2, 4]);
      const b = properFraction(r, [2, 4]);
      const w1 = r.int(1, 3);
      const w2 = r.int(1, 3);
      const value = asMixed((w1 * a.d + a.n) * (w2 * b.d + b.n), a.d * b.d);
      return fill(
        `A recipe calls for ${mixed(w1, a.n, a.d)} cups of milk and you are making ${mixed(w2, b.n, b.d)} batches. How many cups do you need?`,
        value.show,
        { accept: value.accept, unit: "cups", hint: "a mixed number" },
      );
    },
    (r) => {
      const w1 = r.int(1, 4);
      const w2 = r.int(1, 4);
      return slider(`Place the product ${w1} 1/2 × ${w2} 1/2.`, {
        min: 0,
        max: 25,
        step: 0.25,
        value: dp((w1 + 0.5) * (w2 + 0.5)),
        full: 0.25,
        zero: 2,
      });
    },
  ],

  // ── 4.7 Dividing a whole number by a unit fraction ──
  "math/grade-5/unit-4/4.7": [
    (r) => {
      const whole = r.int(2, 9);
      const d = r.int(2, 8);
      return fill(`Divide by a unit fraction: ${whole} ÷ 1/${d}`, whole * d, {
        hint: "a number",
      });
    },
    (r) => {
      const metres = r.int(2, 8);
      const d = r.int(2, 6);
      return fill(
        `A ribbon ${metres} metres long is cut into pieces 1/${d} of a metre long. How many pieces are there?`,
        metres * d,
        { unit: "pieces", hint: "a number" },
      );
    },
    (r) => {
      const whole = r.int(2, 8);
      const d = r.int(2, 5);
      return slider(`Place the quotient ${whole} ÷ 1/${d}.`, {
        min: 0,
        max: 40,
        step: 1,
        value: whole * d,
        full: 1,
        zero: 5,
      });
    },
  ],

  // ── 4.8 Dividing a unit fraction by a whole number ──
  "math/grade-5/unit-4/4.8": [
    (r) => {
      const d = r.int(2, 8);
      const whole = r.int(2, 8);
      return fill(
        `Divide a unit fraction by a whole number: 1/${d} ÷ ${whole}`,
        frac(1, d * whole),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const d = r.int(2, 6);
      const glasses = r.int(2, 6);
      return fill(
        `1/${d} of a litre of juice is shared equally among ${glasses} glasses. How much is in each glass?`,
        frac(1, d * glasses),
        { unit: "litres", hint: "a fraction" },
      );
    },
    (r) => {
      const [d, whole] = r.pick([
        [2, 2],
        [2, 5],
        [2, 10],
        [4, 5],
        [5, 2],
        [5, 4],
        [10, 2],
      ]);
      return slider(`Place the quotient 1/${d} ÷ ${whole}.`, {
        min: 0,
        max: 1,
        step: 0.05,
        value: dp(1 / (d * whole)),
        full: 0.05,
        zero: 0.15,
      });
    },
  ],

  // ── 4.9 Converting between fractions and decimals ──
  "math/grade-5/unit-4/4.9": [
    (r) => {
      const { n, d } = properFraction(r, [2, 4, 5, 8, 10, 20, 25]);
      return fill(`Write ${n}/${d} as a decimal.`, dp(n / d, 3), {
        hint: "a decimal",
      });
    },
    (r) => {
      const hundredths = r.int(1, 99);
      return fill(
        `Write ${dp(hundredths / 100)} as a fraction in lowest terms.`,
        frac(hundredths, 100),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const { n, d } = properFraction(r, TWENTIETHS);
      return slider(`Place ${n}/${d} as a decimal on a line from 0 to 1.`, {
        min: 0,
        max: 1,
        step: 0.05,
        value: dp(n / d),
        full: 0.05,
        zero: 0.2,
      });
    },
  ],

  // ── 5.1 Order of operations with grouping symbols ──
  "math/grade-5/unit-5/5.1": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      const c = r.int(2, 12);
      const d = r.int(1, 20);
      return fill(
        `Work out the value: ${a} × (${b} + ${c}) - ${d}`,
        a * (b + c) - d,
        { hint: "a number" },
      );
    },
    // The brackets run backwards: the result is given and what belongs inside
    // them is the question.
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      const missing = r.int(2, 15);
      return fill(
        `Insert the missing number: ${a} × (? + ${b}) = ${a * (missing + b)}`,
        missing,
        { hint: "a number" },
      );
    },
    (r) => {
      const c = r.int(2, 6);
      const b = r.int(2, 12);
      const a = b + c * r.int(1, 8);
      const d = r.int(1, 9);
      return slider(`Place the value of (${a} - ${b}) ÷ ${c} + ${d}.`, {
        min: 0,
        max: 20,
        step: 1,
        value: (a - b) / c + d,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 5.2 Writing numerical expressions from words ──
  "math/grade-5/unit-5/5.2": [
    (r) => {
      const a = r.int(2, 20);
      const b = r.int(2, 20);
      const c = r.int(2, 9);
      return fill(
        `What is the value of "the sum of ${a} and ${b}, multiplied by ${c}"?`,
        (a + b) * c,
        { hint: "a number" },
      );
    },
    // Which expression says it is a question about form rather than value, so
    // it is the one that belongs on four options.
    (r) => {
      const a = r.int(2, 20);
      const b = r.int(2, 20);
      const c = r.int(2, 9);
      return among(
        `Which expression means "${c} times the sum of ${a} and ${b}"?`,
        `${c} × (${a} + ${b})`,
        [
          `${c} × (${a} + ${b})`,
          `${c} × ${a} + ${b}`,
          `${a} + ${b} × ${c}`,
          `(${c} + ${a}) × ${b}`,
        ],
        r,
      );
    },
    (r) => {
      const a = r.int(2, 12);
      const b = a + r.int(1, 12);
      return slider(
        `Place the value of "subtract ${a} from ${b}, then double the result".`,
        { min: 0, max: 30, step: 1, value: 2 * (b - a), full: 1, zero: 6 },
      );
    },
  ],

  // ── 5.3 Interpreting expressions without evaluating ──
  "math/grade-5/unit-5/5.3": [
    (r) => {
      const times = r.int(2, 9);
      const a = r.int(120, 900);
      const b = r.int(15, 99);
      return fill(
        `Without working it out: ${times} × (${a} + ${b}) is how many times as large as ${a} + ${b}?`,
        times,
        { hint: "a number" },
      );
    },
    (r) => {
      const times = r.pick([2, 3]);
      const a = r.int(120, 900);
      const b = r.int(15, 99);
      return among(
        `How does ${times} × (${a} + ${b}) compare with ${a} + ${b}?`,
        times === 2 ? "Twice as large" : "Three times as large",
        [
          "Twice as large",
          "Three times as large",
          "Half as large",
          "Exactly the same",
        ],
        r,
      );
    },
    (r) => {
      const scale = r.pick([
        { text: "1/4", value: 0.25 },
        { text: "1/2", value: 0.5 },
        { text: "3/4", value: 0.75 },
        { text: "3/2", value: 1.5 },
      ]);
      const a = r.int(120, 900);
      const b = r.int(15, 99);
      return slider(
        `${scale.text} × (${a} + ${b}) is how many times as large as ${a} + ${b}? Place your answer.`,
        { min: 0, max: 2, step: 0.25, value: scale.value, full: 0.25, zero: 0.75 },
      );
    },
  ],

  // ── 5.4 Numerical patterns and rules ──
  "math/grade-5/unit-5/5.4": [
    (r) => {
      const start = r.int(1, 20);
      const step = r.int(2, 12);
      return fill(
        `A plant is measured each week: ${start}, ${start + step}, ${start + 2 * step}, ${start + 3 * step} mm. Growing the same way, what comes next?`,
        start + 4 * step,
        { hint: "a number" },
      );
    },
    (r) => {
      const start = r.int(2, 5);
      const times = r.int(2, 4);
      const which = r.int(3, 5);
      const names = ["third", "fourth", "fifth"];
      return fill(
        `A pattern follows the rule "multiply by ${times}" and starts at ${start}. What is the ${names[which - 3]} term?`,
        start * times ** (which - 1),
        { hint: "a number" },
      );
    },
    (r) => {
      const start = r.int(1, 10);
      const step = r.int(2, 8);
      const which = r.int(4, 6);
      const names = ["fourth", "fifth", "sixth"];
      return slider(
        `A pattern starts at ${start} and adds ${step} each time. Place the ${names[which - 4]} term.`,
        {
          min: 0,
          max: 60,
          step: 1,
          value: start + (which - 1) * step,
          full: 1,
          zero: 6,
        },
      );
    },
  ],

  // ── 5.5 Generating two related patterns ──
  "math/grade-5/unit-5/5.5": [
    (r) => {
      const first = r.int(2, 6);
      const times = r.int(2, 4);
      const step = r.int(2, 5);
      const second = first * times;
      return fill(
        `Pattern A starts at 0 and adds ${first}. Pattern B starts at 0 and adds ${second}. When a term of A is ${first * step}, what is the matching term of B?`,
        second * step,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 6);
      const times = r.int(2, 5);
      const second = first * times;
      const terms = (gap: number) =>
        [0, gap, 2 * gap, 3 * gap].join(", ");
      return fill(
        `Each term of pattern B is how many times the matching term of pattern A? A: ${terms(first)}. B: ${terms(second)}.`,
        times,
        { hint: "a number" },
      );
    },
    // The pairing itself, plotted — which is the whole reason the standard
    // pairs two patterns rather than listing one.
    (r) => {
      const first = 1;
      const times = r.int(2, 4);
      const step = r.int(2, Math.floor(9 / times));
      return point(
        `Pattern A adds ${first} and pattern B adds ${first * times}, both starting at 0. Plot the pair (A, B) at step ${step}.`,
        { span: 10, x: first * step, y: first * times * step },
      );
    },
  ],

  // ── 5.6 Graphing pattern pairs as ordered pairs ──
  "math/grade-5/unit-5/5.6": [
    (r) => {
      const times = r.int(2, 3);
      const input = r.int(1, Math.floor(9 / times));
      return point(
        `A rule pairs each input with ${times} times itself. Plot the point for an input of ${input}.`,
        { span: 10, x: input, y: input * times },
      );
    },
    (r) => {
      const times = r.int(2, 9);
      const input = r.int(2, 9);
      return fill(
        `The rule multiplies each input by ${times}. In the ordered pair (${input}, ?), what is the missing coordinate?`,
        input * times,
        { hint: "a number" },
      );
    },
    (r) => {
      const add = r.int(1, 8);
      const input = r.int(1, 9);
      return slider(
        `The rule doubles each input and then adds ${add}. Place the output when the input is ${input}.`,
        { min: 0, max: 30, step: 1, value: 2 * input + add, full: 1, zero: 5 },
      );
    },
  ],

  // ── 5.7 Introduction to variables ──
  "math/grade-5/unit-5/5.7": [
    (r) => {
      const value = r.int(2, 12);
      const a = r.int(2, 9);
      const b = r.int(1, 20);
      return fill(`If n = ${value}, what is ${a}n + ${b}?`, a * value + b, {
        hint: "a number",
      });
    },
    (r) => {
      const value = r.int(2, 12);
      const a = r.int(2, 9);
      return fill(
        `Write the missing value: ${a} × n = ${a * value}. What is n?`,
        value,
        { hint: "a number" },
      );
    },
    (r) => {
      const price = r.int(4, 25);
      const fee = r.int(2, 6);
      return slider(
        `A book costs p dollars and a $${fee} delivery charge is added. If the total is $${price + fee}, place p.`,
        { min: 0, max: 30, step: 1, value: price, full: 1, zero: 5 },
      );
    },
  ],

  // ── 6.1 Points, axes and the origin ──
  "math/grade-5/unit-6/6.1": [
    (r) => {
      const along = r.int(2, 9);
      const onX = r.bool();
      return point(
        `Plot the point ${along} units from the origin along the ${onX ? "x" : "y"}-axis, in the positive direction.`,
        { span: 10, x: onX ? along : 0, y: onX ? 0 : along },
      );
    },
    (r) => {
      const along = r.int(2, 9);
      const onX = r.bool();
      return fill(
        `The point (${onX ? along : 0}, ${onX ? 0 : along}) lies on which axis? Type x or y.`,
        onX ? "x" : "y",
        { hint: "x or y" },
      );
    },
    (r) => {
      const x = r.int(1, 9);
      const y = r.int(1, 9);
      const wantX = r.bool();
      return fill(
        `In the pair (${x}, ${y}), which number tells you how far to move ${wantX ? "right" : "up"} from the origin?`,
        wantX ? x : y,
        { hint: "a number" },
      );
    },
  ],

  // ── 6.2 Plotting ordered pairs in the first quadrant ──
  "math/grade-5/unit-6/6.2": [
    (r) => {
      const x = r.int(1, 9);
      const y = r.int(1, 9);
      return point(`Plot (${x}, ${y}).`, { span: 10, x, y });
    },
    (r) => {
      const x = r.int(1, 9);
      const y = r.int(1, 9);
      return point(
        `Plot the point ${x} units right and ${y} units up from the origin.`,
        { span: 10, x, y },
      );
    },
    (r) => {
      const x = r.int(1, 9);
      const y = r.int(1, 9);
      const wantY = r.bool();
      return fill(
        `Point P is ${x} units right and ${y} units up from the origin. What is its ${wantY ? "y" : "x"}-coordinate?`,
        wantY ? y : x,
        { hint: "a number" },
      );
    },
  ],

  // ── 6.3 Reading coordinates from a graph ──
  "math/grade-5/unit-6/6.3": [
    (r) => {
      const x = r.int(1, 9);
      const y = r.int(1, 9);
      return fill(
        "The graph shows point P. What is its x-coordinate?",
        x,
        {
          hint: "a number",
          figure: graph({ span: 10, curves: [], marks: [dot(x, y, { label: "P" })] }),
        },
      );
    },
    (r) => {
      const x = r.int(1, 9);
      const y = r.int(1, 9);
      return fill(
        "Point R is marked on the grid. How far above the x-axis is it?",
        y,
        {
          hint: "a number",
          figure: graph({ span: 10, curves: [], marks: [dot(x, y, { label: "R" })] }),
        },
      );
    },
    (r) => {
      const x = r.int(1, 9);
      const y = r.int(1, 9);
      return slider("The graph shows point T. Place its y-coordinate.", {
        min: 0,
        max: 10,
        step: 1,
        value: y,
        full: 1,
        zero: 3,
        figure: graph({ span: 10, curves: [], marks: [dot(x, y, { label: "T" })] }),
      });
    },
  ],

  // ── 6.4 Distance between points on an axis ──
  "math/grade-5/unit-6/6.4": [
    (r) => {
      const y = r.int(1, 9);
      const x1 = r.int(1, 4);
      const x2 = x1 + r.int(1, 5);
      return fill(
        `How far apart are (${x1}, ${y}) and (${x2}, ${y})?`,
        x2 - x1,
        { unit: "units", hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(1, 9);
      const y1 = r.int(1, 4);
      const y2 = y1 + r.int(1, 5);
      return fill(
        `Two trees stand at (${x}, ${y1}) and (${x}, ${y2}) on a park map where one unit is one metre. How far apart are they?`,
        y2 - y1,
        { unit: "metres", hint: "a number" },
      );
    },
    (r) => {
      const y = r.int(1, 9);
      const gap = r.int(2, 8);
      const x = r.int(gap - 9, 9);
      return point(
        `The point (${x}, ${y}) sits ${gap} units to the right of another point on the same horizontal line. Plot that other point.`,
        { span: 10, x: x - gap, y },
      );
    },
  ],

  // ── 6.5 Representing real-world problems on a grid ──
  "math/grade-5/unit-6/6.5": [
    (r) => {
      const east = r.int(1, 9);
      const north = r.int(1, 9);
      return point(
        `On a map, the school is ${east} blocks east and ${north} blocks north of the crossroads at the origin. Plot the school.`,
        { span: 10, x: east, y: north },
      );
    },
    (r) => {
      const x = r.int(1, 9);
      const y1 = r.int(1, 4);
      const y2 = y1 + r.int(2, 5);
      return fill(
        `A park is at (${x}, ${y2}) and a shop is at (${x}, ${y1}) on a map of city blocks. How many blocks apart are they?`,
        y2 - y1,
        { unit: "blocks", hint: "a number" },
      );
    },
    (r) => {
      const y = r.int(1, 9);
      const x1 = r.int(1, 4);
      const x2 = x1 + r.int(2, 6);
      return slider(
        `A bus goes from (${x1}, ${y}) to (${x2}, ${y}) on a map of city blocks. Place how many blocks it travelled.`,
        { min: 0, max: 15, step: 1, value: x2 - x1, unit: "blocks", full: 1, zero: 4 },
      );
    },
  ],

  // ── 6.6 Extending to all four quadrants ──
  "math/grade-5/unit-6/6.6": [
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      return point(`Plot (${x}, ${y}).`, { span: 10, x, y });
    },
    // Naming the quadrant is a classification, and the only one this subunit
    // asks for.
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      const quadrant =
        x > 0 && y > 0
          ? "The first quadrant"
          : x < 0 && y > 0
            ? "The second quadrant"
            : x < 0
              ? "The third quadrant"
              : "The fourth quadrant";
      return among(
        `In which quadrant does (${x}, ${y}) lie?`,
        quadrant,
        [
          "The first quadrant",
          "The second quadrant",
          "The third quadrant",
          "The fourth quadrant",
        ],
        r,
      );
    },
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      const acrossX = r.bool();
      return point(
        `Plot the reflection of (${x}, ${y}) across the ${acrossX ? "x" : "y"}-axis.`,
        { span: 10, x: acrossX ? x : -x, y: acrossX ? -y : y },
      );
    },
  ],

  // ── 7.1 Converting within the metric system ──
  "math/grade-5/unit-7/7.1": [
    (r) => {
      const scale = r.pick([
        { from: "metres", to: "centimetres", times: 100 },
        { from: "kilometres", to: "metres", times: 1000 },
        { from: "litres", to: "millilitres", times: 1000 },
        { from: "kilograms", to: "grams", times: 1000 },
      ]);
      const amount = dp(r.int(11, 99) / 10, 1);
      return fill(
        `How many ${scale.to} are in ${amount} ${scale.from}?`,
        dp(amount * scale.times, 1),
        { unit: scale.to, hint: "a number" },
      );
    },
    (r) => {
      const litres = dp(r.int(11, 99) / 10, 1);
      return fill(
        `A bottle holds ${litres} litres. How many millilitres is that?`,
        dp(litres * 1000, 1),
        { unit: "millilitres", hint: "a number" },
      );
    },
    (r) => {
      const halves = r.int(1, 9);
      return slider(`Place the number of grams in ${dp(halves / 2)} kilograms.`, {
        min: 0,
        max: 5000,
        step: 100,
        value: halves * 500,
        unit: "grams",
        full: 100,
        zero: 800,
      });
    },
  ],

  // ── 7.2 Converting within the customary system ──
  "math/grade-5/unit-7/7.2": [
    (r) => {
      const feet = r.int(2, 12);
      return fill(`How many inches are in ${feet} feet?`, feet * 12, {
        unit: "inches",
        hint: "a number",
      });
    },
    (r) => {
      const quarts = r.int(2, 9);
      return fill(
        `A recipe needs ${quarts} quarts of stock. How many cups is that?`,
        quarts * 4,
        { unit: "cups", hint: "a number" },
      );
    },
    (r) => {
      const pounds = r.int(1, 6);
      return slider(`Place the number of ounces in ${pounds} pounds.`, {
        min: 0,
        max: 96,
        step: 1,
        value: pounds * 16,
        unit: "ounces",
        full: 1,
        zero: 10,
      });
    },
  ],

  // ── 7.3 Multi-step conversion problems ──
  "math/grade-5/unit-7/7.3": [
    (r) => {
      const pieces = r.int(4, 15);
      const each = r.pick([10, 20, 25, 50]);
      return fill(
        `A rope is ${dp((pieces * each) / 100)} m long and is cut into pieces ${each} cm long. How many pieces are there?`,
        pieces,
        { unit: "pieces", hint: "a number" },
      );
    },
    (r) => {
      const glasses = r.int(4, 12);
      const each = r.pick([125, 200, 250, 500]);
      return fill(
        `A jug holds ${dp((glasses * each) / 1000)} litres and a glass holds ${each} mL. How many glasses does the jug fill?`,
        glasses,
        { unit: "glasses", hint: "a number" },
      );
    },
    (r) => {
      const bottles = r.int(2, 12);
      const each = r.pick([250, 500]);
      return slider(
        `A tank holds ${dp((bottles * each) / 1000)} litres. Place how many ${each} mL bottles it fills.`,
        { min: 0, max: 15, step: 1, value: bottles, full: 1, zero: 4 },
      );
    },
  ],

  // ── 7.4 Volume as unit cubes ──
  "math/grade-5/unit-7/7.4": [
    (r) => {
      const long = r.int(2, 8);
      const wide = r.int(2, 8);
      const layers = r.int(2, 6);
      return fill(
        `A solid is built from unit cubes, ${long} by ${wide} on the base and ${layers} layers high. How many cubes is that?`,
        long * wide * layers,
        { unit: "cubes", hint: "a number" },
      );
    },
    (r) => {
      const perLayer = r.int(4, 24);
      const layers = r.int(2, 6);
      return fill(
        `A box is filled with ${perLayer * layers} unit cubes in ${layers} equal layers. How many cubes are in each layer?`,
        perLayer,
        { unit: "cubes", hint: "a number" },
      );
    },
    (r) => {
      const long = r.int(2, 6);
      const wide = r.int(2, 5);
      const high = r.int(2, 4);
      return slider(
        `A prism is ${long} cubes long, ${wide} cubes wide and ${high} cubes high. Place its volume.`,
        {
          min: 0,
          max: 120,
          step: 1,
          value: long * wide * high,
          unit: "cubic units",
          full: 1,
          zero: 10,
        },
      );
    },
  ],

  // ── 7.5 Volume of a rectangular prism ──
  "math/grade-5/unit-7/7.5": [
    (r) => {
      const long = r.int(2, 12);
      const wide = r.int(2, 10);
      const high = r.int(2, 9);
      return fill(
        `A shipping carton is ${long} cm by ${wide} cm by ${high} cm. What is its volume?`,
        long * wide * high,
        { unit: "cubic centimetres", hint: "a number" },
      );
    },
    (r) => {
      const long = r.int(2, 10);
      const wide = r.int(2, 10);
      const high = r.int(2, 9);
      return fill(
        `A prism has a volume of ${long * wide * high} cm³ and a base ${long} cm by ${wide} cm. How tall is it?`,
        high,
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const long = r.pick([20, 30, 40]);
      const wide = r.pick([10, 20]);
      const high = r.pick([25, 50]);
      return slider(
        `An aquarium is ${long} cm by ${wide} cm by ${high} cm. Place its volume in litres.`,
        {
          min: 0,
          max: 60,
          step: 1,
          value: (long * wide * high) / 1000,
          unit: "litres",
          full: 1,
          zero: 8,
        },
      );
    },
  ],

  // ── 7.6 Volume formulas ──
  "math/grade-5/unit-7/7.6": [
    (r) => {
      const base = r.int(6, 40);
      const high = r.int(2, 12);
      return fill(
        `A prism has a base area of ${base} cm² and a height of ${high} cm. What is its volume?`,
        base * high,
        { unit: "cubic centimetres", hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(6, 40);
      const high = r.int(2, 12);
      return fill(
        `The volume of a prism is ${base * high} cm³ and its height is ${high} cm. What is its base area?`,
        base,
        { unit: "square centimetres", hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(4, 20);
      const high = r.int(2, 10);
      return slider(
        `Place the height of a prism whose volume is ${base * high} cm³ and whose base area is ${base} cm².`,
        { min: 0, max: 20, step: 1, value: high, unit: "centimetres", full: 1, zero: 4 },
      );
    },
  ],

  // ── 7.7 Volume of composite solids ──
  "math/grade-5/unit-7/7.7": [
    (r) => {
      const a = r.int(2, 8);
      const b = r.int(2, 6);
      const c = r.int(2, 5);
      const side = r.int(2, 4);
      return fill(
        `A solid is a ${a} by ${b} by ${c} prism with a cube of side ${side} joined onto it. What is its total volume?`,
        a * b * c + side ** 3,
        { unit: "cubic units", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(4, 9);
      const b = r.int(4, 8);
      const c = r.int(3, 6);
      const side = r.int(2, 3);
      return fill(
        `A block of cheese ${a} by ${b} by ${c} cm has a cube of side ${side} cm cut out of it. What volume is left?`,
        a * b * c - side ** 3,
        { unit: "cubic units", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 5);
      const b = r.int(2, 5);
      const first = r.int(1, 4);
      const second = r.int(1, 4);
      return slider(
        `A shape is two prisms stacked, ${a} by ${b} by ${first} and ${a} by ${b} by ${second}. Place its volume.`,
        {
          min: 0,
          max: 200,
          step: 1,
          value: a * b * (first + second),
          unit: "cubic units",
          full: 1,
          zero: 12,
        },
      );
    },
  ],

  // ── 7.8 Line plots with fractional measurements ──
  "math/grade-5/unit-7/7.8": [
    (r) => {
      const lengths = Array.from({ length: 4 }, () => r.pick([1, 2, 3, 4]));
      const total = asMixed(
        lengths.reduce((n, q) => n + q, 0),
        4,
      );
      return fill(
        `A line plot shows lengths ${lengths.map((q) => frac(q, 4)).join(", ")} of a metre. What do they come to altogether?`,
        total.show,
        { accept: total.accept, unit: "metres", hint: "a mixed number" },
      );
    },
    (r) => {
      const quarters = Array.from({ length: 4 }, () => r.pick([1, 2, 3, 4]));
      const each = asMixed(
        quarters.reduce((n, q) => n + q, 0),
        16,
      );
      return fill(
        `Four ribbons measure ${quarters.map((q) => frac(q, 4)).join(", ")} of a metre. Shared out equally, how long would each be?`,
        each.show,
        { accept: each.accept, unit: "metres", hint: "a fraction" },
      );
    },
    (r) => {
      const halves = r.int(1, 5);
      const threeQuarters = r.int(1, 5);
      return slider(
        `A line plot shows ${halves} seedlings at 1/2 cm and ${threeQuarters} at 3/4 cm. Place their total height.`,
        {
          min: 0,
          max: 10,
          step: 0.25,
          value: dp(halves * 0.5 + threeQuarters * 0.75),
          unit: "centimetres",
          full: 0.25,
          zero: 1.5,
        },
      );
    },
  ],

  // ── 8.1 Classifying triangles ──
  "math/grade-5/unit-8/8.1": [
    // Naming the family is a classification, so it is the multiple-choice ask
    // this subunit is allowed.
    (r) => {
      const kind = r.int(0, 2);
      const a = r.int(4, 9);
      const b = a + r.int(1, 4);
      const c = b + r.int(1, Math.max(1, a - 1));
      const sides =
        kind === 0 ? [a, a, a] : kind === 1 ? [a, a, r.int(2, 2 * a - 1)] : [a, b, c];
      const answer =
        kind === 0 ? "Equilateral" : kind === 1 ? "Isosceles" : "Scalene";
      return among(
        `A triangle has sides ${sides.join(", ")}. What kind of triangle is it, by its sides?`,
        answer,
        ["Equilateral", "Isosceles", "Scalene", "Right-angled"],
        r,
      );
    },
    (r) => {
      const a = r.int(20, 80);
      const b = r.int(20, 170 - a);
      return fill(
        `A triangle has angles of ${a}° and ${b}°. What is the third angle?`,
        180 - a - b,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const a = 5 * r.int(4, 16);
      const b = 5 * r.int(4, Math.floor((175 - a) / 5));
      return slider(
        `A triangle has two angles of ${a}° and ${b}°. Place the third angle.`,
        {
          min: 0,
          max: 180,
          step: 5,
          value: 180 - a - b,
          unit: "degrees",
          full: 5,
          zero: 30,
        },
      );
    },
  ],

  // ── 8.2 Classifying quadrilaterals ──
  "math/grade-5/unit-8/8.2": [
    (r) => {
      const shape = r.pick([
        { clue: "four equal sides and four right angles", name: "Square" },
        { clue: "four right angles but only opposite sides equal", name: "Rectangle" },
        { clue: "four equal sides but no right angles", name: "Rhombus" },
        { clue: "exactly one pair of parallel sides", name: "Trapezoid" },
      ]);
      return among(
        `A quadrilateral has ${shape.clue}. What is it?`,
        shape.name,
        ["Square", "Rectangle", "Rhombus", "Trapezoid"],
        r,
      );
    },
    (r) => {
      const a = r.int(40, 130);
      const b = r.int(40, 130);
      const c = r.int(40, Math.max(40, 340 - a - b));
      return fill(
        `A quadrilateral has angles of ${a}°, ${b}° and ${c}°. What is the fourth angle?`,
        360 - a - b - c,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const side = r.int(2, 15);
      return slider(
        `A rhombus has a perimeter of ${4 * side} cm. Place the length of one side.`,
        { min: 0, max: 20, step: 1, value: side, unit: "centimetres", full: 1, zero: 4 },
      );
    },
  ],

  // ── 8.3 The quadrilateral hierarchy ──
  "math/grade-5/unit-8/8.3": [
    // The hierarchy is a sequence, so it is asked as one.
    (r) =>
      order(
        "Put these in order, from the most general to the most specific.",
        ["Quadrilateral", "Parallelogram", "Rectangle", "Square"],
        r,
      ),
    (r) => {
      const pool = [
        { name: "square", parallelogram: true },
        { name: "rectangle", parallelogram: true },
        { name: "rhombus", parallelogram: true },
        { name: "trapezoid", parallelogram: false },
        { name: "kite", parallelogram: false },
      ];
      const shown = shuffled(pool, r).slice(0, 4);
      return fill(
        `How many of these are always parallelograms: ${shown.map((s) => s.name).join(", ")}?`,
        shown.filter((s) => s.parallelogram).length,
        { hint: "a number from 0 to 4" },
      );
    },
    (r) => {
      const claim = r.pick([
        { of: "square", is: "rectangle", answer: "yes" },
        { of: "rectangle", is: "square", answer: "no" },
        { of: "square", is: "rhombus", answer: "yes" },
        { of: "rhombus", is: "square", answer: "no" },
        { of: "rectangle", is: "parallelogram", answer: "yes" },
        { of: "parallelogram", is: "rectangle", answer: "no" },
      ]);
      return fill(
        `Is every ${claim.of} a ${claim.is}? Type yes or no.`,
        claim.answer,
        { hint: "yes or no" },
      );
    },
  ],

  // ── 8.4 Parallel and perpendicular sides ──
  "math/grade-5/unit-8/8.4": [
    (r) => {
      const shape = r.pick([
        { name: "trapezoid", pairs: 1 },
        { name: "parallelogram", pairs: 2 },
        { name: "rectangle", pairs: 2 },
        { name: "square", pairs: 2 },
        { name: "kite", pairs: 0 },
      ]);
      return fill(
        `How many pairs of parallel sides does a ${shape.name} have?`,
        shape.pairs,
        { hint: "a number" },
      );
    },
    // Naming the relationship, which is what the words are for.
    (r) => {
      const claim = r.pick([
        { clue: "meet at a right angle", name: "Perpendicular" },
        { clue: "never meet, however far they run", name: "Parallel" },
      ]);
      return among(
        `What do you call two sides that ${claim.clue}?`,
        claim.name,
        ["Perpendicular", "Parallel", "Equal in length", "Diagonal"],
        r,
      );
    },
    (r) => {
      const x1 = r.int(-8, 2);
      const x2 = x1 + r.int(2, 6);
      const y1 = r.int(-8, 2);
      const y2 = y1 + r.int(2, 6);
      return point(
        `A rectangle has corners at (${x1}, ${y1}), (${x2}, ${y1}) and (${x2}, ${y2}). Plot the fourth corner.`,
        { span: 10, x: x1, y: y2 },
      );
    },
  ],

  // ── 8.5 Area of rectangles with fractional side lengths ──
  "math/grade-5/unit-8/8.5": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      return fill(
        `A rectangle is ${a.n}/${a.d} m long and ${b.n}/${b.d} m wide. What is its area?`,
        frac(a.n * b.n, a.d * b.d),
        { unit: "square metres", hint: "a fraction" },
      );
    },
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6]);
      const b = properFraction(r, [2, 3, 4, 5, 6]);
      return fill(
        `A rectangle has an area of ${frac(a.n * b.n, a.d * b.d)} m² and one side of ${a.n}/${a.d} m. How long is the other side?`,
        frac(b.n, b.d),
        { unit: "metres", hint: "a fraction" },
      );
    },
    (r) => {
      // Odd halves only: a whole number of centimetres is not a fractional
      // side length, and this subunit is about the fraction.
      const halves = 2 * r.int(1, 7) + 1;
      const whole = r.int(2, 6);
      return slider(
        `A tile is ${asMixed(halves, 2).show} cm long and ${whole} cm wide. Place its area.`,
        {
          min: 0,
          max: 50,
          step: 0.5,
          value: dp((halves / 2) * whole),
          unit: "square centimetres",
          full: 0.5,
          zero: 4,
        },
      );
    },
  ],

  // ── 8.6 Perimeter and area problems ──
  "math/grade-5/unit-8/8.6": [
    (r) => {
      const long = r.int(3, 20);
      const wide = r.int(2, 15);
      return fill(
        `A photo frame is ${long} cm by ${wide} cm. What is its perimeter?`,
        2 * (long + wide),
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const long = r.int(4, 20);
      const wide = r.int(2, 15);
      return fill(
        `A rectangle has a perimeter of ${2 * (long + wide)} cm and one side of ${long} cm. What is its area?`,
        long * wide,
        { unit: "square centimetres", hint: "a number" },
      );
    },
    (r) => {
      const long = r.int(3, 20);
      const wide = r.pick([5, 10]);
      return slider(`A garden is ${long} m by ${wide} m. Place its area.`, {
        min: 0,
        max: 200,
        step: 5,
        value: long * wide,
        unit: "square metres",
        full: 5,
        zero: 30,
      });
    },
  ],
};

/** Whether n is prime. Small numbers only, which is all this course has. */
function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Every prime factor of n, in order, with repeats. */
function primeFactors(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  for (let d = 2; d * d <= rest; d++) {
    while (rest % d === 0) {
      out.push(d);
      rest /= d;
    }
  }
  if (rest > 1) out.push(rest);
  return out;
}
