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
 * Grade 7 generators.
 *
 * Keyed by subunit, and in the same order as this subunit's entry in
 * `GENERATED` — a generator's index is baked into every instance id it has
 * minted, so append rather than insert.
 *
 * Same two rules as Grade 5 and 6: three generators a subunit that differ in
 * the shape of the ask, and multiple choice only where the answer is a name or
 * a classification.
 *
 * Two things are new here. Negative numbers are written in brackets — `5 + (-3)`
 * rather than `5 + -3` — because the second is how a sign error looks, and a
 * question should not be modelling one. And π stays as π: a circumference is
 * asked for either exactly, as a multiple of π, or with π ≈ 3.14 and an answer
 * that lands on two decimal places, never as a decimal that has to be truncated
 * to be written down.
 */

// ─── Small helpers ───────────────────────────────────────

/**
 * A number as it should be written inside an expression: in brackets when it
 * is negative, bare when it is not.
 *
 * "8 - -2" is what a sign slip looks like on the page, and "(2) × (6)" is
 * punctuation for its own sake. One helper decides both.
 */
function bracketed(value: number): string {
  return value < 0 ? `(${value})` : String(value);
}

/** "12π", and the two coefficients that do not want writing out. */
function pi(coefficient: number): string {
  if (coefficient === 0) return "0";
  if (coefficient === 1) return "π";
  return `${coefficient}π`;
}

/** π to the two places these questions use, so the answers stay exact. */
const PI = 3.14;

/** How many of the 36 outcomes of two dice add to `wanted`. */
function diceWays(wanted: number): number {
  let ways = 0;
  for (let first = 1; first <= 6; first++) {
    for (let second = 1; second <= 6; second++) {
      if (first + second === wanted) ways++;
    }
  }
  return ways;
}

/** Denominators whose fractions terminate, and ones whose fractions repeat. */
const TERMINATING = [2, 4, 5, 8, 10, 20, 25] as const;
const REPEATING = [3, 6, 7, 9, 11, 12] as const;

