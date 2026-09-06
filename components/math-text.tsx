import { Fragment, type ReactNode } from "react";

/**
 * Question text, with the exponents raised and the matrices drawn.
 *
 * The generators write maths the way you type it — `x^2`, `10^-3`, `a^(m/n)`,
 * `[[1, 2], [3, 4]]`, `⟨3, 4⟩` — because that is the one notation a template
 * can build by pasting strings together, and it is what the answer is typed
 * back in. It is not what a student reads in a book, though, and a caret or a
 * doubled bracket in the middle of a prompt is one more thing to decode
 * against a rival. So the typed form stays in the data and becomes a raised
 * number, or a real bracketed grid, here — at the last moment before the text
 * reaches the screen.
 *
 * This is the only place either transformation happens, which is what makes
 * one matrix look the same everywhere it appears. Every surface that shows
 * question text goes through here: the prompt on the stage, the options on a
 * multiple-choice board, the answer readout and the "you said" line in the
 * end-screen review, and the coaching under a missed question.
 *
 * Subscripts come along with the powers, for the handful of lines that write
 * `log_b(x)` — and now for the coaching, which names a matrix entry `c_(21)`.
 *
 * Anything that is not a power or a grid passes through untouched — which is
 * every string outside maths, and most of the ones inside it.
 *
 * A raised number and a drawn grid are only visual, though, and the accessible
 * name of an element is its text content with the layout thrown away: `2.7 ×
 * 10^6` flattens to "2.7 × 106", which is a different number, and
 * `[[1, 2], [3, 4]]` flattens to a run of brackets and commas that a screen
 * reader either skips as punctuation or spells out one character at a time.
 * Neither is the matrix. So every string carrying either ships twice — the
 * drawn form for the eye, hidden from the accessibility tree, and a spoken
 * form for it, hidden from the eye. Nothing is said twice, and neither reader
 * gets the other's copy.
 */

/**
 * A power, and what counts as one:
 *
 *   `^2` `^-3` `^n` `^?`   a run of letters or digits, signed if it needs to be
 *   `^(m/n)` `^(nt)`       anything at all, once it is bracketed
 *   `_b` `_(1)` `_(21)`    an index, one character bare or any length bracketed
 *
 * The unbracketed run ends at the first character that is neither a letter nor
 * a digit, which is what keeps the full stop out of `10^k.` and the question
 * mark out of `x^2?`.
 */
const POWER = /\^(\([^()]*\)|[+-]?[0-9A-Za-z]+|\?)|_(\([^()]*\)|[0-9A-Za-z])/g;

/** The same pattern, unanchored and stateless, for the "is it worth it" check. */
const HAS_POWER = new RegExp(POWER.source);

/**
 * A matrix or a vector, as a generator writes one.
 *
 *   `[[1, 2], [3, 4]]`   rows in square brackets, inside one more pair
 *   `[[5], [-2]]`        a single column — a column vector
 *   `⟨3, 4⟩`             angle brackets, the notation precalculus uses
 *
 * Deliberately narrow. An interval `[0, 5]` and a list `[a, b]` are ordinary
 * text and must stay ordinary text, so nothing matches without the doubled
 * bracket; and `gridOf` rejects anything ragged or empty, which sends it back
 * out through the plain path rather than drawing something wrong.
 */
const GRID = /\[\s*\[[^[\]]*\](?:\s*,\s*\[[^[\]]*\])*\s*\]|⟨[^⟨⟩]*⟩/g;

/** Brackets are how the notation groups. They are not part of the power. */
function bare(token: string): string {
  return token.startsWith("(") ? token.slice(1, -1) : token;
}

type Grid = {
  rows: string[][];
  /** Angle brackets rather than square: a vector written ⟨x, y⟩. */
  angle: boolean;
};

type Segment = { kind: "text"; text: string } | ({ kind: "grid" } & Grid);

function entries(inside: string): string[] {
  return inside.split(",").map((e) => e.trim());
}

/**
 * One `GRID` match read as rows, or null when it is not really a grid.
 *
 * Ragged rows and empty entries are the two ways a string can look like the
 * pattern without being a matrix. Both return null, and the caller leaves the
 * text alone — a wrong grid on the screen is worse than a typed one.
 */
function gridOf(token: string): Grid | null {
  if (token.startsWith("⟨")) {
    const row = entries(token.slice(1, -1));
    return row.every(Boolean) ? { rows: [row], angle: true } : null;
  }

  const rows = [...token.slice(1, -1).matchAll(/\[([^[\]]*)\]/g)].map((m) =>
    entries(m[1]),
  );

  if (!rows.length) return null;
  if (rows.some((row) => row.length !== rows[0].length)) return null;
  if (rows.some((row) => row.some((e) => !e))) return null;

  return { rows, angle: false };
}

/** The string split into the grids it contains and the prose between them. */
function segment(text: string): Segment[] {
  const out: Segment[] = [];
  let at = 0;

  for (const m of text.matchAll(GRID)) {
    const grid = gridOf(m[0]);
    if (!grid) continue;
    if (m.index > at) out.push({ kind: "text", text: text.slice(at, m.index) });
    out.push({ kind: "grid", ...grid });
    at = m.index + m[0].length;
  }

  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
}

// ─── Said out loud ───────────────────────────────────────

/**
 * Powers turned into the words for them, with the spacing left alone.
 *
 * "Squared" and "cubed" rather than "to the power 2", because that is what the
 * exponent is called out loud; and a minus becomes "negative", because "to the
 * power minus three" is heard as a subtraction hanging off the end of the
 * number. Whitespace is tidied once, by `spoken`, after the segments are back
 * together — doing it here would weld a matrix to the word before it.
 */
