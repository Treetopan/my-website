"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FillQuestion,
  LineQuestion,
  Point,
  PointQuestion,
  Reveal,
  SliderQuestion,
} from "@/lib/questions";

/**
 * The answer inputs for the kinds that are not multiple choice.
 *
 * Each one owns its own interaction and reports a draft upward; committing is
 * always a separate act, because unlike clicking an option these are all
 * things you adjust before you mean them. The clock submits whatever the draft
 * holds when it runs out, so a point you dragged into place but never confirmed
 * still counts.
 *
 * All four render their reveal in place rather than in a separate panel: the
 * value you chose and the value you should have chosen on the same scale, the
 * point you placed and the point you meant on the same grid. Where you went
 * wrong is a spatial fact on these questions, and describing it in words throws
 * that away.
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

// ─── The coordinate grid, shared by point and line ───────

const VIEW = 100;
const MARGIN = 8;

function useGrid(span: number) {
  const svg = useRef<SVGSVGElement>(null);
  const half = VIEW / 2;
  const unit = (half - MARGIN) / span;

  const toView = useCallback(
    (p: Point) => ({ x: half + p.x * unit, y: half - p.y * unit }),
    [half, unit],
  );

  /** Screen coordinates back to whole grid units, clamped to the grid. */
  const toGrid = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const box = svg.current?.getBoundingClientRect();
      if (!box || !box.width) return null;

      const vx = ((clientX - box.left) / box.width) * VIEW;
      const vy = ((clientY - box.top) / box.height) * VIEW;

      const clamp = (n: number) => Math.max(-span, Math.min(span, n));
      return {
        x: clamp(Math.round((vx - half) / unit)),
        y: clamp(Math.round((half - vy) / unit)),
      };
    },
    [half, span, unit],
  );

  return { svg, toView, toGrid };
}

function Axes({ span }: { span: number }) {
  const half = VIEW / 2;
  const unit = (half - MARGIN) / span;
  const ticks = Array.from({ length: span * 2 + 1 }, (_, i) => i - span);
  const reach = half - MARGIN;

  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={half + t * unit}
            y1={half - reach}
            x2={half + t * unit}
            y2={half + reach}
            className="stroke-line-soft"
            strokeWidth={t === 0 ? 0 : 0.3}
          />
          <line
            x1={half - reach}
            y1={half + t * unit}
            x2={half + reach}
            y2={half + t * unit}
            className="stroke-line-soft"
            strokeWidth={t === 0 ? 0 : 0.3}
          />
        </g>
      ))}

      <line
        x1={half - reach}
        y1={half}
        x2={half + reach}
        y2={half}
        className="stroke-line"
        strokeWidth={0.6}
      />
      <line
        x1={half}
        y1={half - reach}
        x2={half}
        y2={half + reach}
        className="stroke-line"
        strokeWidth={0.6}
      />

      {/* Only the extremes are labelled. A number on every gridline turns the
          grid into a table, and the point is to read position, not to read. */}
      <text x={half + reach - 1} y={half + 4.5} textAnchor="end" className="fill-faint" fontSize={3.4}>
        {span}
      </text>
      <text x={half + 1.5} y={half - reach + 3.6} className="fill-faint" fontSize={3.4}>
        {span}
      </text>
    </g>
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
          <Axes span={question.span} />

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
          <Axes span={span} />

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
