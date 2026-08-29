import "server-only";

import {
  among,
  ask,
  asMixed,
  dp,
  fill,
  frac,
  gcd,
  head,
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
 * Grade 6 generators.
 *
 * Keyed by subunit, and in the same order as this subunit's entry in
 * `GENERATED` — a generator's index is baked into every instance id it has
 * minted, so append rather than insert.
 *
 * Written to the same two rules as Grade 5: three generators per subunit that
 * differ in the shape of the ask rather than in their digits, and multiple
 * choice only where the answer is genuinely a name or a classification.
 *
 * Grade 6 is where the number line goes negative and letters arrive, so the
 * sliders carry more of the load than they did a year earlier: a signed
 * number, an absolute value and an inequality boundary are all questions about
 * where something sits, and placing them is the question rather than a way of
 * dressing it up.
 */

// ─── Small helpers ───────────────────────────────────────

/** "3:4" — a ratio in lowest terms, which is the form these answers take. */
function ratio(a: number, b: number): string {
  const g = gcd(a, b);
  return `${a / g}:${b / g}`;
}

/** A price, always with both decimal places, because money is written that way. */
function money(amount: number): string {
  return dp(amount).toFixed(2);
}

/** The mean of a list, and the list's total, which most questions want too. */
function total(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0);
}

/** The middle value once sorted, averaging the two middles for an even count. */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[half]
    : dp((sorted[half - 1] + sorted[half]) / 2, 1);
}

/**
 * A list of whole numbers whose mean comes out whole.
 *
 * Built by rolling the values and then nudging the last one, rather than by
 * rerolling until the total happens to divide: the mean of a data set is the
 * answer to half these questions, and "13.833333" is not an answer a Grade 6
 * question should ever have.
 */
function meanList(r: Rng, count: number, low: number, high: number): number[] {
  const values = Array.from({ length: count }, () => r.int(low, high));
  const rest = total(values.slice(0, -1));
  const wanted = Math.round((rest + values[count - 1]) / count) * count;
  values[count - 1] = wanted - rest;
  // The nudge can push the last value outside the range it was rolled in; when
  // it does, step the whole list up by one count instead.
  if (values[count - 1] < low) values[count - 1] += count;
  if (values[count - 1] > high) values[count - 1] -= count;
  return values;
}

/** The five-number summary of a list, for the box-plot questions. */
function summary(values: readonly number[]): {
  min: number;
  q1: number;
  middle: number;
  q3: number;
  max: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    q1: median(sorted.slice(0, half)),
    middle: median(sorted),
    q3: median(sorted.slice(sorted.length % 2 ? half + 1 : half)),
    max: sorted[sorted.length - 1],
  };
}

/** The solids these questions name, with the faces they are built from. */
const SOLIDS = [
  { name: "triangular prism", net: "two triangles and three rectangles", faces: 5 },
  { name: "rectangular prism", net: "three pairs of matching rectangles", faces: 6 },
  { name: "square pyramid", net: "a square and four triangles", faces: 5 },
  { name: "cube", net: "six identical squares", faces: 6 },
] as const;

/**
 * Signed numbers written three different ways, no two of them equal.
 *
 * Ordering these is the point of 3.5: a student who has learned that a longer
 * numeral is a bigger number has to unlearn it twice over here, once for the
 * minus sign and once for the fraction.
 */
const RATIONALS = [
  { text: "-3", value: -3 },
  { text: "-5/2", value: -2.5 },
  { text: "-2", value: -2 },
  { text: "-3/2", value: -1.5 },
  { text: "-1", value: -1 },
  { text: "-0.5", value: -0.5 },
  { text: "0", value: 0 },
  { text: "1/4", value: 0.25 },
  { text: "0.75", value: 0.75 },
  { text: "1", value: 1 },
  { text: "3/2", value: 1.5 },
  { text: "2.5", value: 2.5 },
  { text: "3", value: 3 },
];

/** Questions answered by a spread of data rather than by one fact. */
const STATISTICAL: string[] = [
  "How tall are the students in my class?",
  "How long do people wait at this bus stop?",
  "What do year 7 students eat for breakfast?",
  "How many pets do families on my street own?",
  "How old are the trees in the park?",
];

/** Questions with a single answer, which is what makes them the other kind. */
const NOT_STATISTICAL: string[] = [
  "How tall am I?",
  "How many days are in June?",
  "What time does the film start?",
  "How many pages does this book have?",
  "How old is my sister?",
];

