"use client";

import { useEffect, useRef, useState } from "react";
import type {
  FillQuestion,
  LineQuestion,
  OrderQuestion,
  Point,
  PointQuestion,
  Reveal,
  SliderQuestion,
} from "@/lib/questions";
import { Axes, Drawn, VIEW, useGrid } from "@/components/graph";

/**
 * The answer inputs for the kinds that are not multiple choice.
 *
 * Each one owns its own interaction and reports a draft upward; committing is
 * always a separate act, because unlike clicking an option these are all
 * things you adjust before you mean them. The clock submits whatever the draft
 * holds when it runs out, so a point you dragged into place but never confirmed
 * still counts.
 *
 * They all render their reveal in place rather than in a separate panel: the
 * value you chose and the value you should have chosen on the same scale, the
 * point you placed and the point you meant on the same grid, the step you put
 * third sitting third with a note beside it saying where it belonged. Where
 * you went wrong is a positional fact on these questions, and describing it in
 * words throws that away.
 */

// ─── Fill in the blank ───────────────────────────────────

export function FillAnswer({
  question,
  draft,
  locked,
  reveal,
  onDraft,
  onSubmit,
}: {
  question: FillQuestion;
  draft: string;
  locked: boolean;
  reveal: Reveal | null;
  onDraft: (text: string) => void;
  onSubmit: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const right = reveal?.kind === "fill" ? reveal.text : null;
  const missed = right !== null && draft.trim() !== right;

  useEffect(() => {
    if (!locked) input.current?.focus();
  }, [locked, question.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`box flex items-center gap-2 px-4 py-3 ${
            right === null
              ? "focus-within:border-accent"
              : missed
                ? "border-out bg-out/12"
                : "border-correct bg-correct/12"
          }`}
        >
          <input
            ref={input}
            value={draft}
            disabled={locked}
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={question.hint ?? "Your answer"}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !locked && draft.trim()) onSubmit();
            }}
            className="w-48 bg-transparent font-mono text-[18px] text-ink outline-none placeholder:text-faint disabled:cursor-default"
          />
          {question.unit && (
            <span className="shrink-0 text-[14px] text-muted">{question.unit}</span>
          )}
        </div>

        {!locked && (
          <Commit onClick={onSubmit} disabled={!draft.trim()} hint="Enter" />
        )}
      </div>

      {right !== null && missed && (
        <p className="text-[14px] text-muted">
          The answer was <span className="font-mono text-correct">{right}</span>
        </p>
      )}
    </div>
  );
}

// ─── Slider ──────────────────────────────────────────────

export function SliderAnswer({
  question,
  draft,
  locked,
  reveal,
  score,
  onDraft,
  onSubmit,
}: {
  question: SliderQuestion;
  draft: number | null;
  locked: boolean;
  reveal: Reveal | null;
  score: number | null;
  onDraft: (value: number) => void;
  onSubmit: () => void;
}) {
  const middle = (question.min + question.max) / 2;
  const value = draft ?? middle;
  const right = reveal?.kind === "slider" ? reveal.value : null;

  const fraction = (v: number) =>
    (v - question.min) / (question.max - question.min || 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[34px] leading-none tracking-tight text-ink tnum">
          {draft === null ? "—" : trim(value)}
        </span>
        {question.unit && (
          <span className="text-[15px] text-muted">{question.unit}</span>
        )}
        {right !== null && (
          <span className="ml-3 text-[14px] text-muted">
            answer <span className="font-mono text-correct">{trim(right)}</span>
          </span>
        )}
      </div>

      <div className="relative pt-1">
        {/* The answer marker sits on the same track as the handle, so how far
            out you were is a distance you can see rather than a number to
            compare against. */}
        {right !== null && (
          <div
            className="pointer-events-none absolute -top-1 h-6 w-0.5 bg-correct"
            style={{ left: `${Math.max(0, Math.min(1, fraction(right))) * 100}%` }}
          />
        )}

        <input
          type="range"
          min={question.min}
          max={question.max}
          step={question.step}
          value={value}
          disabled={locked}
          // The value is committed on release as well as on change, so a
          // student who wants the value the handle already sits on can grab it
          // and let go rather than having to move away and back.
          onChange={(e) => onDraft(Number(e.target.value))}
          onPointerUp={() => !locked && onDraft(value)}
          onKeyUp={() => !locked && onDraft(value)}
          className="range"
        />

        <div className="mt-2 flex justify-between font-mono text-[11px] text-faint tnum">
          <span>{trim(question.min)}</span>
          <span>{trim(question.max)}</span>
        </div>
      </div>

      {!locked && (
        <div>
          <Commit onClick={onSubmit} disabled={draft === null} hint="Enter" />
        </div>
      )}

      {score !== null && score > 0 && score < 1 && (
        <PartialCredit score={score} />
      )}
    </div>
  );
}