export const GRADE_7: Record<string, ((r: Rng) => Built)[]> = {
  // ── 1.1 Unit rates with fractions ──
  "math/grade-7/unit-1/1.1": [
    (r) => {
      const distance = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const time = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const rate = asMixed(distance.n * time.d, distance.d * time.n);
      return fill(
        `A snail moves ${distance.n}/${distance.d} of a metre in ${time.n}/${time.d} of an hour. How far does it go in an hour?`,
        rate.show,
        { accept: rate.accept, unit: "metres", hint: "a fraction or mixed number" },
      );
    },
    // The same rate the other way up, which is the half students skip.
    (r) => {
      const distance = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const time = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const hours = asMixed(time.n * distance.d, time.d * distance.n);
      return fill(
        `Walking ${distance.n}/${distance.d} of a mile takes ${time.n}/${time.d} of an hour. How long does one mile take?`,
        hours.show,
        { accept: hours.accept, unit: "hours", hint: "a fraction or mixed number" },
      );
    },
    (r) => {
      const d = r.pick([2, 4]);
      const n = d === 2 ? 1 : r.pick([1, 3]);
      const batches = r.int(2, 8);
      return slider(
        `A recipe uses ${n}/${d} of a cup of oats a batch. Place the cups needed for ${batches} batches.`,
        {
          min: 0,
          max: 8,
          step: 0.25,
          value: dp((batches * n) / d),
          unit: "cups",
          full: 0.25,
          zero: 1,
        },
      );
    },
  ],

  // ── 1.2 Recognizing proportional relationships in tables ──
  "math/grade-7/unit-1/1.2": [
    (r) => {
      const k = r.int(2, 9);
      const first = r.int(2, 8);
      const second = other(r, first, 2, 8);
      const at = r.int(9, 15);
      return fill(
        `A table pairs ${first} with ${k * first} and ${second} with ${k * second}, in proportion. What is y when x is ${at}?`,
        k * at,
        { hint: "a number" },
      );
    },
    (r) => {
      const k = r.int(2, 8);
      const xs = [r.int(2, 4), r.int(5, 7), r.int(8, 11)];
      const proportional = r.bool();
      const ys = xs.map((x, i) => k * x + (proportional ? 0 : i === 2 ? r.int(1, 5) : 0));
      return fill(
        `Is this table proportional: (${xs[0]}, ${ys[0]}), (${xs[1]}, ${ys[1]}), (${xs[2]}, ${ys[2]})? Type yes or no.`,
        proportional ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const k = r.int(2, 9);
      const first = r.int(2, 6);
      const at = r.int(2, 9);
      return slider(
        `A proportional table pairs ${first} with ${k * first}. Place the y that goes with x = ${at}.`,
        { min: 0, max: 90, step: 1, value: k * at, full: 1, zero: 9 },
      );
    },
  ],

  // ── 1.3 Recognizing proportional relationships in graphs ──
  "math/grade-7/unit-1/1.3": [
    // Whether a straight line is proportional is a yes-or-no about a property,
    // and the reason is the answer worth having.
    (r) => {
      const intercept = r.int(2, 20);
      return among(
        `A graph is a straight line crossing the y-axis at ${intercept}. Is the relationship proportional?`,
        "No — a proportional graph goes through the origin",
        [
          "No — a proportional graph goes through the origin",
          "Yes — any straight line is proportional",
          "Yes — it has a constant slope",
          "No — proportional graphs are curved",
        ],
        r,
      );
    },
    (r) => {
      const k = r.int(2, 9);
      const through = r.int(2, 8);
      const at = r.int(9, 14);
      return fill(
        `A proportional graph passes through (${through}, ${k * through}). What is y when x is ${at}?`,
        k * at,
        { hint: "a number" },
      );
    },
    (r) => {
      const k = r.int(2, 4);
      const x = r.int(1, Math.floor(9 / k));
      return point(
        `A proportional relationship has the equation y = ${k}x. Plot the point where x = ${x}.`,
        { span: 10, x, y: k * x },
      );
    },
  ],

  // ── 1.4 The constant of proportionality ──
  "math/grade-7/unit-1/1.4": [
    (r) => {
      const x = r.int(2, 12);
      const y = r.int(2, 60);
      return fill(
        `A relationship pairs ${x} with ${y} in proportion. What is the constant of proportionality?`,
        frac(y, x),
        { hint: "a number or fraction" },
      );
    },
    (r) => {
      const k = r.int(2, 12);
      const x = r.int(2, 15);
      return fill(
        `The constant of proportionality is ${k} and y is ${k * x}. What is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const k = r.int(2, 12);
      const x = r.int(2, 8);
      return slider(
        `A table pairs ${x} with ${k * x}. Place the constant of proportionality.`,
        { min: 0, max: 15, step: 1, value: k, full: 1, zero: 3 },
      );
    },
  ],

  // ── 1.5 Equations of proportional relationships ──
  "math/grade-7/unit-1/1.5": [
    (r) => {
      const k = r.int(2, 12);
      const x = r.int(2, 15);
      return fill(
        `A relationship has a constant of proportionality of ${k}. What is y when x is ${x}?`,
        k * x,
        { hint: "a number" },
      );
    },
    (r) => {
      const k = r.int(2, 12);
      const x = r.int(2, 9);
      return fill(
        `Write the equation of the proportional relationship where y is ${k * x} when x is ${x}. Type it like y = 4x.`,
        `y = ${k}x`,
        { hint: "an equation in x and y" },
      );
    },
    (r) => {
      const k = r.int(2, 9);
      const x = r.int(2, 9);
      return slider(`In y = ${k}x, place y when x is ${x}.`, {
        min: 0,
        max: 90,
        step: 1,
        value: k * x,
        full: 1,
        zero: 9,
      });
    },
  ],

  // ── 1.6 Interpreting points on a proportional graph ──
  "math/grade-7/unit-1/1.6": [
    (r) => {
      const rate = r.int(2, 15);
      const weight = r.int(2, 9);
      return fill(
        `A proportional graph of cost against weight passes through (${weight}, ${rate * weight}). What does one kilogram cost?`,
        rate,
        { unit: "dollars", hint: "a number" },
      );
    },
    // What the point at x = 1 means is a statement about graphs, not a value.
    (r) =>
      among(
        "On the graph of a proportional relationship, what does the point (1, r) tell you?",
        "The unit rate",
        [
          "The unit rate",
          "The total amount",
          "The number of items",
          "Where the line crosses the y-axis",
        ],
        r,
      ),
    (r) => {
      const rate = r.int(2, 12);
      const x = r.int(2, 8);
      return slider(
        `A proportional graph passes through (${x}, ${rate * x}). Place the y-value at x = 1.`,
        { min: 0, max: 15, step: 1, value: rate, full: 1, zero: 3 },
      );
    },
  ],

  // ── 1.7 Solving proportions ──
  "math/grade-7/unit-1/1.7": [
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 12);
      const times = r.int(2, 8);
      return fill(
        `Solve the proportion: ${a}/${b} = x/${b * times}`,
        a * times,
        { hint: "a number" },
      );
    },
    (r) => {
      const bricks = r.int(3, 9);
      const weight = r.int(2, 15);
      const times = r.int(2, 8);
      return fill(
        `${bricks} bricks weigh ${bricks * weight} kg. How much do ${bricks * times} bricks weigh?`,
        bricks * weight * times,
        { unit: "kilograms", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 9);
      const times = r.int(2, 6);
      return slider(`Place x: ${a}/${b} = ${a * times}/x`, {
        min: 0,
        max: 60,
        step: 1,
        value: b * times,
        full: 1,
        zero: 6,
      });
    },
  ],

  // ── 1.8 Scale drawings and scale factor ──
  "math/grade-7/unit-1/1.8": [
    (r) => {
      const scale = r.int(2, 20);
      const drawn = r.int(2, 15);
      return fill(
        `A drawing uses a scale of 1 cm : ${scale} m. A wall is ${drawn} cm long on it. How long is the wall really?`,
        scale * drawn,
        { unit: "metres", hint: "a number" },
      );
    },
    (r) => {
      const scale = r.int(2, 20);
      const drawn = r.int(2, 12);
      return fill(
        `A model is ${drawn} cm long and the real thing is ${scale * drawn} m. On the scale 1 cm : ? m, what is the missing number?`,
        scale,
        { hint: "a number" },
      );
    },
    (r) => {
      const scale = r.int(2, 12);
      const drawn = r.int(2, 8);
      return slider(
        `A map scale is 1 cm : ${scale} km. Place the real distance for ${drawn} cm on the map.`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: scale * drawn,
          unit: "kilometres",
          full: 1,
          zero: 10,
        },
      );
    },
  ],

  // ── 1.9 Multi-step ratio problems ──
  "math/grade-7/unit-1/1.9": [
    (r) => {
      const flour = r.int(2, 9);
      const sugar = other(r, flour, 2, 9);
      const times = r.int(10, 60);
      return fill(
        `A recipe mixes flour and sugar in the ratio ${flour}:${sugar}. With ${flour * times} g of flour, how much sugar is needed?`,
        sugar * times,
        { unit: "grams", hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 7);
      const second = other(r, first, 2, 7);
      const part = r.int(5, 40);
      return fill(
        `$${(first + second) * part} is shared in the ratio ${first}:${second}. How much is the larger share?`,
        Math.max(first, second) * part,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const blue = r.int(1, 5);
      const white = r.int(1, 5);
      const part = r.int(2, 8);
      return slider(
        `Paint is mixed ${blue} parts blue to ${white} parts white. Place the litres of blue in ${(blue + white) * part} litres of mix.`,
        {
          min: 0,
          max: 60,
          step: 1,
          value: blue * part,
          unit: "litres",
          full: 1,
          zero: 6,
        },
      );
    },
  ],

  // ── 2.1 Adding integers on a number line ──
  "math/grade-7/unit-2/2.1": [
    (r) => {
      const from = r.int(-8, 8);
      const move = r.int(1, 10);
      const right = r.bool();
      return slider(
        `Start at ${from} and move ${move} to the ${right ? "right" : "left"}. Place where you land.`,
        {
          min: -20,
          max: 20,
          step: 1,
          value: right ? from + move : from - move,
          full: 1,
          zero: 4,
        },
      );
    },
    // Negatives in brackets throughout: "5 + -3" is what a sign slip looks
    // like, and a question should not be showing one.
    (r) => {
      const a = r.nonzero(-15, 15);
      const b = r.nonzero(-15, 15);
      return fill(`What is ${a} + ${bracketed(b)}?`, a + b, { hint: "a number" });
    },
    (r) => {
      const start = r.int(-15, 5);
      const rise = r.int(2, 20);
      return fill(
        `A temperature is ${start}°C and rises ${rise} degrees. What is it now?`,
        start + rise,
        { unit: "°C", hint: "a number" },
      );
    },
  ],

  // ── 2.2 Adding rational numbers ──
  "math/grade-7/unit-2/2.2": [
    (r) => {
      const a = dp(r.nonzero(-99, 99) / 10, 1);
      const b = dp(r.nonzero(-99, 99) / 10, 1);
      return fill(`Work out ${a} + ${bracketed(b)}`, dp(a + b, 1), { hint: "a decimal" });
    },
    (r) => {
      const depth = r.int(5, 40);
      const rise = r.int(2, 60);
      return fill(
        `A diver at -${depth} m rises ${rise} m. Where is the diver now?`,
        rise - depth,
        { unit: "metres", hint: "a number" },
      );
    },
    (r) => {
      const a = r.nonzero(-9, 9);
      const b = r.nonzero(-9, 9);
      return slider(`Place the sum ${a} + ${bracketed(b)}.`, {
        min: -20,
        max: 20,
        step: 1,
        value: a + b,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 2.3 Subtraction as adding the opposite ──
  "math/grade-7/unit-2/2.3": [
    (r) => {
      const a = r.nonzero(-15, 15);
      const b = r.nonzero(-15, 15);
      return fill(
        `Rewrite ${a} - ${bracketed(b)} as an addition and work it out.`,
        a - b,
        { hint: "a number" },
      );
    },
    // Which addition a subtraction turns into is the rule itself, written out.
    (r) => {
      const a = r.int(2, 15);
      const b = r.int(2, 15);
      return among(
        `${a} - (-${b}) is the same as which of these?`,
        `${a} + ${b}`,
        [`${a} + ${b}`, `${a} - ${b}`, `-${a} + ${b}`, `-${a} - ${b}`],
        r,
      );
    },
    (r) => {
      const a = r.nonzero(-9, 9);
      const b = r.nonzero(-9, 9);
      return slider(`Place the value of ${a} - ${bracketed(b)}.`, {
        min: -20,
        max: 20,
        step: 1,
        value: a - b,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 2.4 Distance as the absolute value of a difference ──
  "math/grade-7/unit-2/2.4": [
    (r) => {
      const a = r.int(-20, 20);
      const b = other(r, a, -20, 20);
      return fill(
        `How far apart are ${a} and ${b} on the number line?`,
        Math.abs(a - b),
        { unit: "units", hint: "a number" },
      );
    },
    (r) => {
      const was = r.int(-15, 10);
      const now = other(r, was, -15, 20);
      return fill(
        `The temperature was ${was}°C and is now ${now}°C. By how many degrees did it change?`,
        Math.abs(now - was),
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(-9, 9);
      const b = other(r, a, -9, 9);
      return slider(`Place the distance between ${a} and ${b}.`, {
        min: 0,
        max: 20,
        step: 1,
        value: Math.abs(a - b),
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 2.5 Multiplying rational numbers and sign rules ──
  "math/grade-7/unit-2/2.5": [
    (r) => {
      const a = r.nonzero(-12, 12);
      const b = r.nonzero(-12, 12);
      return fill(`Work out ${bracketed(a)} × ${bracketed(b)}`, a * b, { hint: "a number" });
    },
    // The sign rule stated rather than applied, which is what it is.
    (r) => {
      const pairing = r.pick([
        { clue: "A negative times a negative", answer: "A positive" },
        { clue: "A negative times a positive", answer: "A negative" },
      ]);
      return among(
        `${pairing.clue} gives what?`,
        pairing.answer,
        ["A positive", "A negative", "Zero", "It depends on which is larger"],
        r,
      );
    },
    (r) => {
      const a = r.nonzero(-8, 8);
      const b = r.nonzero(-8, 8);
      return slider(`Place the product ${bracketed(a)} × ${bracketed(b)}.`, {
        min: -64,
        max: 64,
        step: 1,
        value: a * b,
        full: 1,
        zero: 12,
      });
    },
  ],

  // ── 2.6 Dividing rational numbers ──
  "math/grade-7/unit-2/2.6": [
    (r) => {
      const quotient = r.nonzero(-12, 12);
      const divisor = r.nonzero(-12, 12);
      return fill(`Work out ${bracketed(quotient * divisor)} ÷ ${bracketed(divisor)}`, quotient, {
        hint: "a number",
      });
    },
    (r) => {
      const each = r.int(2, 40);
      const people = r.int(2, 9);
      return fill(
        `A debt of $${each * people} is shared equally between ${people} people. What does each one owe, as a negative number?`,
        -each,
        { unit: "dollars", hint: "a negative number" },
      );
    },
    (r) => {
      const quotient = r.nonzero(-9, 9);
      const divisor = r.nonzero(-6, 6);
      return slider(`Place the quotient ${bracketed(quotient * divisor)} ÷ ${bracketed(divisor)}.`, {
        min: -10,
        max: 10,
        step: 1,
        value: quotient,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 2.7 Terminating and repeating decimals ──
  "math/grade-7/unit-2/2.7": [
    (r) => {
      const { n, d } = properFraction(r, TERMINATING);
      return fill(`Write ${n}/${d} as a decimal.`, dp(n / d, 3), {
        hint: "a decimal",
      });
    },
    // Which denominators repeat is a property of the fraction, so it is the
    // classification this subunit is allowed.
    (r) => {
      const repeating = properFraction(r, REPEATING);
      const wrong = shuffled(TERMINATING, r)
        .slice(0, 3)
        .map((d) => {
          const simple = properFraction(r, [d]);
          return `${simple.n}/${simple.d}`;
        });
      return ask(
        "Which of these gives a repeating decimal?",
        `${repeating.n}/${repeating.d}`,
        wrong,
        r,
      );
    },
    (r) => {
      const { n, d } = properFraction(r, [2, 4, 5, 10, 20]);
      return slider(`Place ${n}/${d} as a decimal on a 0 to 1 line.`, {
        min: 0,
        max: 1,
        step: 0.05,
        value: dp(n / d),
        full: 0.05,
        zero: 0.2,
      });
    },
  ],

  // ── 2.8 Order of operations with rational numbers ──
  "math/grade-7/unit-2/2.8": [
    (r) => {
      const a = r.nonzero(-15, 15);
      const b = r.nonzero(-9, 9);
      const c = r.nonzero(-9, 9);
      return fill(`Work out the value: ${a} + ${bracketed(b)} × ${bracketed(c)}`, a + b * c, {
        hint: "a number",
      });
    },
    (r) => {
      const c = r.nonzero(-6, 6);
      const quotient = r.nonzero(-9, 9);
      const b = r.nonzero(-15, 15);
      const a = quotient * c - b;
      return fill(`Evaluate (${a} + ${bracketed(b)}) ÷ ${bracketed(c)}.`, quotient, {
        hint: "a number",
      });
    },
    (r) => {
      const a = r.nonzero(-9, 9);
      const b = r.nonzero(-6, 6);
      const c = r.nonzero(-6, 6);
      return slider(`Place the value of ${a} - ${bracketed(b)} × ${bracketed(c)}.`, {
        min: -50,
        max: 50,
        step: 1,
        value: a - b * c,
        full: 1,
        zero: 10,
      });
    },
  ],

  // ── 2.9 Applying rational number operations ──
  "math/grade-7/unit-2/2.9": [
    (r) => {
      const start = r.int(20, 300);
      const out = r.int(20, 400);
      const back = r.int(10, 200);
      return fill(
        `A bank account starts at $${start}, then $${out} is withdrawn and $${back} paid in. What is the balance?`,
        start - out + back,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const fall = r.int(1, 6);
      const days = r.int(2, 9);
      const start = fall * days + r.int(5, 40);
      return fill(
        `A share price starts at $${start} and falls $${fall} a day for ${days} days. What is it then?`,
        start - fall * days,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const start = r.int(-2, 8);
      const down = r.int(1, 9);
      const up = r.int(1, 9);
      return slider(
        `A lift starts at floor ${start}, goes down ${down} floors and then up ${up}. Place the floor it ends on.`,
        {
          min: -10,
          max: 20,
          step: 1,
          value: start - down + up,
          full: 1,
          zero: 4,
        },
      );
    },
  ],

  // ── 3.1 Percent increase and decrease ──
  "math/grade-7/unit-3/3.1": [
    (r) => {
      const price = 20 * r.int(1, 15);
      const percent = r.pick([5, 10, 20, 25, 50]);
      return fill(
        `A price rises from $${price} to $${price + (price * percent) / 100}. What is the percent increase?`,
        percent,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const price = 20 * r.int(2, 15);
      const percent = r.pick([10, 20, 25, 50]);
      return fill(
        `A $${price} coat is reduced by ${percent}%. What is the new price?`,
        price - (price * percent) / 100,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const town = 100 * r.int(2, 20);
      const percent = r.pick([10, 20, 50]);
      return slider(
        `A town of ${town} people grows by ${percent}%. Place the new population.`,
        {
          min: 0,
          max: 3000,
          step: 10,
          value: town + (town * percent) / 100,
          unit: "people",
          full: 10,
          zero: 300,
        },
      );
    },
  ],

  // ── 3.2 Tax, tip and commission ──
  "math/grade-7/unit-3/3.2": [
    (r) => {
      const meal = 20 * r.int(1, 10);
      const tip = r.pick([10, 15, 20, 25]);
      return fill(
        `A meal costs $${meal} and you leave a ${tip}% tip. How much is the tip?`,
        (meal * tip) / 100,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const sale = 100 * r.int(2, 30);
      const rate = r.pick([2, 3, 4, 5, 10]);
      return fill(
        `A sale of $${sale} earns ${rate}% commission. How much is that?`,
        (sale * rate) / 100,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const bill = 100 * r.int(1, 4);
      const tax = r.pick([5, 10, 20, 25]);
      return slider(
        `A $${bill} bill has ${tax}% tax added. Place the total.`,
        {
          min: 0,
          max: 600,
          step: 5,
          value: bill + (bill * tax) / 100,
          unit: "dollars",
          full: 5,
          zero: 60,
        },
      );
    },
  ],

  // ── 3.3 Discount and markup ──
  "math/grade-7/unit-3/3.3": [
    (r) => {
      const price = 20 * r.int(2, 15);
      const off = r.pick([10, 20, 25, 50]);
      return fill(
        `A $${price} jacket is ${off}% off. What is the sale price?`,
        price - (price * off) / 100,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const cost = 20 * r.int(2, 15);
      const markup = r.pick([10, 20, 25, 50]);
      return fill(
        `A shop buys an item at $${cost} and marks it up ${markup}%. What is the selling price?`,
        cost + (cost * markup) / 100,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const price = 20 * r.int(2, 10);
      const off = r.pick([10, 20, 25, 50]);
      return slider(
        `A $${price} game is ${off}% off. Place the discount in dollars.`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: (price * off) / 100,
          unit: "dollars",
          full: 1,
          zero: 10,
        },
      );
    },
  ],

  // ── 3.4 Simple interest ──
  "math/grade-7/unit-3/3.4": [
    (r) => {
      const principal = 100 * r.int(2, 20);
      const rate = r.pick([2, 3, 4, 5, 10]);
      const years = r.int(2, 6);
      return fill(
        `$${principal} is invested at ${rate}% simple interest for ${years} years. How much interest does it earn?`,
        (principal * rate * years) / 100,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const principal = 100 * r.int(2, 20);
      const rate = r.pick([2, 4, 5, 10]);
      const years = r.int(2, 6);
      return fill(
        `An account earned $${(principal * rate * years) / 100} in simple interest on $${principal} at ${rate}%. How many years was it invested?`,
        years,
        { unit: "years", hint: "a number" },
      );
    },
    (r) => {
      const principal = 100 * r.int(1, 10);
      const rate = r.pick([2, 3, 5]);
      const years = r.int(2, 5);
      return slider(
        `Place the simple interest on $${principal} at ${rate}% for ${years} years.`,
        {
          min: 0,
          max: 300,
          step: 1,
          value: (principal * rate * years) / 100,
          unit: "dollars",
          full: 1,
          zero: 30,
        },
      );
    },
  ],

  // ── 3.5 Percent error ──
  "math/grade-7/unit-3/3.5": [
    (r) => {
      const actual = 20 * r.int(2, 15);
      const percent = r.pick([5, 10, 20, 25]);
      const over = r.bool();
      const estimate = over
        ? actual + (actual * percent) / 100
        : actual - (actual * percent) / 100;
      return fill(
        `An estimate was ${estimate} and the actual value was ${actual}. What is the percent error?`,
        percent,
        { unit: "percent", hint: "a number" },
      );
    },
    // The error itself before it becomes a percentage, which is the step that
    // gets skipped.
    (r) => {
      const actual = r.int(20, 400);
      const measured = other(r, actual, 20, 400);
      return fill(
        `The actual length is ${actual} cm and the measured length is ${measured} cm. What is the error?`,
        Math.abs(measured - actual),
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const actual = 20 * r.int(2, 10);
      const percent = r.pick([5, 10, 20, 25, 50]);
      return slider(
        `An estimate of ${actual + (actual * percent) / 100} was made when the actual value was ${actual}. Place the percent error.`,
        { min: 0, max: 50, step: 5, value: percent, unit: "percent", full: 5, zero: 20 },
      );
    },
  ],

  // ── 3.6 Successive percent changes ──
  "math/grade-7/unit-3/3.6": [
    (r) => {
      const price = 100 * r.int(1, 8);
      const up = r.pick([10, 20, 50]);
      const down = r.pick([10, 20, 50]);
      return fill(
        `A price of $${price} rises ${up}% and then falls ${down}%. What is the final price?`,
        dp(price * (1 + up / 100) * (1 - down / 100)),
        { unit: "dollars", hint: "a number" },
      );
    },
    // That the two changes do not cancel is the whole idea, and it is a
    // statement rather than a number.
    (r) =>
      among(
        "A price rises 20% and then falls 20%. What happens overall?",
        "It ends lower than it started",
        [
          "It ends lower than it started",
          "It ends exactly where it started",
          "It ends higher than it started",
          "It depends on the starting price",
        ],
        r,
      ),
    (r) => {
      const price = 100 * r.int(1, 5);
      const first = r.pick([10, 20, 50]);
      const second = r.pick([10, 20, 50]);
      return slider(
        `A $${price} item is discounted ${first}% and then ${second}% more. Place the final price.`,
        {
          min: 0,
          max: 500,
          step: 1,
          value: dp(price * (1 - first / 100) * (1 - second / 100)),
          unit: "dollars",
          full: 1,
          zero: 50,
        },
      );
    },
  ],

  // ── 3.7 Working backward from a final amount ──
  "math/grade-7/unit-3/3.7": [
    (r) => {
      const original = 20 * r.int(2, 15);
      const off = r.pick([10, 20, 25, 50]);
      return fill(
        `After a ${off}% discount an item costs $${original - (original * off) / 100}. What was the original price?`,
        original,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const before = 20 * r.int(2, 15);
      const tax = r.pick([5, 10, 20, 25]);
      return fill(
        `A price after ${tax}% tax is $${before + (before * tax) / 100}. What was the price before tax?`,
        before,
        { unit: "dollars", hint: "a number" },
      );
    },
    (r) => {
      const before = 20 * r.int(2, 12);
      const rise = r.pick([10, 20, 25, 50]);
      return slider(
        `After a ${rise}% rise a weekly wage is $${before + (before * rise) / 100}. Place the wage before the rise.`,
        {
          min: 0,
          max: 300,
          step: 5,
          value: before,
          unit: "dollars",
          full: 5,
          zero: 40,
        },
      );
    },
  ],

  // ── 4.1 Adding and subtracting linear expressions ──
  "math/grade-7/unit-4/4.1": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 15);
      const c = r.int(2, 9);
      const d = r.int(2, 15);
      return fill(
        `Simplify by collecting terms: (${a}x + ${b}) + (${c}x + ${d})`,
        `${head(a + c, "x")}${signed(b + d)}`,
        { hint: "a term in x and a number" },
      );
    },
    (r) => {
      const c = r.int(2, 7);
      const a = c + r.int(2, 7);
      const b = r.int(2, 15);
      const d = r.int(2, 15);
      return fill(
        `Subtract and simplify: (${a}x + ${b}) - (${c}x + ${d})`,
        `${head(a - c, "x")}${signed(b - d)}`,
        { hint: "a term in x and a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 15);
      const c = r.int(2, 9);
      const d = r.int(2, 15);
      return slider(
        `Place the coefficient of x in (${a}x + ${b}) + (${c}x + ${d}).`,
        { min: 0, max: 20, step: 1, value: a + c, full: 1, zero: 4 },
      );
    },
  ],

  // ── 4.2 Factoring linear expressions ──
  "math/grade-7/unit-4/4.2": [
    (r) => {
      const factor = r.int(2, 9);
      const inX = r.int(1, 9);
      const constant = r.int(2, 12);
      return fill(
        `Factor this expression: ${head(factor * inX, "x")}${signed(factor * constant)}`,
        `${factor}(${head(inX, "x")}${signed(constant)})`,
        { hint: "a number times a bracket" },
      );
    },
    (r) => {
      const factor = r.int(2, 9);
      const inX = r.int(1, 9);
      const constant = r.int(2, 12);
      return fill(
        `What is the greatest common factor of ${factor * inX}x and ${factor * constant}?`,
        gcd(factor * inX, factor * constant),
        { hint: "a number" },
      );
    },
    (r) => {
      const factor = r.int(2, 9);
      const inX = r.int(1, 7);
      const constant = r.int(2, 9);
      return slider(
        `Place the number that comes out of ${head(factor * inX, "x")}${signed(factor * constant)}.`,
        {
          min: 0,
          max: 70,
          step: 1,
          value: gcd(factor * inX, factor * constant),
          full: 1,
          zero: 8,
        },
      );
    },
  ],

  // ── 4.3 Expanding with the distributive property ──
  "math/grade-7/unit-4/4.3": [
    (r) => {
      const outside = r.int(2, 9);
      const inX = r.int(2, 9);
      const constant = r.int(2, 12);
      return fill(
        `Expand this bracket: ${outside}(${inX}x + ${constant})`,
        `${head(outside * inX, "x")}${signed(outside * constant)}`,
        { hint: "a term in x and a number" },
      );
    },
    (r) => {
      const outside = r.int(2, 9);
      const constant = r.int(2, 12);
      const extra = r.int(2, 9);
      return fill(
        `Expand and simplify: ${outside}(x + ${constant}) + ${extra}x`,
        `${head(outside + extra, "x")}${signed(outside * constant)}`,
        { hint: "a term in x and a number" },
      );
    },
    (r) => {
      const outside = r.int(2, 9);
      const inX = r.int(2, 9);
      const constant = r.int(2, 11);
      return slider(
        `Place the constant term in ${outside}(${inX}x + ${constant}).`,
        { min: 0, max: 100, step: 1, value: outside * constant, full: 1, zero: 10 },
      );
    },
  ],

  // ── 4.4 Rewriting expressions to reveal meaning ──
  "math/grade-7/unit-4/4.4": [
    (r) => {
      const percent = 5 * r.int(1, 10);
      return fill(
        `A price p rises by ${percent}%. The new price is ? × p. What is the multiplier?`,
        dp(1 + percent / 100),
        { hint: "a decimal" },
      );
    },
    // Which form shows the increase is a question about what an expression
    // says rather than what it evaluates to.
    (r) => {
      const percent = 5 * r.int(1, 10);
      return among(
        `Which expression shows x increased by ${percent}% most plainly?`,
        `${dp(1 + percent / 100)} × x`,
        [
          `${dp(1 + percent / 100)} × x`,
          `${dp(percent / 100)} × x`,
          `x + ${percent}`,
          `${percent} × x`,
        ],
        r,
      );
    },
    (r) => {
      const percent = 5 * r.int(1, 19);
      return slider(
        `A cost of x falls by ${percent}%. Place the multiplier of x.`,
        { min: 0, max: 1, step: 0.05, value: dp(1 - percent / 100), full: 0.05, zero: 0.2 },
      );
    },
  ],

  // ── 4.5 Two-step equations ──
  "math/grade-7/unit-4/4.5": [
    (r) => {
      const a = r.int(2, 12);
      const b = r.int(2, 20);
      const x = r.int(2, 15);
      return fill(`Solve for x: ${a}x + ${b} = ${a * x + b}`, x, {
        hint: "a number",
      });
    },
    (r) => {
      const join = r.int(10, 60);
      const monthly = r.int(5, 30);
      const months = r.int(2, 12);
      return fill(
        `A gym charges $${join} to join and $${monthly} a month, and you have paid $${join + monthly * months}. How many months is that?`,
        months,
        { unit: "months", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 20);
      const x = r.int(2, 12);
      return slider(`Solve ${a}x - ${b} = ${a * x - b} and place x.`, {
        min: 0,
        max: 15,
        step: 1,
        value: x,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 4.6 Equations with rational coefficients ──
  "math/grade-7/unit-4/4.6": [
    (r) => {
      const { n, d } = properFraction(r, [2, 3, 4, 5, 6, 8]);
      const x = d * r.int(2, 6);
      return fill(`Solve for x: (${n}/${d})x = ${(n * x) / d}`, x, {
        hint: "a number",
      });
    },
    (r) => {
      const a = r.int(2, 9);
      const decimal = dp(r.int(11, 99) / 10, 1);
      const x = r.int(2, 12);
      return fill(
        `Clear the decimal and solve: ${a}x + ${decimal} = ${dp(a * x + decimal, 1)}`,
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

  // ── 4.7 Equations with the variable on both sides ──
  "math/grade-7/unit-4/4.7": [
    (r) => {
      const c = r.int(2, 7);
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
      const cheapRate = r.int(2, 9);
      const dearRate = cheapRate + r.int(1, 6);
      const months = r.int(2, 12);
      const join = months * (dearRate - cheapRate);
      return fill(
        `One phone plan costs $${join} to join and $${cheapRate} a month; another is free to join and $${dearRate} a month. After how many months do they cost the same?`,
        months,
        { unit: "months", hint: "a number" },
      );
    },
    (r) => {
      const c = r.int(2, 6);
      const a = c + r.int(1, 5);
      const b = r.int(2, 15);
      const x = r.int(2, 10);
      return slider(
        `Solve ${a}x + ${b} = ${c}x + ${b + (a - c) * x} and place x.`,
        { min: 0, max: 12, step: 1, value: x, full: 1, zero: 3 },
      );
    },
  ],

  // ── 4.8 Two-step inequalities ──
  "math/grade-7/unit-4/4.8": [
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 20);
      const x = r.int(2, 12);
      return fill(
        `Solve ${a}x + ${b} > ${a * x + b}. What is the smallest whole number x that works?`,
        x + 1,
        { hint: "a number" },
      );
    },
    (r) => {
      const ticket = r.int(5, 25);
      const fee = r.int(2, 15);
      const tickets = r.int(2, 10);
      return fill(
        `You have $${ticket * tickets + fee} and tickets cost $${ticket} each plus a $${fee} booking fee. What is the largest number of tickets you can buy?`,
        tickets,
        { unit: "tickets", hint: "a number" },
      );
    },
    (r) => {
      const a = r.int(2, 9);
      const b = r.int(2, 20);
      const x = r.int(2, 12);
      return slider(
        `Place the boundary of the solution to ${a}x + ${b} ≥ ${a * x + b}.`,
        { min: 0, max: 15, step: 1, value: x, full: 1, zero: 4 },
      );
    },
  ],

  // ── 4.9 Reversing the inequality sign ──
  "math/grade-7/unit-4/4.9": [
    (r) => {
      const a = r.int(2, 9);
      const b = a * r.int(1, 8);
      const greater = r.bool();
      return fill(
        `Solve -${a}x ${greater ? ">" : "<"} ${b}. Which way does the sign point in the answer? Type < or >.`,
        greater ? "<" : ">",
        { hint: "< or >" },
      );
    },
    // When the sign flips is the rule itself, and it is a statement.
    (r) =>
      among(
        "When does an inequality sign have to be reversed?",
        "When you multiply or divide both sides by a negative",
        [
          "When you multiply or divide both sides by a negative",
          "When you add a negative to both sides",
          "When you subtract from both sides",
          "Whenever there is a negative anywhere in it",
        ],
        r,
      ),
    (r) => {
      const a = r.int(2, 9);
      const k = r.int(1, 9);
      return slider(`Place the boundary of -${a}x ≤ ${a * k}.`, {
        min: -10,
        max: 10,
        step: 1,
        value: -k,
        full: 1,
        zero: 3,
      });
    },
  ],

  // ── 4.10 Modeling with equations and inequalities ──
  "math/grade-7/unit-4/4.10": [
    (r) => {
      const coach = r.int(20, 90);
      const each = r.int(5, 20);
      const students = r.int(5, 30);
      return fill(
        `A school trip costs $${coach} for the coach plus $${each} a student, and the budget is $${coach + each * students}. How many students can go?`,
        students,
        { unit: "students", hint: "a number" },
      );
    },
    (r) => {
      const length = r.int(4, 25);
      const width = other(r, length, 2, 25);
      return fill(
        `A rectangle has a perimeter of ${2 * (length + width)} cm and a length of ${length} cm. What is its width?`,
        width,
        { unit: "centimetres", hint: "a number" },
      );
    },
    (r) => {
      const start = r.int(10, 90);
      const weekly = r.int(5, 25);
      const weeks = r.int(2, 12);
      return slider(
        `A saver has $${start} and adds $${weekly} a week. Place the weeks needed to reach $${start + weekly * weeks}.`,
        { min: 0, max: 15, step: 1, value: weeks, unit: "weeks", full: 1, zero: 4 },
      );
    },
  ],

  // ── 5.1 Complementary and supplementary angles ──
  "math/grade-7/unit-5/5.1": [
    (r) => {
      const angle = 5 * r.int(1, 17);
      return fill(
        `Two angles are complementary and one of them is ${angle}°. What is the other?`,
        90 - angle,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const angle = 5 * r.int(1, 35);
      return fill(
        `Two angles are supplementary and one of them is ${angle}°. What is the other?`,
        180 - angle,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const angle = 5 * r.int(1, 35);
      return slider(`Place the supplement of ${angle}°.`, {
        min: 0,
        max: 180,
        step: 5,
        value: 180 - angle,
        unit: "degrees",
        full: 5,
        zero: 30,
      });
    },
  ],

  // ── 5.2 Vertical and adjacent angles ──
  "math/grade-7/unit-5/5.2": [
    (r) => {
      const angle = 5 * r.int(2, 34);
      return fill(
        `Two lines cross and one of the angles is ${angle}°. What is the angle vertical to it?`,
        angle,
        { unit: "degrees", hint: "a number" },
      );
    },
    (r) => {
      const angle = 5 * r.int(2, 34);
      return fill(
        `An angle of ${angle}° sits next to another on a straight line. What is the other one?`,
        180 - angle,
        { unit: "degrees", hint: "a number" },
      );
    },
    // What vertical angles always are is a property, so it goes on four options.
    (r) =>
      among(
        "Two angles are vertical to each other. What is always true of them?",
        "They are equal",
        [
          "They are equal",
          "They add to 180°",
          "They add to 90°",
          "They are both right angles",
        ],
        r,
      ),
  ],

  // ── 5.3 Solving for unknown angles ──
  "math/grade-7/unit-5/5.3": [
    (r) => {
      const x = r.pick([5, 10, 15, 20, 30]);
      const parts = 180 / x;
      // Both coefficients stay at 2 or more: "1x°" is a coefficient nobody
      // writes, and the smaller share still has to be worth naming.
      const first = r.int(2, parts - 2);
      return fill(
        `Two angles on a straight line are ${first}x° and ${parts - first}x°. What is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(2, 12);
      const a = r.int(2, 6);
      const b = r.int(2, 15);
      const complement = 90 - (a * x + b);
      return fill(
        `An angle of (${a}x + ${b})° is complementary to an angle of ${complement}°. What is x?`,
        x,
        { hint: "a number" },
      );
    },
    (r) => {
      const x = r.int(2, 15);
      const a = r.int(2, 9);
      return slider(`Place x: ${a}x° and ${180 - a * x}° are supplementary.`, {
        min: 0,
        max: 20,
        step: 1,
        value: x,
        full: 1,
        zero: 4,
      });
    },
  ],

  // ── 5.4 Triangle inequality and constructing triangles ──
  "math/grade-7/unit-5/5.4": [
    (r) => {
      const first = r.int(3, 20);
      const second = other(r, first, 3, 20);
      return fill(
        `Two sides of a triangle are ${first} and ${second}. What is the smallest whole-number third side?`,
        Math.abs(first - second) + 1,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(3, 15);
      const second = r.int(3, 15);
      const works = r.bool();
      const third = works
        ? r.int(Math.abs(first - second) + 1, first + second - 1)
        : first + second + r.int(1, 6);
      return fill(
        `Can a triangle have sides ${first}, ${second} and ${third}? Type yes or no.`,
        works ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const first = r.int(3, 15);
      const second = r.int(3, 15);
      return slider(
        `Sides of ${first} and ${second} are given. Place the largest whole-number third side.`,
        { min: 0, max: 35, step: 1, value: first + second - 1, full: 1, zero: 5 },
      );
    },
  ],

  // ── 5.5 Conditions determining a unique triangle ──
  "math/grade-7/unit-5/5.5": [
    // Which conditions pin a triangle down is a statement about the criteria
    // themselves.
    (r) =>
      among(
        "Which of these determines exactly one triangle?",
        "Three side lengths",
        [
          "Three side lengths",
          "Three angles",
          "Two side lengths only",
          "One angle and one side",
        ],
        r,
      ),
    (r) => {
      const condition = r.pick([
        { clue: "three side lengths", unique: true },
        { clue: "two sides and the angle between them", unique: true },
        { clue: "two angles and the side between them", unique: true },
        { clue: "three angles", unique: false },
        { clue: "two sides and no angle", unique: false },
      ]);
      return fill(
        `Does knowing ${condition.clue} determine exactly one triangle? Type yes or no.`,
        condition.unique ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const first = r.int(3, 12);
      const second = r.int(3, 12);
      const works = r.bool();
      const third = works
        ? r.int(Math.abs(first - second) + 1, first + second - 1)
        : first + second + r.int(1, 5);
      return fill(
        `How many triangles have sides ${first}, ${second} and ${third}? Type 0 or 1.`,
        works ? 1 : 0,
        { hint: "0 or 1" },
      );
    },
  ],

  // ── 5.6 Cross sections of three-dimensional figures ──
  "math/grade-7/unit-5/5.6": [
    // Naming the shape of a slice is the ask, and it is a name.
    (r) => {
      const cut = r.pick([
        { solid: "cube", shape: "A square" },
        { solid: "cylinder", shape: "A circle" },
        { solid: "triangular prism", shape: "A triangle" },
        { solid: "square pyramid", shape: "A square" },
      ]);
      return among(
        `A ${cut.solid} is sliced parallel to its base. What shape is the cross section?`,
        cut.shape,
        ["A square", "A circle", "A triangle", "A hexagon"],
        r,
      );
    },
    (r) => {
      const solid = r.pick([
        { name: "cube", sides: 4 },
        { name: "cylinder", sides: 0 },
        { name: "triangular prism", sides: 3 },
        { name: "hexagonal prism", sides: 6 },
      ]);
      return fill(
        `A ${solid.name} is sliced parallel to its base. How many sides does the cross section have? Type 0 for a circle.`,
        solid.sides,
        { hint: "a number" },
      );
    },
    (r) => {
      const long = r.int(3, 15);
      const wide = r.int(2, 12);
      const high = r.int(2, 10);
      return fill(
        `A rectangular prism is ${long} by ${wide} by ${high} cm. It is cut parallel to the ${long} by ${wide} face. What is the area of the cross section?`,
        long * wide,
        { unit: "square centimetres", hint: "a number" },
      );
    },
  ],

  // ── 5.7 Circumference of a circle ──
  "math/grade-7/unit-5/5.7": [
    (r) => {
      const radius = r.int(2, 20);
      return fill(
        `A circle has a radius of ${radius}. What is its circumference in terms of π?`,
        pi(2 * radius),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const diameter = r.int(2, 30);
      return fill(
        `Using π ≈ 3.14, what is the circumference of a circle with a diameter of ${diameter} cm?`,
        dp(PI * diameter),
        { unit: "centimetres", hint: "a decimal" },
      );
    },
    (r) => {
      const radius = r.int(2, 15);
      return slider(
        `Place the radius of a circle whose circumference is ${pi(2 * radius)}.`,
        { min: 0, max: 20, step: 1, value: radius, full: 1, zero: 4 },
      );
    },
  ],

  // ── 5.8 Area of a circle ──
  "math/grade-7/unit-5/5.8": [
    (r) => {
      const radius = r.int(2, 15);
      return fill(
        `A circle has a radius of ${radius}. What is its area in terms of π?`,
        pi(radius * radius),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const radius = r.int(2, 12);
      return fill(
        `Using π ≈ 3.14, what is the area of a circle with a radius of ${radius} cm?`,
        dp(PI * radius * radius),
        { unit: "square centimetres", hint: "a decimal" },
      );
    },
    (r) => {
      const radius = r.int(2, 12);
      return slider(
        `A circle has an area of ${pi(radius * radius)}. Place its radius.`,
        { min: 0, max: 15, step: 1, value: radius, full: 1, zero: 3 },
      );
    },
  ],

  // ── 5.9 Composite figures involving circles ──
  "math/grade-7/unit-5/5.9": [
    (r) => {
      const radius = 2 * r.int(1, 8);
      return fill(
        `A semicircle has a radius of ${radius}. What is its area in terms of π?`,
        pi((radius * radius) / 2),
        { hint: "a multiple of π" },
      );
    },
    (r) => {
      const side = 2 * r.int(1, 8);
      return fill(
        `A square of side ${side} cm has a quarter circle of radius ${side} cm cut out of it. What area is left, using π ≈ 3.14?`,
        dp(side * side - (PI * side * side) / 4),
        { unit: "square centimetres", hint: "a decimal" },
      );
    },
    (r) => {
      const radius = 2 * r.int(1, 6);
      return slider(
        `A semicircle has a radius of ${radius}. Place the number that multiplies π in its area.`,
        { min: 0, max: 80, step: 1, value: (radius * radius) / 2, full: 1, zero: 8 },
      );
    },
  ],

  // ── 5.10 Area, volume and surface area problems ──
  "math/grade-7/unit-5/5.10": [
    (r) => {
      const base = r.int(6, 60);
      const height = r.int(2, 15);
      return fill(
        `A prism has a triangular base of area ${base} cm² and a height of ${height} cm. What is its volume?`,
        base * height,
        { unit: "cubic centimetres", hint: "a number" },
      );
    },
    (r) => {
      const edge = r.int(2, 9);
      return fill(
        `A cube has a volume of ${edge ** 3} cm³. What is its surface area?`,
        6 * edge ** 2,
        { unit: "square centimetres", hint: "a number" },
      );
    },
    (r) => {
      const long = r.int(2, 10);
      const wide = r.int(2, 8);
      const high = r.int(2, 6);
      return slider(
        `Place the volume of a box ${long} by ${wide} by ${high} cm.`,
        {
          min: 0,
          max: 480,
          step: 1,
          value: long * wide * high,
          unit: "cubic centimetres",
          full: 1,
          zero: 40,
        },
      );
    },
  ],

  // ── 6.1 Likelihood and the probability scale ──
  "math/grade-7/unit-6/6.1": [
    (r) => {
      const sectors = r.pick([4, 5, 10, 20]);
      const red = r.int(1, sectors - 1);
      return slider(
        `A spinner has ${sectors} equal sectors and ${red} of them are red. Place the probability of red on a 0 to 1 scale.`,
        { min: 0, max: 1, step: 0.05, value: dp(red / sectors), full: 0.05, zero: 0.2 },
      );
    },
    // Where certainty and impossibility sit on the scale is a fact about the
    // scale, not a calculation.
    (r) => {
      const kind = r.pick([
        { clue: "cannot happen", answer: "0" },
        { clue: "is certain to happen", answer: "1" },
      ]);
      return among(
        `An event that ${kind.clue} has which probability?`,
        kind.answer,
        ["0", "1", "1/2", "It cannot be given a number"],
        r,
      );
    },
    (r) => {
      const percent = r.pick([5, 10, 20, 80, 90, 95]);
      return fill(
        `A probability of ${dp(percent / 100)} describes an event that is what? Type likely or unlikely.`,
        percent > 50 ? "likely" : "unlikely",
        { hint: "likely or unlikely" },
      );
    },
  ],

  // ── 6.2 Theoretical probability ──
  "math/grade-7/unit-6/6.2": [
    (r) => {
      const red = r.int(2, 12);
      const blue = r.int(2, 12);
      return fill(
        `A bag has ${red} red and ${blue} blue counters. What is the probability of drawing red, as a fraction?`,
        frac(red, red + blue),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const above = r.int(1, 5);
      return fill(
        `A fair die is rolled. What is the probability of a number greater than ${above}, as a fraction?`,
        frac(6 - above, 6),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const sectors = r.pick([4, 5, 10, 20]);
      const winning = r.int(1, sectors - 1);
      return slider(
        `A spinner has ${sectors} equal sectors, ${winning} of them winning. Place the percentage chance of winning.`,
        {
          min: 0,
          max: 100,
          step: 5,
          value: Math.round((winning / sectors) * 100),
          unit: "percent",
          full: 5,
          zero: 20,
        },
      );
    },
  ],

  // ── 6.3 Experimental probability ──
  "math/grade-7/unit-6/6.3": [
    (r) => {
      const flips = r.int(20, 80);
      const heads = r.int(5, flips - 5);
      return fill(
        `A coin landed heads ${heads} times in ${flips} flips. What is the experimental probability of heads, as a fraction?`,
        frac(heads, flips),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const spins = r.pick([20, 25, 50, 100]);
      const reds = r.int(1, spins - 1);
      return fill(
        `In ${spins} spins a spinner landed on red ${reds} times. What percentage is that?`,
        (reds * 100) / spins,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const rolls = r.pick([20, 50, 100]);
      const sixes = r.int(1, rolls / 4);
      return slider(
        `A die was rolled ${rolls} times and showed a six ${sixes} times. Place the experimental probability as a percentage.`,
        {
          min: 0,
          max: 50,
          step: 1,
          value: (sixes * 100) / rolls,
          unit: "percent",
          full: 1,
          zero: 8,
        },
      );
    },
  ],

  // ── 6.4 Comparing theoretical and experimental results ──
  "math/grade-7/unit-6/6.4": [
    (r) => {
      const flips = 2 * r.int(10, 40);
      const heads = flips / 2 + r.int(1, 8);
      return fill(
        `A fair coin flipped ${flips} times gave ${heads} heads. How many more heads was that than expected?`,
        heads - flips / 2,
        { hint: "a number" },
      );
    },
    (r) => {
      const rolls = 6 * r.int(2, 20);
      return fill(
        `A fair die is rolled ${rolls} times. How many sixes would you expect?`,
        rolls / 6,
        { unit: "sixes", hint: "a number" },
      );
    },
    (r) => {
      const sectors = r.pick([4, 5, 10]);
      const spins = sectors * r.int(2, 12);
      return slider(
        `A spinner with ${sectors} equal sectors is spun ${spins} times. Place the expected number of landings on one chosen sector.`,
        { min: 0, max: 30, step: 1, value: spins / sectors, full: 1, zero: 4 },
      );
    },
  ],

  // ── 6.5 Simulation ──
  "math/grade-7/unit-6/6.5": [
    (r) => {
      const top = r.int(0, 8);
      return fill(
        `A simulation uses the digits 0 to 9, with 0 to ${top} standing for success. What percentage chance does it model?`,
        (top + 1) * 10,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const trials = r.pick([20, 25, 50, 100]);
      const successes = r.int(1, trials - 1);
      return fill(
        `${trials} simulated trials gave ${successes} successes. What is the experimental probability, as a percentage?`,
        (successes * 100) / trials,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const percent = 10 * r.int(1, 9);
      const trials = 10 * r.int(2, 10);
      return slider(
        `A simulation models a ${percent}% chance over ${trials} trials. Place the expected number of successes.`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: (percent * trials) / 100,
          full: 1,
          zero: 10,
        },
      );
    },
  ],

  // ── 6.6 Sample space of compound events ──
  "math/grade-7/unit-6/6.6": [
    (r) => {
      const flips = r.int(2, 6);
      return fill(
        `A coin is flipped ${flips} times. How many outcomes are there altogether?`,
        2 ** flips,
        { unit: "outcomes", hint: "a number" },
      );
    },
    (r) => {
      const mains = r.int(2, 9);
      const desserts = r.int(2, 9);
      return fill(
        `A menu has ${mains} main courses and ${desserts} desserts. How many different meals are possible?`,
        mains * desserts,
        { unit: "meals", hint: "a number" },
      );
    },
    (r) => {
      const sectors = r.int(2, 8);
      return slider(
        `A spinner with ${sectors} sectors is spun and a die is rolled. Place the number of outcomes.`,
        { min: 0, max: 60, step: 1, value: 6 * sectors, full: 1, zero: 6 },
      );
    },
  ],

  // ── 6.7 Tree diagrams and organized lists ──
  "math/grade-7/unit-6/6.7": [
    (r) => {
      const shirts = r.int(2, 8);
      const trousers = r.int(2, 8);
      return fill(
        `A tree diagram for ${shirts} shirts and ${trousers} pairs of trousers has how many end branches?`,
        shirts * trousers,
        { unit: "branches", hint: "a number" },
      );
    },
    (r) => {
      const wanted = r.int(3, 11);
      return fill(
        `Two dice are rolled. How many of the 36 outcomes give a total of ${wanted}?`,
        diceWays(wanted),
        { unit: "outcomes", hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(2, 6);
      const second = r.int(2, 6);
      return slider(
        `Place the number of branches in a tree diagram for ${first} choices followed by ${second} choices.`,
        { min: 0, max: 40, step: 1, value: first * second, full: 1, zero: 5 },
      );
    },
  ],

  // ── 6.8 Probability of compound events ──
  "math/grade-7/unit-6/6.8": [
    (r) => {
      const flips = r.int(2, 6);
      return fill(
        `A coin is flipped ${flips} times. What is the probability of all heads, as a fraction?`,
        frac(1, 2 ** flips),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const sectors = r.int(3, 10);
      return fill(
        `A spinner with ${sectors} equal sectors is spun twice. What is the probability of the same sector twice, as a fraction?`,
        frac(1, sectors),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const wanted = r.int(3, 11);
      return slider(
        `Two dice are rolled. Place how many of the 36 outcomes give a total of ${wanted}.`,
        { min: 0, max: 12, step: 1, value: diceWays(wanted), full: 1, zero: 3 },
      );
    },
  ],

  // ── 6.9 Independent and dependent events ──
  "math/grade-7/unit-6/6.9": [
    // Whether one draw affects the next is the definition, and it is a
    // statement about the situation.
    (r) => {
      const replaced = r.bool();
      return among(
        `Two counters are drawn from a bag, ${replaced ? "replacing the first before the second" : "without replacing the first"}. Are the draws independent?`,
        replaced
          ? "Yes — the bag is the same both times"
          : "No — the first draw changes what is left",
        [
          "Yes — the bag is the same both times",
          "No — the first draw changes what is left",
          "Yes — every draw is always independent",
          "No — two draws are never independent",
        ],
        r,
      );
    },
    (r) => {
      const red = r.int(2, 8);
      const blue = r.int(2, 8);
      return fill(
        `A bag has ${red} red and ${blue} blue counters. Two are drawn with replacement. What is the probability both are red, as a fraction?`,
        frac(red * red, (red + blue) ** 2),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const red = r.int(3, 8);
      const blue = r.int(2, 8);
      return fill(
        `Two counters are drawn from ${red} red and ${blue} blue without replacing the first. What is the probability both are red, as a fraction?`,
        frac(red * (red - 1), (red + blue) * (red + blue - 1)),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 7.1 Populations and samples ──
  "math/grade-7/unit-7/7.1": [
    // Which group is the population is a naming question about the study.
    (r) => {
      const sample = 10 * r.int(2, 9);
      const students = 100 * r.int(3, 12);
      return among(
        `A survey asks ${sample} of the ${students} students in a school. What is the population?`,
        `All ${students} students`,
        [
          `All ${students} students`,
          `The ${sample} students asked`,
          `The ${sample} answers given`,
          "The school itself",
        ],
        r,
      );
    },
    (r) => {
      const size = 10 * r.int(2, 9);
      const population = size * r.int(4, 20);
      return fill(
        `A sample of ${size} is taken from a population of ${population}. What fraction of the population is that, in lowest terms?`,
        frac(size, population),
        { hint: "a fraction" },
      );
    },
    (r) => {
      const population = 100 * r.int(2, 20);
      const percent = r.pick([5, 10, 20, 25]);
      return slider(
        `A population of ${population} is sampled at ${percent}%. Place the sample size.`,
        {
          min: 0,
          max: 500,
          step: 5,
          value: (population * percent) / 100,
          full: 5,
          zero: 50,
        },
      );
    },
  ],

  // ── 7.2 Random sampling and bias ──
  "math/grade-7/unit-7/7.2": [
    // Which sample is biased is a judgement about method, not a number.
    (r) =>
      among(
        "Which of these samples is most likely to be biased?",
        "Asking people at a football match about the town's favourite sport",
        [
          "Asking people at a football match about the town's favourite sport",
          "Drawing 50 names at random from a list of everyone",
          "Asking every tenth person on a full class register",
          "Numbering the whole year group and picking numbers at random",
        ],
        r,
      ),
    (r) => {
      const survey = r.pick([
        { clue: "only at a football match, about the town's favourite sport", biased: true },
        { clue: "only in the library, about how much students read", biased: true },
        { clue: "by drawing names at random from the whole school roll", biased: false },
        { clue: "by picking every tenth student from a shuffled list", biased: false },
      ]);
      return fill(
        `A survey is taken ${survey.clue}. Is the sample biased? Type yes or no.`,
        survey.biased ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const chosen = 10 * r.int(1, 9);
      const population = chosen * r.int(4, 20);
      return fill(
        `To choose ${chosen} students at random from ${population}, what chance must each student have? Give it as a fraction.`,
        frac(chosen, population),
        { hint: "a fraction" },
      );
    },
  ],

  // ── 7.3 Estimating a population from a sample ──
  "math/grade-7/unit-7/7.3": [
    (r) => {
      const sample = r.pick([20, 25, 50, 100]);
      const found = r.int(2, sample / 2);
      const population = sample * r.int(4, 20);
      return fill(
        `In a sample of ${sample}, ${found} were left-handed. Estimate the number in a population of ${population}.`,
        (found * population) / sample,
        { hint: "a number" },
      );
    },
    (r) => {
      const tagged = 10 * r.int(2, 10);
      const recaptured = r.int(2, 10);
      const times = r.int(3, 12);
      return fill(
        `${tagged} fish were tagged and released. A later sample of ${recaptured * times} fish held ${recaptured} tagged ones. Estimate the population.`,
        tagged * times,
        { unit: "fish", hint: "a number" },
      );
    },
    (r) => {
      const sample = r.pick([20, 25, 50]);
      const prefer = r.int(2, sample / 2);
      const population = sample * r.int(4, 10);
      return slider(
        `${prefer} of ${sample} people sampled prefer tea. Place the estimate for a population of ${population}.`,
        {
          min: 0,
          max: 500,
          step: 1,
          value: (prefer * population) / sample,
          full: 1,
          zero: 50,
        },
      );
    },
  ],

  // ── 7.4 Variability across samples ──
  "math/grade-7/unit-7/7.4": [
    (r) => {
      const first = 5 * r.int(2, 15);
      const second = 5 * r.int(2, 15);
      const third = 5 * r.int(2, 15);
      return fill(
        `Three samples gave estimates of ${first}%, ${second}% and ${third}%. What is the range of the estimates?`,
        Math.max(first, second, third) - Math.min(first, second, third),
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const small = 10 * r.int(1, 9);
      const large = small + 10 * r.int(2, 20);
      return fill(
        `Samples of ${small} and ${large} people are taken. Which sample size gives the more reliable estimate?`,
        large,
        { hint: "a number" },
      );
    },
    (r) => {
      const mean = 5 * r.int(6, 15);
      const spread = r.int(1, 8);
      const estimates = shuffled(
        [mean - spread, mean + spread, mean - 2 * spread, mean + 2 * spread],
        r,
      );
      return slider(
        `Four samples estimated ${estimates.join("%, ")}%. Place the mean estimate.`,
        { min: 0, max: 100, step: 1, value: mean, unit: "percent", full: 1, zero: 10 },
      );
    },
  ],

  // ── 7.5 Comparing two populations ──
  "math/grade-7/unit-7/7.5": [
    (r) => {
      const first = r.int(10, 90);
      const second = other(r, first, 10, 90);
      return fill(
        `Class A has a mean score of ${first} and class B a mean of ${second}. What is the difference in means?`,
        Math.abs(first - second),
        { hint: "a number" },
      );
    },
    (r) => {
      const mad = r.int(2, 8);
      const gap = mad * r.int(2, 5);
      const first = r.int(20, 60);
      return fill(
        `Two groups have means of ${first} and ${first + gap}, and both have a mean absolute deviation of ${mad}. How many MADs apart are the means?`,
        gap / mad,
        { hint: "a number" },
      );
    },
    (r) => {
      const first = r.int(10, 60);
      const second = other(r, first, 10, 60);
      return slider(
        `Group one has a mean of ${first} and group two a mean of ${second}. Place the difference.`,
        { min: 0, max: 50, step: 1, value: Math.abs(first - second), full: 1, zero: 8 },
      );
    },
  ],

  // ── 7.6 Visual overlap of distributions ──
  "math/grade-7/unit-7/7.6": [
    // What overlap means is an inference, and it is the sentence rather than
    // the number that is being tested.
    (r) => {
      const overlap = r.bool();
      return among(
        `Two dot plots ${overlap ? "overlap almost completely" : "barely overlap at all"}. What does that suggest?`,
        overlap
          ? "The two groups are much alike"
          : "There is a real difference between the groups",
        [
          "The two groups are much alike",
          "There is a real difference between the groups",
          "The samples must be the same size",
          "Nothing at all can be said",
        ],
        r,
      );
    },
    (r) => {
      const mad = r.int(2, 8);
      const gap = mad * r.int(1, 5);
      const first = r.int(20, 60);
      return fill(
        `Two groups have means of ${first} and ${first + gap}, both with a mean absolute deviation of ${mad}. Is the gap more than twice the MAD? Type yes or no.`,
        gap > 2 * mad ? "yes" : "no",
        { hint: "yes or no" },
      );
    },
    (r) => {
      const mad = r.int(2, 8);
      const multiple = r.int(1, 6);
      const first = r.int(20, 60);
      return slider(
        `Means of ${first} and ${first + mad * multiple}, with a mean absolute deviation of ${mad}. Place the gap as a number of MADs.`,
        { min: 0, max: 8, step: 1, value: multiple, full: 1, zero: 2 },
      );
    },
  ],

  // ── 7.7 Drawing inferences from data ──
  "math/grade-7/unit-7/7.7": [
    (r) => {
      const sample = r.pick([20, 25, 50, 100]);
      const yes = r.int(1, sample - 1);
      return fill(
        `In a sample of ${sample}, ${yes} said yes. What percentage is that?`,
        (yes * 100) / sample,
        { unit: "percent", hint: "a number" },
      );
    },
    (r) => {
      const sample = r.pick([20, 25, 50]);
      const support = r.int(2, sample / 2);
      const population = sample * r.int(10, 40);
      return fill(
        `${support} of ${sample} voters sampled support a plan. How many of ${population} voters would you expect to support it?`,
        (support * population) / sample,
        { unit: "voters", hint: "a number" },
      );
    },
    (r) => {
      const sample = r.pick([20, 25, 50]);
      const successes = r.int(1, sample - 1);
      return slider(
        `A sample of ${sample} had ${successes} successes. Place the percentage.`,
        {
          min: 0,
          max: 100,
          step: 1,
          value: (successes * 100) / sample,
          unit: "percent",
          full: 1,
          zero: 12,
        },
      );
    },
  ],
};