function words(text: string): string {
  return text.replace(POWER, (_match, power?: string, index?: string) => {
    if (index !== undefined) return ` sub ${bare(index)}`;

    const raw = bare(power!);
    if (raw === "2") return " squared";
    if (raw === "3") return " cubed";

    const signed = raw.startsWith("-") ? `negative ${raw.slice(1)}` : raw;
    return ` to the power ${signed}`;
  });
}

/**
 * A grid said rather than drawn: structure in words, not punctuation.
 *
 * "2 by 2 matrix, row 1: 1, 2; row 2: 3, 4" — the shape first, because a
 * listener needs to know how many numbers are coming before they start
 * arriving, then the rows in reading order. A single column is a column
 * vector and is named one; saying "2 by 1 matrix, row 1: 5; row 2: -2" is
 * true and is not how anybody says it.
 */
function saidGrid({ rows, angle }: Grid): string {
  const row = (cells: string[]) => cells.map(words).join(", ");
  const wide = rows[0].length;

  if (angle) {
    return `vector with ${wide} component${wide === 1 ? "" : "s"}: ${row(rows[0])}`;
  }

  if (wide === 1 && rows.length > 1) {
    return `column vector with ${rows.length} entries: ${row(rows.map((r) => r[0]))}`;
  }

  const said = rows.map((r, i) => `row ${i + 1}: ${row(r)}`).join("; ");
  return `${rows.length} by ${wide} matrix, ${said}`;
}

/**
 * The whole string, said.
 *
 * Segments are padded rather than joined, so a matrix never welds itself to
 * the word beside it; the doubled spaces that leaves are collapsed once at the
 * end, and the space a pad puts in front of a comma or a full stop is taken
 * back out — "row 2: 3, 4 . What is" is not a sentence.
 *
 * The last replacement is for the prompts that name the thing before showing
 * it: "the magnitude of the vector ⟨-3, 4⟩" would otherwise be read as "the
 * vector vector with 2 components", which is a stutter a listener has to stop
 * and unpick. The word is already there, so the grid drops its own copy.
 */
export function spoken(text: string): string {
  return segment(text)
    .map((s) => (s.kind === "text" ? words(s.text) : ` ${saidGrid(s)} `))
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:?!])/g, "$1")
    .replace(/\bvectors? (vector with)/gi, "$1")
    .trim();
}

// ─── Drawn ───────────────────────────────────────────────

/** Prose with its powers raised, as nodes. */
function raise(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let at = 0;

  for (const m of text.matchAll(POWER)) {
    if (m.index > at) parts.push(text.slice(at, m.index));
    parts.push(
      m[1] !== undefined ? (
        <sup key={m.index}>{bare(m[1])}</sup>
      ) : (
        <sub key={m.index}>{bare(m[2])}</sub>
      ),
    );
    at = m.index + m[0].length;
  }

  parts.push(text.slice(at));
  return parts;
}

/**
 * One side of a pair of brackets, drawn rather than typed.
 *
 * Three borders of an empty box make a `[`, and because the box is a flex item
 * on a stretch cross-axis it is exactly as tall as the rows beside it — which
 * is the whole reason not to use the `[` character, whose height is fixed at
 * one line no matter how many rows it is standing next to.
 *
 * Angle brackets are left as glyphs: every vector here is one row tall, so
 * there is nothing to scale, and a drawn `⟨` is a worse `⟨`.
 */
function Bracket({ side, angle }: { side: "left" | "right"; angle: boolean }) {
  if (angle) {
    return (
      <span aria-hidden="true" className="self-center">
        {side === "left" ? "⟨" : "⟩"}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={
        "w-[0.2em] shrink-0 border-y-[1.5px] border-current " +
        (side === "left" ? "border-l-[1.5px]" : "border-r-[1.5px]")
      }
    />
  );
}

/**
 * A matrix or vector as a grid of cells between two brackets.
 *
 * The columns are `auto`, so each one is as wide as its own widest entry and
 * no wider, and every cell is right-aligned inside its column with tabular
 * figures. That combination is what puts the digits under each other: `-9`
 * above `12` lines the `9` up with the `2` and lets the minus hang off to the
 * left, into the gap between columns, rather than shoving its own column half
 * a digit across the way a centred or left-aligned cell would.
 */
function GridView({ rows, angle }: Grid) {
  return (
    <span className="mx-[0.15em] inline-flex items-stretch align-middle">
      <Bracket side="left" angle={angle} />

      <span
        className="tnum inline-grid gap-x-[0.6em] gap-y-[0.1em] px-[0.3em] py-[0.12em]"
        style={{ gridTemplateColumns: `repeat(${rows[0].length}, auto)` }}
      >
        {rows.flatMap((row, r) =>
          row.map((entry, c) => (
            <span key={`${r}-${c}`} className="text-right">
              {raise(entry)}
            </span>
          )),
        )}
      </span>

      <Bracket side="right" angle={angle} />
    </span>
  );
}

export function MathText({ text }: { text: string }) {
  const segments = segment(text);

  // The common case: no grid, no power, and the string goes straight out.
  if (
    segments.length === 1 &&
    segments[0].kind === "text" &&
    !HAS_POWER.test(text)
  ) {
    return <>{text}</>;
  }

  return (
    <>
      <span aria-hidden="true">
        {segments.map((s, i) => (
          <Fragment key={i}>
            {s.kind === "text" ? (
              raise(s.text)
            ) : (
              <GridView rows={s.rows} angle={s.angle} />
            )}
          </Fragment>
        ))}
      </span>
      <span className="sr-only">{spoken(text)}</span>
    </>
  );
}