// ─── Plot a point ────────────────────────────────────────

export function PointAnswer({
  question,
  draft,
  locked,
  reveal,
  score,
  onDraft,
  onSubmit,
}: {
  question: PointQuestion;
  draft: Point | null;
  locked: boolean;
  reveal: Reveal | null;
  score: number | null;
  onDraft: (at: Point) => void;
  onSubmit: () => void;
}) {
  const { svg, toView, toGrid } = useGrid(question.span);
  const right = reveal?.kind === "point" ? reveal.at : null;

  const place = (e: React.PointerEvent) => {
    if (locked) return;
    const at = toGrid(e.clientX, e.clientY);
    if (at) onDraft(at);
  };

  const mine = draft ? toView(draft) : null;
  const theirs = right ? toView(right) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-5">
        <svg
          ref={svg}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className={`w-full max-w-[340px] touch-none rounded-sm border border-line-soft bg-surface-2/40 ${
            locked ? "" : "cursor-crosshair"
          }`}
          onPointerDown={place}
          onPointerMove={(e) => e.buttons === 1 && place(e)}
        >
          <Axes span={question.span} figure={question.figure} />

          {/* The figure goes down before the answer markers: what you were
              given sits under what you did, never over it. */}
          {question.figure && <Drawn figure={question.figure} toView={toView} />}

          {/* Drawn before the student's marker so theirs stays on top when the
              two land close together. */}
          {theirs && (
            <g>
              <circle cx={theirs.x} cy={theirs.y} r={2.6} className="fill-correct" />
              <circle
                cx={theirs.x}
                cy={theirs.y}
                r={5}
                className="fill-none stroke-correct"
                strokeWidth={0.5}
                opacity={0.6}
              />
            </g>
          )}

          {mine && (
            <circle
              cx={mine.x}
              cy={mine.y}
              r={2.2}
              className={right === null ? "fill-accent" : "fill-out"}
            />
          )}

          {/* The gap between the two, said as a line rather than a number. */}
          {mine && theirs && (
            <line
              x1={mine.x}
              y1={mine.y}
              x2={theirs.x}
              y2={theirs.y}
              className="stroke-out"
              strokeWidth={0.5}
              strokeDasharray="1.5 1.5"
            />
          )}
        </svg>

        <div className="flex flex-col gap-3">
          {question.figure?.caption && (
            <p className="max-w-[200px] text-[13px] text-muted">
              {question.figure.caption}
            </p>
          )}
          <p className="font-mono text-[15px] text-ink tnum">
            {draft ? `(${draft.x}, ${draft.y})` : "Tap the grid"}
          </p>
          {right && (
            <p className="font-mono text-[13px] text-muted tnum">
              answer <span className="text-correct">{`(${right.x}, ${right.y})`}</span>
            </p>
          )}
          {!locked && <Commit onClick={onSubmit} disabled={!draft} hint="Enter" />}
        </div>
      </div>

      {score !== null && score > 0 && score < 1 && <PartialCredit score={score} />}
    </div>
  );
}

// ─── Draw a line ─────────────────────────────────────────