export const GRADE_6: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.1 Ratio language and notation ──
  "math/grade-6/unit-1/1.1": [
    (r) => {
      const red = r.int(2, 15);
      const blue = r.int(2, 15);
      return fill(
        `A bag has ${red} red counters and ${blue} blue ones. What is the ratio of red to blue, in lowest terms?`,
        ratio(red, blue),
        { hint: "two numbers with a colon" },
      );
    },
    // Part to whole rather than part to part, which is the distinction this
    // subunit exists to make.
    (r) => {
      const forwards = r.int(2, 9);
      const defenders = r.int(2, 9);
      return fill(
        `A team has ${forwards} forwards and ${defenders} defenders. What is the ratio of forwards to the whole team, in lowest terms?`,
        ratio(forwards, forwards + defenders),
        { hint: "two numbers with a colon" },
      );
    },
    (r) => {
      const [novels, comics] = r.pick([
        [2, 3],
        [3, 2],
        [3, 4],
        [4, 3],
        [2, 5],
        [5, 2],
        [3, 5],
        [5, 6],
      ]);
      const times = r.int(2, 8);
      return slider(
        `A shelf has ${novels} novels for every ${comics} comics. Place the number of comics when there are ${novels * times} novels.`,
        { min: 0, max: 60, step: 1, value: comics * times, full: 1, zero: 6 },
      );
    },
  ],

  // ── 1.2 Equivalent ratios and ratio tables ──
  "math/grade-6/unit-1/1.2": [
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 12);
      const times = r.int(2, 6);
      return fill(
        `Complete the ratio table: ${a} : ${b} = ${a * times} : ?`,
        b * times,
        { hint: "a number" },
      );
    },
    (r) => {
      const pens = r.int(2, 8);
      const cost = r.int(2, 9);
      const times = r.int(2, 6);
      return fill(
        `${pens} pens cost $${cost}. At the same rate, what do ${pens * times} pens cost?`,
        cost * times,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 8);
      const b = r.int(2, 8);
      const times = r.int(2, 5);
      return slider(
        `Place the missing number: ${a} : ${b} = ? : ${b * times}`,
        { min: 0, max: 40, step: 1, value: a * times, full: 1, zero: 5 },
      );
    },
  ],

  // ── 1.3 Unit rates ──
  "math/grade-6/unit-1/1.3": [
    (r) => {
      const speed = r.int(20, 95);
      const hours = r.int(2, 6);
      return fill(
        `A car travels ${speed * hours} km in ${hours} hours. What is its speed?`,
        speed,
        { unit: "km per hour", hint: "a number" },
      );
    },
    (r) => {
      const tins = r.int(3, 9);
      const each = dp(r.int(45, 320) / 100);
      return fill(
        `${tins} tins cost $${money(each * tins)}. What does one tin cost?`,
        each,
        { unit: "dollars", hint: "a decimal" },
      );
    },
    (r) => {
      const rate = r.int(4, 30);
      const minutes = r.int(2, 9);
      return slider(
        `A printer prints ${rate * minutes} pages in ${minutes} minutes. Place the number of pages a minute.`,
        { min: 0, max: 40, step: 1, value: rate, full: 1, zero: 5 },
      );
    },
  ],

  // ── 1.4 Comparing unit rates ──
  "math/grade-6/unit-1/1.4": [
    (r) => {
      const prices = [0.4, 0.5, 0.6, 0.75, 0.8, 1.2];
      const first = r.pick(prices);
      const second = r.pick(prices.filter((p) => p !== first));
      const countA = r.int(3, 10);
      const countB = r.int(3, 10);
      return fill(
        `Shop A sells ${countA} apples for $${money(first * countA)} and shop B sells ${countB} for $${money(second * countB)}. Which shop is cheaper per apple? Type A or B.`,
        first < second ? "A" : "B",
        { hint: "A or B" },
      );
    },
    (r) => {
      const firstRate = r.int(2, 12);
      const secondRate = other(r, firstRate, 2, 12);
      const t1 = r.int(2, 6);
      const t2 = r.int(2, 6);
      return fill(
        `One tap fills ${firstRate * t1} litres in ${t1} minutes and another fills ${secondRate * t2} litres in ${t2} minutes. What is the faster rate?`,
        Math.max(firstRate, secondRate),
        { unit: "litres a minute", hint: "a number" },
      );
    },
    (r) => {
      const prices = [0.25, 0.5, 0.75, 1, 1.25, 1.5];
      const first = r.pick(prices);
      const second = r.pick(prices.filter((p) => p !== first));
      const countA = r.int(2, 8);
      const countB = r.int(2, 8);
      return slider(
        `Pack A holds ${countA} bars for $${money(first * countA)} and pack B holds ${countB} bars for $${money(second * countB)}. Place the better price per bar.`,
        {
          min: 0,
          max: 2,
          step: 0.25,
          value: Math.min(first, second),
          unit: "dollars",
          full: 0.25,
          zero: 0.75,
        },
      );
    },
  ],

  // ── 1.5 Graphing ratio relationships ──
  "math/grade-6/unit-1/1.5": [
    (r) => {
      const cups = r.int(2, 3);
      const rice = r.int(1, Math.floor(9 / cups));
      return point(
        `A recipe uses ${cups} cups of water for every cup of rice. Plot the point for ${rice} cups of rice.`,
        { span: 10, x: rice, y: cups * rice },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = other(r, a, 2, 9);
      const times = r.int(2, 6);
      return fill(
        `A ratio table pairs ${a} with ${b}. The graph of it passes through (${a * times}, ?). What is the missing coordinate?`,
        b * times,
        { hint: "a number" },
      );
    },
    (r) => {
      const rate = r.int(2, 12);
      const x = r.int(2, 8);
      return slider(
        `A graph of a ratio passes through (${x}, ${rate * x}). Place the value it gives when x is 1.`,
        { min: 0, max: 12, step: 1, value: rate, full: 1, zero: 3 },
      );
    },
  ],

  // ── 1.6 Converting measurement units with ratios ──
  "math/grade-6/unit-1/1.6": [
    (r) => {
      const kilograms = dp(r.int(11, 99) / 10, 1);
      return fill(
        `Use the ratio 1 kg : 1000 g. How many grams is ${kilograms} kg?`,
        dp(kilograms * 1000, 1),
        { unit: "grams", hint: "a number" },
      );
    },
    (r) => {
      const miles = r.int(2, 40);
      return fill(
        `A trail is ${miles} miles long, and one mile is about 1.6 km. How many kilometres is that?`,
        dp(miles * 1.6, 1),
        { unit: "kilometres", hint: "a decimal" },
      );
    },
    (r) => {
      const cups = r.int(2, 12);
      return slider(
        `One cup is 250 mL. Place the number of cups in ${cups * 250} mL.`,
        { min: 0, max: 12, step: 1, value: cups, full: 1, zero: 3 },
      );
    },
  ],

  // ── 1.7 Percent as a rate per hundred ──
  "math/grade-6/unit-1/1.7": [
    (r) => {
      const percent = 5 * r.int(1, 19);
      return fill(
        `Write ${percent}% as a fraction in lowest terms.`,
        frac(percent, 100),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const squares = r.pick([4, 5, 10, 20, 25, 50]);
      const shaded = r.int(1, squares - 1);
      return fill(
        `${shaded} out of ${squares} squares are shaded. What percentage is shaded?`,
        (shaded * 100) / squares,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const percent = 5 * r.int(1, 19);
      return slider(
        `A bar is ${percent}% shaded. Place the percentage that is not shaded.`,
        { min: 0, max: 100, step: 5, value: 100 - percent, unit: "percent", full: 5, zero: 25 },
      );
    },
  ],

  // ── 1.8 Finding a percent of a number ──
  "math/grade-6/unit-1/1.8": [
    (r) => {
      const percent = 5 * r.int(1, 19);
      const whole = 20 * r.int(1, 15);
      return fill(`What is ${percent}% of ${whole}?`, (percent * whole) / 100, {
        hint: "a number",
      });
    },
    (r) => {
      const percent = 10 * r.int(1, 7);
      const price = 20 * r.int(2, 15);
      return fill(
        `A jacket costs $${price} and is reduced by ${percent}%. How much comes off the price?`,
        (percent * price) / 100,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const percent = 5 * r.int(1, 19);
      const whole = 20 * r.int(1, 10);
      return slider(`Place ${percent}% of ${whole}.`, {
        min: 0,
        max: 200,
        step: 5,
        value: (percent * whole) / 100,
        full: 5,
        zero: 30,
      });
    },
  ],

  // ── 1.9 Finding the whole given a part and a percent ──
  "math/grade-6/unit-1/1.9": [
    (r) => {
      const percent = 5 * r.int(1, 19);
      const whole = 20 * r.int(1, 15);
      return fill(
        `${percent}% of a number is ${(percent * whole) / 100}. What is the number?`,
        whole,
        { hint: "a number" },
      );
    },
    (r) => {
      const percent = 5 * r.int(1, 15);
      const price = 20 * r.int(5, 30);
      return fill(
        `A deposit of $${(percent * price) / 100} is ${percent}% of the price of a bike. What is the full price?`,
        price,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const percent = 10 * r.int(1, 9);
      const group = 10 * r.int(4, 30);
      return slider(
        `${(percent * group) / 100} students are ${percent}% of a year group. Place the size of the year group.`,
        { min: 0, max: 300, step: 10, value: group, unit: "students", full: 10, zero: 60 },
      );
    },
  ],

  // ── 2.1 Dividing a fraction by a fraction ──
  "math/grade-6/unit-2/2.1": [
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const value = asMixed(a.n * b.d, a.d * b.n);
      return fill(
        `Divide these fractions: ${a.n}/${a.d} ÷ ${b.n}/${b.d}`,
        value.show,
        { accept: value.accept, hint: "a fraction or mixed number" },
      );
    },
    // The same division asked as the question it answers, which is the part
    // that makes "invert and multiply" mean anything.
    (r) => {
      const a = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const b = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const value = asMixed(a.n * b.d, a.d * b.n);
      return fill(
        `How many ${b.n}/${b.d} are there in ${a.n}/${a.d}?`,
        value.show,
        { accept: value.accept, hint: "a fraction or mixed number" },
      );
    },
    (r) => {
      const d1 = r.pick([2, 4]);
      const n1 = d1 === 2 ? 1 : r.pick([1, 3]);
      const d2 = r.pick([2, 4]);
      return slider(`Place the quotient ${n1}/${d1} ÷ 1/${d2}.`, {
        min: 0,
        max: 5,
        step: 0.25,
        value: dp((n1 * d2) / d1),
        full: 0.25,
        zero: 1,
      });
    },
  ],

  // ── 2.2 Interpreting fraction division in context ──
  "math/grade-6/unit-2/2.2": [
    (r) => {
      const piece = properFraction(r, [2, 3, 4, 5, 8]);
      const pieces = r.int(3, 12);
      return fill(
        `A ribbon ${asMixed(piece.n * pieces, piece.d).show} m long is cut into pieces ${piece.n}/${piece.d} m long. How many pieces are there?`,
        pieces,
        { unit: "pieces", hint: "a number" },
      );
    },
    (r) => {
      const bag = properFraction(r, [2, 3, 4, 5, 8]);
      const bags = r.int(3, 12);
      return fill(
        `${asMixed(bag.n * bags, bag.d).show} kg of flour fills bags holding ${bag.n}/${bag.d} kg each. How many bags is that?`,
        bags,
        { unit: "bags", hint: "a number" },
      );
    },
    (r) => {
      const stage = properFraction(r, [2, 4, 5]);
      const stages = r.int(3, 16);
      return slider(
        `A path ${asMixed(stage.n * stages, stage.d).show} km long is walked in stages of ${stage.n}/${stage.d} km. Place the number of stages.`,
        { min: 0, max: 20, step: 1, value: stages, full: 1, zero: 4 },
      );
    },
  ],

  // ── 2.3 Multi-digit decimal operations ──
  "math/grade-6/unit-2/2.3": [
    (r) => {
      const a = dp(r.int(200, 4999) / 100);
      const b = dp(r.int(100, 2999) / 100);
      const c = dp(r.int(50, 1999) / 100);
      return fill(`Add and subtract: ${a} + ${b} - ${c}`, dp(a + b - c), {
        hint: "a decimal",
      });
    },
    (r) => {
      const start = dp(r.int(500, 4999) / 100);
      const added = dp(r.int(100, 2999) / 100);
      const drained = dp(r.int(50, 499) / 100);
      return fill(
        `A tank held ${start} litres, then ${added} litres went in and ${drained} litres drained out. How much is in it now?`,
        dp(start + added - drained),
        { unit: "litres", hint: "a decimal" },
      );
    },
    (r) => {
      const quotient = dp(r.int(5, 99) / 10, 1);
      const divisor = r.int(2, 9);
      return slider(
        `Place the value of ${dp(quotient * divisor, 1)} ÷ ${divisor}.`,
        { min: 0, max: 10, step: 0.1, value: quotient, full: 0.1, zero: 1 },
      );
    },
  ],

  // ── 2.4 The standard division algorithm ──
  "math/grade-6/unit-2/2.4": [
    (r) => {
      const quotient = r.int(12, 99);
      const divisor = r.int(12, 40);
      return fill(
        `Work out the quotient: ${quotient * divisor} ÷ ${divisor}`,
        quotient,
        { hint: "a number" },
      );
    },
    (r) => {
      const quotient = r.int(12, 60);
      const divisor = r.int(6, 25);
      return fill(
        `A number divided by ${divisor} gives ${quotient} exactly. What is the number?`,
        quotient * divisor,
        { hint: "a number" },
      );
    },
    (r) => {
      const quotient = r.int(4, 45);
      const divisor = r.int(11, 30);
      return slider(`Place the quotient: ${quotient * divisor} ÷ ${divisor}`, {
        min: 0,
        max: 50,
        step: 1,
        value: quotient,
        full: 1,
        zero: 6,
      });
    },
  ],

  // ── 2.5 GCF and LCM in context ──
  "math/grade-6/unit-2/2.5": [
    (r) => {
      const baskets = r.int(4, 12);
      const first = r.int(2, 7);
      const apples = baskets * first;
      const oranges = baskets * other(r, first, 2, 7);
      return fill(
        `${apples} apples and ${oranges} oranges are packed into identical baskets with none left over. What is the largest number of baskets?`,
        gcd(apples, oranges),
        { unit: "baskets", hint: "a number" },
      );
    },
    (r) => {
      const dogs = r.pick([6, 8, 10, 12]);
      const buns = r.pick([4, 6, 8, 9]);
      return fill(
        `Hot dogs come in packs of ${dogs} and buns in packs of ${buns}. What is the smallest number of hot dogs you can buy with no buns left over?`,
        (dogs * buns) / gcd(dogs, buns),
        { unit: "hot dogs", hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 10);
      const second = other(r, first, 2, 10);
      return slider(
        `Two lights flash every ${first} and ${second} seconds and have just flashed together. Place the seconds until they next flash together.`,
        {
          min: 0,
          max: 120,
          step: 1,
          value: (first * second) / gcd(first, second),
          unit: "seconds",
          full: 1,
          zero: 12,
        },
      );
    },
  ],

  // ── 2.6 The distributive property with the GCF ──
  "math/grade-6/unit-2/2.6": [
    (r) => {
      const factor = r.int(3, 12);
      const first = r.int(2, 9);
      const second = other(r, first, 2, 9);
      return fill(
        `Write ${factor * first} + ${factor * second} as ${factor} × (? + ?). What is the first number in the bracket?`,
        first,
        { hint: "a number" },
      );
    },
    (r) => {
      const factor = r.int(3, 12);
      const first = r.int(2, 9);
      const second = other(r, first, 2, 9);
      return fill(
        `What is the greatest common factor you would take out of ${factor * first} + ${factor * second}?`,
        gcd(factor * first, factor * second),
        { hint: "a number" },
      );
    },
    (r) => {
      const factor = r.int(3, 12);
      const first = r.int(2, 9);
      const second = other(r, first, 2, 9);
      return slider(
        `Place the number that goes outside the bracket: ${factor * first} + ${factor * second} = ? × (${first} + ${second})`,
        { min: 0, max: 20, step: 1, value: factor, full: 1, zero: 4 },
      );
    },
  ],

  // ── 2.7 Fluency across fractions, decimals and percents ──
  "math/grade-6/unit-2/2.7": [
    (r) => {
      const hundredths = r.int(1, 99);
      return fill(`Write ${dp(hundredths / 100)} as a percentage.`, hundredths, {
        unit: "percent",
        hint: "a number",
      });
    },
    (r) => {
      const marks = r.pick([4, 5, 10, 20, 25, 50]);
      const scored = r.int(1, marks - 1);
      return fill(
        `A test score of ${scored}/${marks} is what percentage?`,
        (scored * 100) / marks,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const { n, d } = properFraction(r, [4, 5, 10, 20]);
      return slider(`Place ${n}/${d} on a scale from 0% to 100%.`, {
        min: 0,
        max: 100,
        step: 5,
        value: (n * 100) / d,
        unit: "percent",
        full: 5,
        zero: 25,
      });
    },
  ],

  // ── 3.1 Negative numbers and their meaning ──
  "math/grade-6/unit-3/3.1": [
    (r) => {
      const start = r.int(0, 10);
      const fall = start + r.int(1, 12);
      return fill(
        `A temperature falls ${fall} degrees from ${start}°C. What is the new temperature?`,
        start - fall,
        { unit: "°C", hint: "a number" },
      );
    },
    // Which pair of signs describes the situation is a reading of what the
    // minus means, so it is the one ask here that four options do not solve.
    (r) => {
      const depth = r.int(5, 40);
      const height = other(r, depth, 5, 40);
      return among(
        `A submarine is ${depth} m below sea level and a gull is ${height} m above it. Which pair of numbers describes them?`,
        `-${depth} and ${height}`,
        [
          `-${depth} and ${height}`,
          `${depth} and -${height}`,
          `${depth} and ${height}`,
          `-${depth} and -${height}`,
        ],
        r,
      );
    },
    (r) => {
      const value = -r.int(1, 10);
      return slider(`Place ${value} on a number line from -10 to 10.`, {
        min: -10,
        max: 10,
        step: 1,
        value,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 3.2 The number line extended ──
  "math/grade-6/unit-3/3.2": [
    (r) => {
      const from = r.int(-5, 5);
      const less = r.int(1, 12);
      return slider(`Place the number that is ${less} less than ${from}.`, {
        min: -20,
        max: 20,
        step: 1,
        value: from - less,
        full: 1,
        zero: 4,
      });
    },
    (r) => {
      const a = r.int(-20, -1);
      const b = other(r, a, -20, 20);
      return fill(
        `Which is greater, ${a} or ${b}? Type the greater number.`,
        Math.max(a, b),
        { hint: "one of the two numbers" },
      );
    },
    (r) => {
      const a = r.int(-12, 12);
      const b = other(r, a, -12, 12);
      return fill(
        `How many units apart are ${a} and ${b} on the number line?`,
        Math.abs(a - b),
        { unit: "units", hint: "a number" },
      );
    },
  ],

  // ── 3.3 Opposites and the additive inverse ──
  "math/grade-6/unit-3/3.3": [
    (r) => {
      const n = r.nonzero(-20, 20);
      return fill(`What is the opposite of ${n}?`, -n, { hint: "a number" });
    },
    (r) => {
      const n = r.nonzero(-20, 20);
      return fill(`${n} + ? = 0. What replaces the ?`, -n, { hint: "a number" });
    },
    (r) => {
      const n = r.nonzero(-10, 10);
      return slider(`Place the opposite of ${n} on a number line.`, {
        min: -10,
        max: 10,
        step: 1,
        value: -n,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 3.4 Absolute value ──
  "math/grade-6/unit-3/3.4": [
    (r) => {
      const n = r.nonzero(-20, 20);
      return fill(`What is |${n}|?`, Math.abs(n), { hint: "a number" });
    },
    // Absolute value run backwards, where the sign is the whole question.
    (r) => {
      const size = r.int(1, 20);
      return fill(
        `A number is negative and its absolute value is ${size}. What is the number?`,
        -size,
        { hint: "a number" },
      );
    },
    (r) => {
      const n = r.nonzero(-20, 20);
      return slider(`Place |${n}| on a scale from 0 to 20.`, {
        min: 0,
        max: 20,
        step: 1,
        value: Math.abs(n),
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 3.5 Comparing and ordering rational numbers ──
  "math/grade-6/unit-3/3.5": [
    // Ordering signed numbers written three different ways, which is where
    // "bigger" and "further from zero" come apart.
    (r) =>
      order(
        "Put these numbers in order, smallest first.",
        shuffled(RATIONALS, r)
          .slice(0, 4)
          .sort((a, b) => a.value - b.value)
          .map((n) => n.text),
        r,
      ),
    (r) => {
      const [a, b] = shuffled(RATIONALS, r).slice(0, 2);
      return fill(
        `Which is greater, ${a.text} or ${b.text}? Type the greater number.`,
        a.value > b.value ? a.text : b.text,
        { hint: "one of the two numbers" },
      );
    },
    (r) => {
      const halves = r.int(-10, 10);
      return slider(`Place ${dp(halves / 2, 1)} on a number line from -5 to 5.`, {
        min: -5,
        max: 5,
        step: 0.5,
        value: dp(halves / 2, 1),
        full: 0.5,
        zero: 1.5,
      });
    },
  ],

  // ── 3.6 Absolute value in context ──
  "math/grade-6/unit-3/3.6": [
    (r) => {
      const first = r.int(15, 400);
      const second = other(r, first, 15, 400);
      return fill(
        `Account A is $${first} overdrawn and account B is $${second} overdrawn. Which account has the larger debt? Type A or B.`,
        first > second ? "A" : "B",
        { hint: "A or B" },
      );
    },
    (r) => {
      const depth = r.int(2, 30);
      const height = r.int(2, 30);
      return fill(
        `A diver is at -${depth} m and a gull is at ${height} m. How far apart are they?`,
        depth + height,
        { unit: "metres", hint: "a number" },
      );
    },
    (r) => {
      const owed = r.int(1, 50);
      return slider(
        `A bank balance reads -${owed} dollars. Place how much is owed.`,
        { min: 0, max: 50, step: 1, value: owed, unit: "dollars", full: 1, zero: 8 },
      );
    },
  ],

  // ── 3.7 The four-quadrant coordinate plane ──
  "math/grade-6/unit-3/3.7": [
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      return point(`Plot (${x}, ${y}).`, { span: 10, x, y });
    },
    (r) => {
      const negativeX = r.bool();
      const negativeY = r.bool();
      const quadrant = negativeX ? (negativeY ? 3 : 2) : negativeY ? 4 : 1;
      return fill(
        `A point has a ${negativeX ? "negative" : "positive"} x-coordinate and a ${negativeY ? "negative" : "positive"} y-coordinate. Which quadrant is it in? Type a number from 1 to 4.`,
        quadrant,
        { hint: "1, 2, 3 or 4" },
      );
    },
    (r) => {
      const x = r.int(0, 9);
      const y = r.int(0, 9);
      const left = r.int(1, 9);
      const down = r.int(1, 9);
      return point(
        `Plot the point ${left} units left and ${down} units down from (${x}, ${y}).`,
        { span: 10, x: x - left, y: y - down },
      );
    },
  ],

  // ── 3.8 Reflections across the axes ──
  "math/grade-6/unit-3/3.8": [
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      const acrossX = r.bool();
      return point(
        `Plot the reflection of (${x}, ${y}) across the ${acrossX ? "x" : "y"}-axis.`,
        { span: 10, x: acrossX ? x : -x, y: acrossX ? -y : y },
      );
    },
    (r) => {
      const x = r.nonzero(-9, 9);
      const y = r.nonzero(-9, 9);
      const acrossX = r.bool();
      return fill(
        `Reflecting (${x}, ${y}) across the ${acrossX ? "x" : "y"}-axis gives which ${acrossX ? "y" : "x"}-coordinate?`,
        acrossX ? -y : -x,
        { hint: "a number" },
      );
    },
    // What a reflection does to a pair of coordinates is a statement, not a
    // value, so it is the multiple-choice ask of this subunit.
    (r) =>
      among(
        "A point is reflected across the y-axis. What happens to its coordinates?",
        "The x-coordinate becomes its opposite",
        [
          "The x-coordinate becomes its opposite",
          "The y-coordinate becomes its opposite",
          "Both coordinates become their opposites",
          "Neither coordinate changes",
        ],
        r,
      ),
  ],

  // ── 3.9 Distance between points sharing a coordinate ──
  "math/grade-6/unit-3/3.9": [
    (r) => {
      const y = r.nonzero(-9, 9);
      const x1 = r.int(-9, 3);
      const x2 = x1 + r.int(2, 12);
      return fill(
        `How far apart are (${x1}, ${y}) and (${x2}, ${y})?`,
        x2 - x1,
        { unit: "units", hint: "a number" },
      );
    },
    (r) => {
      const x = r.nonzero(-9, 9);
      const y1 = r.int(-9, 2);
      const y2 = y1 + r.int(2, 12);
      return fill(
        `Two towns sit at (${x}, ${y1}) and (${x}, ${y2}) on a grid map marked in kilometres. How far apart are they?`,
        y2 - y1,
        { unit: "kilometres", hint: "a number" },
      );
    },
    (r) => {
      const x = r.nonzero(-9, 9);
      const gap = r.int(2, 9);
      const y = r.int(gap - 9, 9);
      return point(
        `The point (${x}, ${y}) sits ${gap} units above another point on the same vertical line. Plot that other point.`,
        { span: 10, x, y: y - gap },
      );
    },
  ],

  // ── 4.1 Exponents and repeated multiplication ──
  "math/grade-6/unit-4/4.1": [
    (r) => {
      const base = r.int(2, 9);
      const times = r.int(2, 5);
      return fill(
        `Write ${Array.from({ length: times }, () => base).join(" × ")} as a power.`,
        `${base}^${times}`,
        { hint: "a base and an exponent" },
      );
    },
    (r) => {
      const base = r.int(2, 9);
      const exponent = base > 4 ? r.int(2, 3) : r.int(2, 4);
      return fill(`Evaluate ${base}^${exponent}.`, base ** exponent, {
        hint: "a number",
      });
    },
    (r) => {
      const base = r.int(2, 6);
      const exponent = base > 3 ? 2 : r.int(2, 3);
      return slider(`Place the value of ${base}^${exponent}.`, {
        min: 0,
        max: 40,
        step: 1,
        value: base ** exponent,
        full: 1,
        zero: 6,
      });
    },
  ],

  // ── 4.2 Order of operations with exponents ──
  "math/grade-6/unit-4/4.2": [
    (r) => {
      const a = r.int(2, 20);
      const b = r.int(2, 9);
      const c = r.int(2, 5);
      return fill(
        `Work out the value: ${a} + ${b} × ${c}^2`,
        a + b * c ** 2,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const missing = r.int(2, 9);
      return fill(
        `Insert the missing number: (${a} + ?)^2 = ${(a + missing) ** 2}`,
        missing,
        { hint: "a number" },
      );
    },
    (r) => {
      const b = r.int(2, 6);
      const c = r.int(2, 6);
      const a = r.int(Math.ceil(Math.sqrt(b * c)), 10);
      return slider(`Place the value of ${a}^2 - ${b} × ${c}.`, {
        min: 0,
        max: 100,
        step: 1,
        value: a ** 2 - b * c,
        full: 1,
        zero: 10,
      });
    },
  ],

  // ── 4.3 Writing algebraic expressions ──
  "math/grade-6/unit-4/4.3": [
    (r) => {
      const times = r.int(2, 9);
      const add = r.int(2, 20);
      const n = r.int(2, 12);
      return fill(
        `A number n is multiplied by ${times} and then ${add} is added. If n = ${n}, what is the result?`,
        times * n + add,
        { hint: "a number" },
      );
    },
    // Which expression says it is a question about form, and the wrong ones
    // are the two orderings a student actually mixes up.
    (r) => {
      const times = r.int(2, 9);
      const less = r.int(2, 12);
      return among(
        `Which expression means "${less} less than ${times} times n"?`,
        `${times}n - ${less}`,
        [
          `${times}n - ${less}`,
          `${less} - ${times}n`,
          `${times}(n - ${less})`,
          `${times}n + ${less}`,
        ],
        r,
      );
    },
    (r) => {
      const tickets = r.int(2, 8);
      const fee = r.int(2, 15);
      const price = r.int(5, 30);
      return fill(
        `Tickets cost n dollars each. What do ${tickets} tickets plus a $${fee} booking fee come to when n = ${price}?`,
        tickets * price + fee,
        { unit: "dollars", hint: "a number" },
      );
    },
  ],

  // ── 4.4 Identifying parts of an expression ──
  "math/grade-6/unit-4/4.4": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const c = r.int(2, 20);
      const terms = r.int(2, 3);
      const text =
        terms === 2
          ? `${head(a, "x")}${signed(c)}`
          : `${head(a, "x")}${signed(b, "y")}${signed(c)}`;
      return fill(`How many terms does ${text} have?`, terms, {
        hint: "a number",
      });
    },
    (r) => {
      const a = r.int(2, 12);
      const b = other(r, a, 2, 12);
      const c = r.int(2, 20);
      const wantX = r.bool();
      return fill(
        `What is the coefficient of ${wantX ? "x" : "y"} in ${head(a, "x")}${signed(b, "y")}${signed(c)}?`,
        wantX ? a : b,
        { hint: "a number" },
      );
    },
    // Naming a part of an expression is exactly what four options are for.
    (r) => {
      const a = r.int(2, 12);
      const c = r.int(2, 20);
      return among(
        `In ${head(a, "x")}${signed(c)}, what is ${c} called?`,
        "The constant",
        ["The constant", "The coefficient", "The variable", "The exponent"],
        r,
      );
    },
  ],

  // ── 4.5 Evaluating expressions by substitution ──
  "math/grade-6/unit-4/4.5": [
    (r) => {
      const x = r.int(2, 12);
      const y = r.int(2, 12);
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      return fill(
        `If x = ${x} and y = ${y}, what is ${a}x + ${b}y?`,
        a * x + b * y,
        { hint: "a number" },
      );
    },
    (r) => {
      const n = r.int(3, 12);
      const b = r.int(2, 20);
      return fill(`If n = ${n}, what is n^2 - ${b}?`, n ** 2 - b, {
        hint: "a number",
      });
    },
    (r) => {
      const x = r.int(2, 10);
      const a = r.int(2, 9);
      const b = r.int(1, Math.max(1, a * 2 - 1));
      return slider(`Place the value of ${a}x - ${b} when x = ${x}.`, {
        min: 0,
        max: 100,
        step: 1,
        value: a * x - b,
        full: 1,
        zero: 10,
      });
    },
  ],

  // ── 4.6 The distributive property ──
  "math/grade-6/unit-4/4.6": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      return fill(
        `Expand this bracket: ${a}(x + ${b})`,
        `${head(a, "x")}${signed(a * b)}`,
        { hint: "a term in x and a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      return fill(`Factor this expression: ${head(a, "x")}${signed(a * b)}`, `${a}(x + ${b})`, {
        hint: "a number times a bracket",
      });
    },
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 12);
      return slider(
        `Place the number that multiplies the bracket: ${head(a, "x")}${signed(a * b)} = ? × (x + ${b})`,
        { min: 0, max: 15, step: 1, value: a, full: 1, zero: 4 },
      );
    },
  ],

  // ── 4.7 Combining like terms ──
  "math/grade-6/unit-4/4.7": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const c = r.int(2, 9);
      return fill(
        `Simplify by combining like terms: ${head(a, "x")}${signed(b, "y")}${signed(c, "x")}`,
        `${head(a + c, "x")}${signed(b, "y")}`,
        { hint: "two terms" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const c = r.int(2, 9);
      return fill(
        `What is the coefficient of x once ${head(a, "x")}${signed(b, "y")}${signed(c, "x")} is simplified?`,
        a + c,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(3, 9);
      const b = r.int(2, 9);
      const c = r.int(2, a + b - 1);
      return slider(
        `Place the coefficient of x when ${head(a, "x")}${signed(b, "x")}${signed(-c, "x")} is simplified.`,
        { min: 0, max: 20, step: 1, value: a + b - c, full: 1, zero: 4 },
      );
    },
  ],

  // ── 4.8 Equivalent expressions ──
  "math/grade-6/unit-4/4.8": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      const right = r.bool();
      return fill(
        `Are ${a}(x + ${b}) and ${head(a, "x")}${signed(right ? a * b : b)} equivalent? Type yes or no.`,
        right ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      return fill(
        `${a}(x + ${b}) equals ${head(a, "x")} + ?. What replaces the ?`,
        a * b,
        { hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 12);
      return among(
        `Which expression is equivalent to ${a}(x + ${b})?`,
        `${head(a, "x")}${signed(a * b)}`,
        [
          `${head(a, "x")}${signed(a * b)}`,
          `${head(a, "x")}${signed(b)}`,
          `x${signed(a * b)}`,
          `${head(a, "x")}${signed(-a * b)}`,
        ],
        r,
      );
    },
  ],

  // ── 4.9 Formulas and evaluation ──
  "math/grade-6/unit-4/4.9": [
    (r) => {
      const base = 2 * r.int(2, 12);
      const height = r.int(3, 20);
      return fill(
        `The area of a triangle is A = bh/2. If b = ${base} and h = ${height}, what is A?`,
        (base * height) / 2,
        { hint: "a number" },
      );
    },
    (r) => {
      const length = r.int(3, 20);
      const width = other(r, length, 2, 20);
      return fill(
        `The perimeter of a rectangle is P = 2(l + w). If P = ${2 * (length + width)} and l = ${length}, what is w?`,
        width,
        { hint: "a number" },
      );
    },
    (r) => {
      const rate = 5 * r.int(2, 16);
      const hours = r.int(2, Math.max(2, Math.floor(200 / rate)));
      return slider(
        `Distance is d = rt. Place d when r = ${rate} km an hour and t = ${hours} hours.`,
        {
          min: 0,
          max: 200,
          step: 5,
          value: rate * hours,
          unit: "kilometres",
          full: 5,
          zero: 30,
        },
      );
    },
  ],

  // ── 5.1 What it means to solve an equation ──
  "math/grade-6/unit-5/5.1": [
    (r) => {
      const a = r.int(2, 9);
      const x = r.int(2, 12);
      const holds = r.bool();
      return fill(
        `Is x = ${x} a solution of ${a}x = ${holds ? a * x : a * x + r.int(1, 9)}? Type yes or no.`,
        holds ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const a = r.int(2, 12);
      const x = r.int(2, 12);
      return fill(`Which value of x makes ${a}x = ${a * x} true?`, x, {
        hint: "a number",
      });
    },
    (r) => {
      const b = r.int(2, 15);
      const x = r.int(1, 15);
      return slider(
        `Place the value of x that makes x + ${b} = ${b + x} true.`,
        { min: 0, max: 20, step: 1, value: x, full: 1, zero: 4 },
      );
    },
  ],

  // ── 5.2 One-step addition and subtraction equations ──
  "math/grade-6/unit-5/5.2": [
    (r) => {
      const b = r.int(2, 25);
      const x = r.int(2, 30);
      return fill(`Solve for x: x + ${b} = ${b + x}`, x, { hint: "a number" });
    },
    (r) => {
      const added = r.int(3, 20);
      const before = r.int(5, 60);
      return fill(
        `A shelf holds ${before + added} books after ${added} more were put on it. How many were there before?`,
        before,
        { unit: "books", hint: "a number" },
      );
    },
    (r) => {
      const b = r.int(2, 15);
      const result = r.int(1, 15);
      return slider(`Solve x - ${b} = ${result} and place x.`, {
        min: 0,
        max: 30,
        step: 1,
        value: b + result,
        full: 1,
        zero: 5,
      });
    },
  ],

  // ── 5.3 One-step multiplication and division equations ──
  "math/grade-6/unit-5/5.3": [
    (r) => {
      const a = r.int(2, 12);
      const x = r.int(2, 15);
      return fill(`Solve for x: ${a}x = ${a * x}`, x, { hint: "a number" });
    },
    (r) => {
      const friends = r.int(3, 9);
      const each = r.int(4, 40);
      return fill(
        `${friends} friends share a prize equally and each one gets $${each}. What was the prize?`,
        friends * each,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 6);
      const solution = r.int(2, 8);
      return slider(`Solve x/${a} = ${solution} and place x.`, {
        min: 0,
        max: 48,
        step: 1,
        value: a * solution,
        full: 1,
        zero: 6,
      });
    },
  ],

  // ── 5.4 Writing equations from word problems ──
  "math/grade-6/unit-5/5.4": [
    (r) => {
      const base = r.int(2, 8);
      const rate = r.int(2, 6);
      const miles = r.int(2, 15);
      return fill(
        `A taxi charges $${base} plus $${rate} a mile, and a trip cost $${base + rate * miles}. How many miles was it?`,
        miles,
        { unit: "miles", hint: "a number" },
      );
    },
    // Which equation says it: a question about how the sentence turns into
    // symbols, which is the whole of this subunit and is genuinely a choice
    // between forms.
    (r) => {
      const times = r.int(2, 9);
      const plus = r.int(2, 15);
      const result = r.int(20, 90);
      return among(
        `Which equation says "${times} times a number plus ${plus} is ${result}"?`,
        `${times}n + ${plus} = ${result}`,
        [
          `${times}n + ${plus} = ${result}`,
          `${times}(n + ${plus}) = ${result}`,
          `${times}n = ${plus} + ${result}`,
          `n + ${times} + ${plus} = ${result}`,
        ],
        r,
      );
    },
    (r) => {
      const join = r.int(10, 40);
      const monthly = r.int(5, 25);
      const months = r.int(2, 12);
      return slider(
        `A gym costs $${join} to join plus $${monthly} a month, and you have paid $${join + monthly * months}. Place the number of months.`,
        { min: 0, max: 15, step: 1, value: months, unit: "months", full: 1, zero: 4 },
      );
    },
  ],

  // ── 5.5 Inequalities and their meaning ──
  "math/grade-6/unit-5/5.5": [
    (r) => {
      const boundary = r.int(2, 20);
      const value = r.int(1, 30);
      return fill(
        `Is ${value} a solution of x > ${boundary}? Type yes or no.`,
        value > boundary ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const boundary = r.int(2, 30);
      return fill(
        `What is the smallest whole number that satisfies x > ${boundary}?`,
        boundary + 1,
        { hint: "a number" },
      );
    },
    // The words an inequality sign stands for are a statement, not a value.
    (r) => {
      const boundary = r.int(2, 30);
      const sign = r.pick([
        { symbol: "≥", words: `At least ${boundary}` },
        { symbol: ">", words: `More than ${boundary}` },
        { symbol: "≤", words: `At most ${boundary}` },
        { symbol: "<", words: `Fewer than ${boundary}` },
      ]);
      return among(
        `Which phrase matches x ${sign.symbol} ${boundary}?`,
        sign.words,
        [
          `At least ${boundary}`,
          `More than ${boundary}`,
          `At most ${boundary}`,
          `Fewer than ${boundary}`,
        ],
        r,
      );
    },
  ],

  // ── 5.6 Graphing inequalities on a number line ──
  "math/grade-6/unit-5/5.6": [
    (r) => {
      const boundary = r.int(-9, 9);
      return slider(
        `Place the boundary point of the graph of x < ${boundary}.`,
        { min: -10, max: 10, step: 1, value: boundary, full: 1, zero: 3 },
      );
    },
    (r) => {
      const boundary = r.int(-9, 9);
      const closed = r.bool();
      return fill(
        `Is the circle at ${boundary} open or closed on the graph of x ${closed ? "≤" : "<"} ${boundary}? Type open or closed.`,
        closed ? "closed" : "open",
        { hint: "open or closed" },
      );
    },
    (r) => {
      const boundary = r.int(-9, 9);
      const greater = r.bool();
      return fill(
        `The graph of x ${greater ? ">" : "<"} ${boundary} is shaded in which direction? Type left or right.`,
        greater ? "right" : "left",
        { hint: "left or right" },
      );
    },
  ],

  // ── 5.7 Dependent and independent variables ──
  "math/grade-6/unit-5/5.7": [
    (r) => {
      const litres = r.int(2, 12);
      return fill(
        `A car uses ${litres} litres of fuel an hour. Which is the dependent variable, litres or hours? Type litres or hours.`,
        "litres",
        { hint: "litres or hours" },
      );
    },
    (r) => {
      const rate = r.int(2, 20);
      const time = r.int(2, 12);
      return fill(`In d = ${rate}t, what is d when t = ${time}?`, rate * time, {
        hint: "a number",
      });
    },
    (r) => {
      const rate = r.int(2, 9);
      const minutes = r.int(2, 10);
      return slider(
        `A tap fills ${rate} litres a minute. Place the litres in the tank after ${minutes} minutes.`,
        {
          min: 0,
          max: 90,
          step: 1,
          value: rate * minutes,
          unit: "litres",
          full: 1,
          zero: 10,
        },
      );
    },
  ],

  // ── 5.8 Tables, graphs and equations of relationships ──
  "math/grade-6/unit-5/5.8": [
    (r) => {
      const rate = r.int(2, 9);
      const at = r.int(4, 12);
      return fill(
        `A table pairs x = 1 with y = ${rate}, x = 2 with y = ${2 * rate} and x = 3 with y = ${3 * rate}. What is y when x = ${at}?`,
        rate * at,
        { hint: "a number" },
      );
    },
    (r) => {
      const rate = r.int(2, 4);
      const x = r.int(1, Math.floor(9 / rate));
      return point(
        `The relationship y = ${rate}x is graphed. Plot the point where x = ${x}.`,
        { span: 10, x, y: rate * x },
      );
    },
    (r) => {
      const rate = r.int(2, 8);
      const x = r.int(2, 9);
      return slider(
        `A graph of y = ${rate}x passes through (${x}, ?). Place the missing value.`,
        { min: 0, max: 80, step: 1, value: rate * x, full: 1, zero: 8 },
      );
    },
  ],

  // ── 6.1 Area of parallelograms ──
  "math/grade-6/unit-6/6.1": [
    (r) => {
      const base = r.int(3, 20);
      const height = r.int(2, 15);
      return fill(
        `A parallelogram has a base of ${base} cm and a height of ${height} cm. What is its area?`,
        base * height,
        { unit: "square centimetres", hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(3, 20);
      const height = r.int(2, 15);
      return fill(
        `A parallelogram has an area of ${base * height} cm² and a base of ${base} cm. What is its height?`,
        height,
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const base = r.int(3, 15);
      const height = r.int(2, 10);
      return slider(
        `Place the area of a parallelogram with a base of ${base} cm and a height of ${height} cm.`,
        {
          min: 0,
          max: 150,
          step: 1,
          value: base * height,
          unit: "square centimetres",
          full: 1,
          zero: 15,
        },
      );
    },
  ],

  // ── 6.2 Area of triangles ──
  "math/grade-6/unit-6/6.2": [
    (r) => {
      const base = 2 * r.int(2, 10);
      const height = r.int(2, 15);
      return fill(
        `A triangle has a base of ${base} cm and a height of ${height} cm. What is its area?`,
        (base * height) / 2,
        { unit: "square centimetres", hint: "a number" },
      );
    },
    (r) => {
      const base = 2 * r.int(2, 10);
      const height = r.int(2, 15);
      return fill(
        `A triangle has an area of ${(base * height) / 2} cm² and a base of ${base} cm. What is its height?`,
        height,
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const base = 2 * r.int(2, 8);
      const height = r.int(2, 12);
      return slider(
        `A sail is a triangle with a base of ${base} m and a height of ${height} m. Place its area.`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: (base * height) / 2,
          unit: "square metres",
          full: 1,
          zero: 10,
        },
      );
    },
  ],

  // ── 6.3 Area of trapezoids ──
  "math/grade-6/unit-6/6.3": [
    (r) => {
      const first = r.int(2, 14);
      const second = first + 2 * r.int(1, 5);
      const height = r.int(2, 12);
      return fill(
        `A trapezoid has parallel sides of ${first} cm and ${second} cm and a height of ${height} cm. What is its area?`,
        ((first + second) / 2) * height,
        { unit: "square centimetres", hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 14);
      const second = first + 2 * r.int(1, 5);
      const height = r.int(2, 12);
      return fill(
        `A trapezoid has an area of ${((first + second) / 2) * height} cm², a height of ${height} cm and one parallel side of ${first} cm. What is the other parallel side?`,
        second,
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 10);
      const second = first + 2 * r.int(1, 4);
      const height = r.int(2, 8);
      return slider(
        `Place the area of a trapezoid with parallel sides of ${first} m and ${second} m and a height of ${height} m.`,
        {
          min: 0,
          max: 120,
          step: 1,
          value: ((first + second) / 2) * height,
          unit: "square metres",
          full: 1,
          zero: 12,
        },
      );
    },
  ],

  // ── 6.4 Area of composite figures ──
  "math/grade-6/unit-6/6.4": [
    (r) => {
      const long = r.int(6, 20);
      const wide = r.int(4, 15);
      const cutLong = r.int(2, long - 2);
      const cutWide = r.int(2, wide - 2);
      return fill(
        `A shape is a ${long} by ${wide} rectangle with a ${cutLong} by ${cutWide} rectangle removed. What is its area?`,
        long * wide - cutLong * cutWide,
        { unit: "square units", hint: "a number" },
      );
    },
    (r) => {
      const long = 2 * r.int(2, 9);
      const wide = r.int(3, 12);
      const height = r.int(2, 10);
      return fill(
        `A figure is a ${long} by ${wide} rectangle with a triangle of base ${long} and height ${height} on top. What is its area?`,
        long * wide + (long * height) / 2,
        { unit: "square units", hint: "a number" },
      );
    },
    (r) => {
      const long = r.int(3, 10);
      const wide = r.int(3, 10);
      const extraLong = r.int(2, 8);
      const extraWide = r.int(2, 8);
      return slider(
        `A room is a ${long} by ${wide} rectangle joined to a ${extraLong} by ${extraWide} rectangle. Place its floor area.`,
        {
          min: 0,
          max: 200,
          step: 1,
          value: long * wide + extraLong * extraWide,
          unit: "square metres",
          full: 1,
          zero: 20,
        },
      );
    },
  ],

  // ── 6.5 Polygons on the coordinate plane ──
  "math/grade-6/unit-6/6.5": [
    (r) => {
      const x1 = r.int(-8, 2);
      const x2 = x1 + r.int(2, 8);
      const y1 = r.int(-8, 2);
      const y2 = y1 + r.int(2, 8);
      return fill(
        `A rectangle has corners (${x1}, ${y1}), (${x2}, ${y1}), (${x2}, ${y2}) and (${x1}, ${y2}). What is its area?`,
        (x2 - x1) * (y2 - y1),
        { unit: "square units", hint: "a number" },
      );
    },
    (r) => {
      const x1 = r.int(-8, 2);
      const x2 = x1 + r.int(2, 8);
      const y1 = r.int(-8, 2);
      const y2 = y1 + r.int(2, 8);
      return point(
        `Three corners of a rectangle are (${x1}, ${y1}), (${x2}, ${y1}) and (${x2}, ${y2}). Plot the fourth.`,
        { span: 10, x: x1, y: y2 },
      );
    },
    (r) => {
      const x1 = r.int(-8, 2);
      const x2 = x1 + r.int(2, 8);
      const y1 = r.int(-8, 2);
      const y2 = y1 + r.int(2, 8);
      return slider(
        `Place the perimeter of the rectangle with corners (${x1}, ${y1}), (${x2}, ${y1}), (${x2}, ${y2}) and (${x1}, ${y2}).`,
        {
          min: 0,
          max: 40,
          step: 1,
          value: 2 * (x2 - x1 + y2 - y1),
          unit: "units",
          full: 1,
          zero: 5,
        },
      );
    },
  ],

  // ── 6.6 Nets of three-dimensional figures ──
  "math/grade-6/unit-6/6.6": [
    // Which solid a net folds into is a naming question, and the only one
    // here that four options do not answer for you.
    (r) => {
      const solid = r.pick(SOLIDS);
      return among(
        `Which solid has a net of ${solid.net}?`,
        solid.name,
        SOLIDS.map((s) => s.name),
        r,
      );
    },
    (r) => {
      const solid = r.pick(SOLIDS);
      return fill(`How many faces does a ${solid.name} have?`, solid.faces, {
        unit: "faces",
        hint: "a number",
      });
    },
    (r) => {
      const sides = r.int(3, 8);
      return slider(
        `Place the number of faces in the net of a prism whose base has ${sides} sides.`,
        { min: 0, max: 12, step: 1, value: sides + 2, unit: "faces", full: 1, zero: 3 },
      );
    },
  ],

  // ── 6.7 Surface area from nets ──
  "math/grade-6/unit-6/6.7": [
    (r) => {
      const long = r.int(2, 12);
      const wide = r.int(2, 10);
      const high = r.int(2, 9);
      return fill(
        `A box is ${long} cm by ${wide} cm by ${high} cm. What is its surface area?`,
        2 * (long * wide + long * high + wide * high),
        { unit: "square centimetres", hint: "a number" },
      );
    },
    (r) => {
      const edge = r.int(2, 9);
      return fill(
        `A cube has a surface area of ${6 * edge ** 2} cm². How long is one edge?`,
        edge,
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const edge = r.int(2, 6);
      return slider(
        `Place the surface area of a cube with edges of ${edge} cm.`,
        {
          min: 0,
          max: 250,
          step: 1,
          value: 6 * edge ** 2,
          unit: "square centimetres",
          full: 1,
          zero: 25,
        },
      );
    },
  ],

  // ── 6.8 Volume with fractional edge lengths ──
  "math/grade-6/unit-6/6.8": [
    (r) => {
      const halves = 2 * r.int(1, 7) + 1;
      const wide = r.int(2, 8);
      const high = r.int(2, 6);
      const volume = asMixed(halves * wide * high, 2);
      return fill(
        `A box is ${asMixed(halves, 2).show} cm by ${wide} cm by ${high} cm. What is its volume?`,
        volume.show,
        { accept: volume.accept, unit: "cubic centimetres", hint: "a mixed number" },
      );
    },
    (r) => {
      const halves = 2 * r.int(1, 7) + 1;
      const long = r.int(2, 8);
      const wide = r.int(2, 6);
      const height = asMixed(halves, 2);
      return fill(
        `A box has a volume of ${asMixed(halves * long * wide, 2).show} cm³ and a base ${long} cm by ${wide} cm. How tall is it?`,
        height.show,
        { accept: height.accept, unit: "centimetres", hint: "a mixed number" },
      );
    },
    (r) => {
      const halves = 2 * r.int(1, 5) + 1;
      const wide = r.int(2, 6);
      const high = r.int(2, 5);
      return slider(
        `Place the volume of a box ${asMixed(halves, 2).show} cm by ${wide} cm by ${high} cm.`,
        {
          min: 0,
          max: 180,
          step: 0.5,
          value: dp((halves / 2) * wide * high, 1),
          unit: "cubic centimetres",
          full: 0.5,
          zero: 18,
        },
      );
    },
  ],

  // ── 7.1 Statistical versus non-statistical questions ──
  "math/grade-6/unit-7/7.1": [
    // Telling the two apart is a classification, so it is asked as one.
    (r) =>
      ask(
        "Which of these is a statistical question?",
        r.pick(STATISTICAL),
        shuffled(NOT_STATISTICAL, r).slice(0, 3),
        r,
      ),
    (r) => {
      const statistical = r.bool();
      const question = r.pick(statistical ? STATISTICAL : NOT_STATISTICAL);
      return fill(
        `Is "${question}" a statistical question? Type yes or no.`,
        statistical ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const shown = shuffled(
        [
          ...shuffled(STATISTICAL, r).slice(0, 2),
          ...shuffled(NOT_STATISTICAL, r).slice(0, 2),
        ],
        r,
      ).slice(0, 3);
      return fill(
        `How many of these are statistical questions? ${shown.join(" ")}`,
        shown.filter((q) => STATISTICAL.includes(q)).length,
        { hint: "a number from 0 to 3" },
      );
    },
  ],

  // ── 7.2 Dot plots and histograms ──
  "math/grade-6/unit-7/7.2": [
    (r) => {
      const values = Array.from({ length: r.int(5, 9) }, () => r.int(1, 9));
      return fill(
        `A dot plot shows ${values.join(", ")}. How many values are there?`,
        values.length,
        { hint: "a number" },
      );
    },
    (r) => {
      const bars = Array.from({ length: 4 }, () => r.int(2, 15));
      return fill(
        `A histogram has bars of height ${bars.join(", ")}. How many values are in the whole data set?`,
        total(bars),
        { hint: "a number" },
      );
    },
    // The mode, which is the one summary a dot plot shows by its shape.
    (r) => {
      const common = r.int(1, 9);
      const values = shuffled(
        [common, common, common, other(r, common, 1, 9), other(r, common, 1, 9)],
        r,
      );
      return slider(
        `A dot plot shows ${values.join(", ")}. Place the value that appears most often.`,
        { min: 0, max: 10, step: 1, value: common, full: 1, zero: 3 },
      );
    },
  ],

  // ── 7.3 Measures of center ──
  "math/grade-6/unit-7/7.3": [
    (r) => {
      const values = meanList(r, 5, 2, 20);
      return fill(
        `What is the mean of ${values.join(", ")}?`,
        total(values) / values.length,
        { hint: "a number" },
      );
    },
    (r) => {
      const values = Array.from({ length: 5 }, () => r.int(2, 30));
      return fill(`What is the median of ${values.join(", ")}?`, median(values), {
        hint: "a number",
      });
    },
    (r) => {
      const values = meanList(r, 4, 2, 20);
      return slider(`Place the mean of ${values.join(", ")}.`, {
        min: 0,
        max: 20,
        step: 1,
        value: total(values) / values.length,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 7.4 The mean as a balance point ──
  "math/grade-6/unit-7/7.4": [
    (r) => {
      const values = meanList(r, 4, 3, 25);
      const mean = total(values) / values.length;
      return fill(
        `Four numbers have a mean of ${mean}. Three of them are ${values[0]}, ${values[1]} and ${values[2]}. What is the fourth?`,
        values[3],
        { hint: "a number" },
      );
    },
    (r) => {
      const values = meanList(r, 4, 3, 25);
      const mean = total(values) / values.length;
      const shift = r.int(1, 5);
      return fill(
        `The mean of ${values.join(", ")} is ${mean}. One more value is added and the mean becomes ${mean + shift}. What was added?`,
        mean + shift * (values.length + 1),
        { hint: "a number" },
      );
    },
    (r) => {
      const count = r.int(3, 8);
      const mean = r.int(2, 12);
      return slider(
        `A set of ${count} numbers has a mean of ${mean}. Place the total of all of them.`,
        { min: 0, max: 100, step: 1, value: count * mean, full: 1, zero: 10 },
      );
    },
  ],

  // ── 7.5 Range and interquartile range ──
  "math/grade-6/unit-7/7.5": [
    (r) => {
      const values = Array.from({ length: 6 }, () => r.int(2, 40));
      return fill(
        `What is the range of ${values.join(", ")}?`,
        Math.max(...values) - Math.min(...values),
        { hint: "a number" },
      );
    },
    // Seven values, so both quartiles land on a value rather than between two.
    (r) => {
      const values = Array.from({ length: 7 }, () => r.int(2, 40));
      const five = summary(values);
      return fill(
        `What is the interquartile range of ${values.join(", ")}?`,
        five.q3 - five.q1,
        { hint: "a number" },
      );
    },
    (r) => {
      const low = r.int(2, 20);
      const values = shuffled(
        [low, low + r.int(1, 10), low + r.int(11, 30), low + r.int(1, 10)],
        r,
      );
      return slider(`Place the range of ${values.join(", ")}.`, {
        min: 0,
        max: 40,
        step: 1,
        value: Math.max(...values) - Math.min(...values),
        full: 1,
        zero: 6,
      });
    },
  ],

  // ── 7.6 Mean absolute deviation ──
  "math/grade-6/unit-7/7.6": [
    (r) => {
      const mean = r.int(10, 40);
      const first = r.int(1, 8);
      const second = first + 2 * r.int(1, 4);
      const values = shuffled(
        [mean - first, mean + first, mean - second, mean + second],
        r,
      );
      return fill(
        `What is the mean absolute deviation of ${values.join(", ")}?`,
        (first + second) / 2,
        { hint: "a number" },
      );
    },
    (r) => {
      const mean = r.int(10, 40);
      const first = r.int(1, 8);
      const second = first + 2 * r.int(1, 4);
      const values = shuffled(
        [mean - first, mean + first, mean - second, mean + second],
        r,
      );
      return fill(
        `The mean of ${values.join(", ")} is ${mean}. What is the total distance of the values from the mean?`,
        2 * (first + second),
        { hint: "a number" },
      );
    },
    (r) => {
      const mean = r.int(10, 30);
      const first = r.int(1, 6);
      const second = first + 2 * r.int(1, 3);
      const values = shuffled(
        [mean - first, mean + first, mean - second, mean + second],
        r,
      );
      return slider(
        `Place the mean absolute deviation of ${values.join(", ")}.`,
        { min: 0, max: 20, step: 1, value: (first + second) / 2, full: 1, zero: 4 },
      );
    },
  ],

  // ── 7.7 Box plots ──
  "math/grade-6/unit-7/7.7": [
    (r) => {
      const min = r.int(1, 20);
      const q1 = min + r.int(2, 10);
      const middle = q1 + r.int(2, 10);
      const q3 = middle + r.int(2, 10);
      const max = q3 + r.int(2, 10);
      return fill(
        `A box plot has a minimum of ${min}, Q1 at ${q1}, a median of ${middle}, Q3 at ${q3} and a maximum of ${max}. What is the interquartile range?`,
        q3 - q1,
        { hint: "a number" },
      );
    },
    (r) => {
      const min = r.int(1, 20);
      const q1 = min + r.int(2, 10);
      const middle = q1 + r.int(2, 10);
      const q3 = middle + r.int(2, 10);
      const max = q3 + r.int(2, 10);
      return fill(
        `The five-number summary of a data set is ${min}, ${q1}, ${middle}, ${q3}, ${max}. What is the range?`,
        max - min,
        { hint: "a number" },
      );
    },
    (r) => {
      const min = r.int(1, 15);
      const q1 = min + r.int(2, 8);
      const q3 = q1 + r.int(2, 15);
      const max = q3 + r.int(2, 8);
      return slider(
        `A box plot runs from ${min} to ${max}, with Q1 at ${q1} and Q3 at ${q3}. Place the width of the box.`,
        { min: 0, max: 20, step: 1, value: q3 - q1, full: 1, zero: 4 },
      );
    },
  ],

  // ── 7.8 Choosing an appropriate measure ──
  "math/grade-6/unit-7/7.8": [
    // Which measure stands up to an outlier is a statement about the measures
    // themselves, so it belongs on four options.
    (r) =>
      among(
        "A data set has one value far above all the others. Which measure of centre stands up to it better?",
        "The median",
        ["The median", "The mean", "The range", "The mean absolute deviation"],
        r,
      ),
    (r) => {
      const values = meanList(r, 5, 60, 90);
      const high = r.bool();
      const outlier = high
        ? Math.max(...values) + r.int(40, 90)
        : Math.min(...values) - r.int(40, 55);
      return fill(
        `The values are ${[...values, outlier].join(", ")}, and one of them is far from the rest. Which is larger, the mean or the median? Type mean or median.`,
        high ? "mean" : "median",
        { hint: "mean or median" },
      );
    },
    (r) => {
      const values = meanList(r, 5, 5, 25);
      const mean = total(values) / values.length;
      const shift = r.int(2, 8);
      const outlier = mean + shift * (values.length + 1);
      return fill(
        `Taking the outlier ${outlier} out of ${[...values, outlier].join(", ")} changes the mean by how much?`,
        shift,
        { hint: "a number" },
      );
    },
  ],

  // ── 7.9 Describing a distribution in context ──
  "math/grade-6/unit-7/7.9": [
    (r) => {
      const ages = Array.from({ length: 6 }, () => r.int(7, 16));
      return fill(
        `Ages in a club are ${ages.join(", ")}. What is the range?`,
        Math.max(...ages) - Math.min(...ages),
        { unit: "years", hint: "a number" },
      );
    },
    (r) => {
      const values = Array.from({ length: 5 }, () => r.int(30, 60));
      const right = r.bool();
      const tail = right
        ? Math.max(...values) + r.int(30, 60)
        : Math.min(...values) - r.int(20, 29);
      return fill(
        `The dot plot of ${[...values, tail].join(", ")} has a long tail to the ${right ? "right" : "left"}. Which is larger, the mean or the median? Type mean or median.`,
        right ? "mean" : "median",
        { hint: "mean or median" },
      );
    },
    (r) => {
      const scores = Array.from({ length: 5 }, () => r.int(40, 95));
      return slider(`Test scores are ${scores.join(", ")}. Place the median.`, {
        min: 0,
        max: 100,
        step: 1,
        value: median(scores),
        full: 1,
        zero: 12,
      });
    },
  ],
};
