import { Fragment, type ReactNode } from "react";

/**
 * Question text, with the exponents raised.
 *
 * The generators write powers the way you type them — `x^2`, `10^-3`,
 * `a^(m/n)` — because that is the one notation a template can build by pasting
 * strings together, and it is what the answer is typed back in. It is not what
 * a student reads in a book, though, and a caret in the middle of a prompt is
 * one more thing to decode against a rival. So the caret stays in the data and
 * becomes a small raised number here, at the last moment before the text
 * reaches the screen.
 *
 * Subscripts come along with them, for the handful of lines that write
 * `log_b(x)`.
 *
 * Anything that is not a power passes through untouched — which is every
 * string outside maths, and most of the ones inside it.
 *
 * A raised number is only raised visually, though, and the accessible name of
 * an element is its text content with the layout thrown away: `2.7 × 10^6`
 * flattens to "2.7 × 106", which is a different number, and four options that
 * differ only in their exponent flatten to four names that differ only in a
 * digit nobody announced as an exponent. So every string carrying a power ships
 * twice — the raised form for the eye, hidden from the accessibility tree, and
 * a spoken form for it, hidden from the eye. Nothing is said twice, and neither
 * reader gets the other's copy.
 */

/**
 * A power, and what counts as one:
 *
 *   `^2` `^-3` `^n` `^?`   a run of letters or digits, signed if it needs to be
 *   `^(m/n)` `^(nt)`       anything at all, once it is bracketed
 *   `_b` `_(1)`            an index, which is only ever the one character
 *
 * The unbracketed run ends at the first character that is neither a letter nor
 * a digit, which is what keeps the full stop out of `10^k.` and the question
 * mark out of `x^2?`.
 */
const POWER = /\^(\([^()]*\)|[+-]?[0-9A-Za-z]+|\?)|_(\([^()]*\)|[0-9A-Za-z])/g;

/** Brackets are how the notation groups. They are not part of the power. */
function bare(token: string): string {
  return token.startsWith("(") ? token.slice(1, -1) : token;
}

/**
 * The same string, said rather than drawn.
 *
 * "Squared" and "cubed" rather than "to the power 2", because that is what the
 * exponent is called out loud; and a minus becomes "negative", because "to the
 * power minus three" is heard as a subtraction hanging off the end of the
 * number.
 */
export function spoken(text: string): string {
  return text
    .replace(POWER, (_match, power?: string, index?: string) => {
      if (index !== undefined) return ` sub ${bare(index)}`;

      const raw = bare(power!);
      if (raw === "2") return " squared";
      if (raw === "3") return " cubed";

      const signed = raw.startsWith("-") ? `negative ${raw.slice(1)}` : raw;
      return ` to the power ${signed}`;
    })
    .replace(/\s+/g, " ")
    .trim();
}

export function MathText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let at = 0;

  for (const m of text.matchAll(POWER)) {
    if (m.index > at) parts.push(text.slice(at, m.index));
    parts.push(
      m[1] !== undefined ? <sup>{bare(m[1])}</sup> : <sub>{bare(m[2])}</sub>,
    );
    at = m.index + m[0].length;
  }

  // The common case: no power in the string, and it goes straight out.
  if (at === 0) return <>{text}</>;

  parts.push(text.slice(at));

  return (
    <>
      <span aria-hidden="true">
        {parts.map((part, i) => (
          <Fragment key={i}>{part}</Fragment>
        ))}
      </span>
      <span className="sr-only">{spoken(text)}</span>
    </>
  );
}