export function LineAnswer({
  question,
  draft,
  locked,
  reveal,
  score,
  onDraft,
  onSubmit,
}: {
  question: LineQuestion;
  draft: [Point, Point] | null;
  locked: boolean;
  reveal: Reveal | null;
  score: number | null;
  onDraft: (through: [Point, Point]) => void;
  onSubmit: () => void;
}) {
  const span = question.span;
  const { svg, toView, toGrid } = useGrid(span);
  const [dragging, setDragging] = useState<0 | 1 | null>(null);

  // Starts as a flat line through the origin, so there is always something on
  // the grid to move. An empty grid makes the first interaction a guess about
  // what the control even is.
  const through: [Point, Point] = draft ?? [
    { x: -Math.round(span / 2), y: 0 },
    { x: Math.round(span / 2), y: 0 },
  ];

  const right =
    reveal?.kind === "line" ? { slope: reveal.slope, intercept: reveal.intercept } : null;

  const move = (e: React.PointerEvent) => {
    if (locked || dragging === null) return;
    const at = toGrid(e.clientX, e.clientY);
    if (!at) return;

    const next: [Point, Point] = [...through] as [Point, Point];
    next[dragging] = at;
    // Two handles on the same x describe no line at all, so the drag simply
    // does not go there rather than producing an ungradeable answer.
    if (next[0].x === next[1].x) return;
    onDraft(next);
  };

  const a = toView(through[0]);
  const b = toView(through[1]);
  const edge = extend(through, span, toView);
  const answerEdge = right
    ? extend(
        [
          { x: -span, y: right.slope * -span + right.intercept },
          { x: span, y: right.slope * span + right.intercept },
        ],
        span,
        toView,
      )
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-5">
        <svg
          ref={svg}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          className="w-full max-w-[340px] touch-none rounded-sm border border-line-soft bg-surface-2/40"
          onPointerMove={move}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
        >
          <Axes span={span} figure={question.figure} />

          {question.figure && <Drawn figure={question.figure} toView={toView} />}

          {answerEdge && (
            <line
              x1={answerEdge.from.x}
              y1={answerEdge.from.y}
              x2={answerEdge.to.x}
              y2={answerEdge.to.y}
              className="stroke-correct"
              strokeWidth={0.9}
            />
          )}

          <line
            x1={edge.from.x}
            y1={edge.from.y}
            x2={edge.to.x}
            y2={edge.to.y}
            className={right === null ? "stroke-accent" : "stroke-out"}
            strokeWidth={0.9}
            strokeDasharray={right === null ? undefined : "2 1.5"}
          />

          {!locked &&
            [a, b].map((handle, i) => (
              <circle
                key={i}
                cx={handle.x}
                cy={handle.y}
                r={3}
                className="cursor-grab fill-accent"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDragging(i as 0 | 1);
                }}
              />
            ))}
        </svg>

        <div className="flex flex-col gap-3">
          {question.figure?.caption && (
            <p className="max-w-[200px] text-[13px] text-muted">
              {question.figure.caption}
            </p>
          )}
          <p className="font-mono text-[15px] text-ink tnum">{describe(through)}</p>
          {right && (
            <p className="font-mono text-[13px] text-muted tnum">
              answer{" "}
              <span className="text-correct">
                {`y = ${trim(right.slope)}x ${right.intercept < 0 ? "−" : "+"} ${trim(Math.abs(right.intercept))}`}
              </span>
            </p>
          )}
          {!locked && (
            <Commit onClick={onSubmit} disabled={false} hint="Drag the handles" />
          )}
        </div>
      </div>

      {score !== null && score > 0 && score < 1 && <PartialCredit score={score} />}
    </div>
  );
}

/** Runs the line out to both edges of the grid, so it reads as a line. */
function extend(
  through: [Point, Point],
  span: number,
  toView: (p: Point) => { x: number; y: number },
) {
  const slope = (through[1].y - through[0].y) / (through[1].x - through[0].x);
  const intercept = through[0].y - slope * through[0].x;
  return {
    from: toView({ x: -span, y: slope * -span + intercept }),
    to: toView({ x: span, y: slope * span + intercept }),
  };
}

function describe(through: [Point, Point]): string {
  const slope = (through[1].y - through[0].y) / (through[1].x - through[0].x);
  const intercept = through[0].y - slope * through[0].x;
  if (!Number.isFinite(slope)) return "Not a function";
  return `y = ${trim(slope)}x ${intercept < 0 ? "−" : "+"} ${trim(Math.abs(intercept))}`;
}

// ─── Shared bits ─────────────────────────────────────────

// ─── Put the steps in order ──────────────────────────────

/**
 * Reorder a list of steps, by dragging them.
 *
 * The drag is by the handle rather than by the whole row, which is what keeps
 * it off the page scroll: `touch-action: none` on a whole list would mean a
 * phone could not scroll past the question. Rows reorder as the pointer
 * crosses them rather than following it as a floating copy — the row you are
 * moving is always the row under your finger, so there is nothing to drop and
 * nothing to drop in the wrong place.
 *
 * The handle is also a button, so the arrangement is still reachable from a
 * keyboard: focus one and the arrow keys move that step a place at a time.
 *
 * The draft stays null until something is actually moved, which is what tells
 * an untouched question from an answered one. Nothing is given away by showing
 * the scramble, because the scramble is never the answer.
 */
export function OrderAnswer({
  question,
  draft,
  locked,
  reveal,
  onDraft,
  onSubmit,
}: {
  question: OrderQuestion;
  draft: number[] | null;
  locked: boolean;
  reveal: Reveal | null;
  onDraft: (order: number[]) => void;
  onSubmit: () => void;
}) {
  // The items arrive already scrambled, so the untouched arrangement is simply
  // the order they are listed in.
  const arrangement = draft ?? question.items.map((_, i) => i);
  const right = reveal?.kind === "order" ? reveal.order : null;

  const listRef = useRef<HTMLOListElement>(null);
  /** The step currently under a finger, for the lift it is drawn with. */
  const [held, setHeld] = useState<number | null>(null);

  function move(at: number, by: number) {
    const to = at + by;
    if (to < 0 || to >= arrangement.length) return;
    const next = [...arrangement];
    [next[at], next[to]] = [next[to], next[at]];
    onDraft(next);
  }

  /**
   * Put `item` wherever the pointer is. Reading the rows back out of the DOM
   * rather than assuming a row height: a step long enough to wrap is taller
   * than the rest, and a guessed height would swap the wrong pair.
   */
  function dragTo(item: number, y: number) {
    const rows = listRef.current?.children;
    if (!rows) return;

    let to = -1;
    for (let i = 0; i < rows.length; i++) {
      const box = rows[i].getBoundingClientRect();
      if (y >= box.top && y <= box.bottom) {
        to = i;
        break;
      }
    }

    const from = arrangement.indexOf(item);
    if (to < 0 || to === from) return;

    const next = [...arrangement];
    next.splice(from, 1);
    next.splice(to, 0, item);
    onDraft(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <ol ref={listRef} className="flex flex-col gap-2">
        {arrangement.map((item, at) => {
          const belongs = right ? right.indexOf(item) : -1;
          const placed = right !== null && belongs === at;

          let tone = "box";
          if (right !== null) {
            tone = placed
              ? "box border-correct bg-correct/12"
              : "box border-out bg-out/12";
          } else if (held === item) {
            tone = "box border-accent bg-surface-2";
          }

          return (
            <li
              key={item}
              className={"flex items-stretch gap-3 px-3 py-2.5 " + tone}
            >
              <span className="flex w-6 shrink-0 items-center justify-center font-mono text-[13px] text-faint tnum">
                {at + 1}
              </span>

              <span className="flex-1 self-center text-[15px] leading-snug">
                {question.items[item]}
              </span>

              {/* After the reveal the arrows give way to where the step
                  actually belonged, which is all there is left to say. */}
              {right !== null ? (
                <span
                  className={
                    "flex shrink-0 items-center font-mono text-[11px] tnum " +
                    (placed ? "text-correct" : "text-out")
                  }
                >
                  {placed ? "correct" : "belongs at " + (belongs + 1)}
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={
                    "Move step " +
                    (at + 1) +
                    ", " +
                    question.items[item] +
                    ". Drag, or use the arrow keys."
                  }
                  disabled={locked}
                  // `touch-action: none` only here, so the list still scrolls.
                  className={
                    "flex w-9 shrink-0 touch-none items-center justify-center " +
                    "rounded-sm text-[15px] leading-none text-faint select-none " +
                    "transition-colors hover:bg-surface-2 hover:text-muted " +
                    "disabled:cursor-default disabled:opacity-40 " +
                    (held === item ? "cursor-grabbing text-ink" : "cursor-grab")
                  }
                  onPointerDown={(e) => {
                    if (locked) return;
                    // Stops the press selecting the text of the row instead.
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setHeld(item);
                  }}
                  onPointerMove={(e) => {
                    if (held === item) dragTo(item, e.clientY);
                  }}
                  onPointerUp={() => setHeld(null)}
                  onPointerCancel={() => setHeld(null)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      move(at, -1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      move(at, 1);
                    }
                  }}
                >
                  ⠿
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {!locked && (
        <Commit
          onClick={onSubmit}
          disabled={draft === null}
          hint="Drag a handle to reorder · ↑ ↓ move a focused one"
        />
      )}
    </div>
  );
}

function Commit({
  onClick,
  disabled,
  hint,
}: {
  onClick: () => void;
  disabled: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-sm bg-accent px-5 py-2.5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-hi disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-faint"
      >
        Answer
      </button>
      <span className="font-mono text-[11px] text-faint">{hint}</span>
    </div>
  );
}

/**
 * Says what a part-marked answer earned. Shown only between 0 and 1, because
 * on an exact question a percentage would just be a slower way of saying right
 * or wrong.
 */
function PartialCredit({ score }: { score: number }) {
  return (
    <p className="text-[13px] text-muted">
      Close —{" "}
      <span className="font-mono text-ink tnum">{Math.round(score * 100)}%</span>{" "}
      of the marks
    </p>
  );
}

/** Drops the float dust a 0.1 step leaves behind. */
function trim(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}
