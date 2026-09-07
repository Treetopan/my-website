"use client";

import { useCallback, useId, useRef } from "react";
import {
  frameOf,
  type Curve,
  type Figure,
  type Frame,
  type Point,
} from "@/lib/questions";

/**
 * The coordinate grid, and the curves drawn on it.
 *
 * One module because a figure and an answer are the same picture on the two
 * spatial kinds: the parabola you are reading the inflection point off and the
 * grid you are putting the point on have to be the same grid, at the same
 * scale, or the question is about arithmetic again. `answer-inputs` draws its
 * point and line inputs on top of what is here; `question-stage` uses
 * `FigureView` to put the same drawing above the other three kinds, where the
 * graph is something to read rather than something to answer on.
 *
 * Colour carries the whole meaning here, so it is spent carefully: ink is what
 * you were given, accent is what you did, and green is what you should have
 * done. Nothing else gets a colour.
 */

export const VIEW = 100;
const MARGIN = 8;

/** The plot box: the drawing area once the margin the numbers live in is off. */
const REACH = VIEW / 2 - MARGIN;

/**
 * Screen units per grid unit, and the two conversions.
 *
 * Takes the window rather than a span, so a first-quadrant question draws
 * 0..10 and a four-quadrant one draws -10..10 off the same code. One scale
 * serves both axes — the wider of the two decides it — so the grid stays
 * square and a distance keeps meaning one thing.
 */
export function useGrid(frame: Frame) {
  const svg = useRef<SVGSVGElement>(null);
  const half = VIEW / 2;

  const { minX, maxX, minY, maxY } = frame;
  const wide = Math.max(maxX - minX, maxY - minY) || 1;
  const unit = (REACH * 2) / wide;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const toView = useCallback(
    (p: Point) => ({
      x: half + (p.x - midX) * unit,
      y: half - (p.y - midY) * unit,
    }),
    [half, midX, midY, unit],
  );

  /** Screen coordinates back to whole grid units, clamped to the window. */
  const toGrid = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const box = svg.current?.getBoundingClientRect();
      if (!box || !box.width) return null;

      const vx = ((clientX - box.left) / box.width) * VIEW;
      const vy = ((clientY - box.top) / box.height) * VIEW;

      const clamp = (n: number, low: number, high: number) =>
        Math.max(low, Math.min(high, n));

      return {
        x: clamp(Math.round((vx - half) / unit + midX), minX, maxX),
        y: clamp(Math.round((half - vy) / unit + midY), minY, maxY),
      };
    },
    [half, midX, midY, unit, minX, maxX, minY, maxY],
  );

  return { svg, toView, toGrid };
}

/**
 * How far apart the ruled lines go, and how far apart the numbers on them do.
 *
 * Past a certain density gridlines stop being a scale and become a texture,
 * and numbers stop being readable at all — so the two are chosen separately,
 * and a wide grid is ruled every fifth unit and numbered every tenth rather
 * than being given up on.
 */
function steps(wide: number): { rule: number; label: number } {
  const rule = wide <= 20 ? 1 : wide <= 50 ? 5 : 10;
  let label = rule;
  // At most a dozen numbers to an axis: any closer and "10" runs into the
  // "12" beside it at the size these are drawn.
  for (const times of [1, 2, 5, 10]) {
    label = rule * times;
    if (wide / label <= 12) break;
  }
  return { rule, label };
}

/** The multiples of `gap` between `low` and `high`, inclusive. */
function ticks(low: number, high: number, gap: number): number[] {
  const out: number[] = [];
  for (let t = Math.ceil(low / gap) * gap; t <= high + 1e-9; t += gap) {
    out.push(Math.round(t * 1000) / 1000);
  }
  return out;
}

/**
 * The ruled grid, the two axes, and the numbers on them.
 *
 * The numbers are the point. This used to label only the far corners, on the
 * reasoning that a number per gridline turns a grid into a table — true of a
 * graph you read a shape off, and exactly wrong on a skill whose whole content
 * is "count four across and seven up". There was nothing to count against.
 * Now every ruled line far enough from its neighbour to stay legible carries
 * its value, the origin says 0, and an axis with a name of its own carries
 * that at its far end.
 */
export function Axes({
  frame,
  figure,
}: {
  frame: Frame;
  figure?: Figure | null;
}) {
  const half = VIEW / 2;
  const { minX, maxX, minY, maxY } = frame;
  const wide = Math.max(maxX - minX, maxY - minY) || 1;
  const unit = (REACH * 2) / wide;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const vx = (x: number) => half + (x - midX) * unit;
  const vy = (y: number) => half - (y - midY) * unit;

  const { rule, label } = steps(wide);
  const down = ticks(minX, maxX, rule);
  const across = ticks(minY, maxY, rule);

  // Where the numbers hang. The axis carries them when it is inside the
  // window; when the window starts at the origin the axis *is* the edge and
  // they hang off it into the margin — which is what the margin is for.
  const baseY = Math.min(Math.max(0, minY), maxY);
  const baseX = Math.min(Math.max(0, minX), maxX);
  const numbered = (t: number) => Math.abs(t % label) < 1e-9;

  return (
    <g>
      {down.map((t) => (
        <line
          key={`v${t}`}
          x1={vx(t)}
          y1={vy(maxY)}
          x2={vx(t)}
          y2={vy(minY)}
          className="stroke-line-soft"
          strokeWidth={t === 0 ? 0 : 0.3}
        />
      ))}
      {across.map((t) => (
        <line
          key={`h${t}`}
          x1={vx(minX)}
          y1={vy(t)}
          x2={vx(maxX)}
          y2={vy(t)}
          className="stroke-line-soft"
          strokeWidth={t === 0 ? 0 : 0.3}
        />
      ))}

      <line
        x1={vx(minX)}
        y1={vy(baseY)}
        x2={vx(maxX)}
        y2={vy(baseY)}
        className="stroke-line"
        strokeWidth={0.6}
      />
      <line
        x1={vx(baseX)}
        y1={vy(minY)}
        x2={vx(baseX)}
        y2={vy(maxY)}
        className="stroke-line"
        strokeWidth={0.6}
      />

      {down.filter(numbered).map((t) =>
        t === 0 ? null : (
          <text
            key={`nx${t}`}
            x={vx(t)}
            y={vy(baseY) + 4.2}
            textAnchor="middle"
            className="fill-faint"
            fontSize={3.2}
          >
            {t}
          </text>
        ),
      )}
      {across.filter(numbered).map((t) =>
        t === 0 ? null : (
          <text
            key={`ny${t}`}
            x={vx(baseX) - 1.6}
            y={vy(t) + 1.2}
            textAnchor="end"
            className="fill-faint"
            fontSize={3.2}
          >
            {t}
          </text>
        ),
      )}

      {/* The origin, named once, in the corner between the two axes — and only
          where it is actually in view. */}
      {baseX === 0 && baseY === 0 && (
        <text
          x={vx(0) - 1.6}
          y={vy(0) + 4.2}
          textAnchor="end"
          className="fill-faint"
          fontSize={3.2}
        >
          0
        </text>
      )}

      {figure?.xLabel && (
        <text
          x={vx(maxX)}
          y={vy(baseY) - 1.8}
          textAnchor="end"
          className="fill-faint"
          fontSize={3.6}
          fontStyle="italic"
        >
          {figure.xLabel}
        </text>
      )}
      {figure?.yLabel && (
        <text
          x={vx(baseX) + 1.6}
          y={vy(maxY) + 3.2}
          className="fill-faint"
          fontSize={3.6}
          fontStyle="italic"
        >
          {figure.yLabel}
        </text>
      )}
    </g>
  );
}

/**
 * How a grid reads out loud.
 *
 * The whole of what a screen reader used to get from one of these was the two
 * corner numbers — "10 / 10" — which describes nothing. A student who cannot
 * see the picture needs the same three facts a sighted one takes from it at a
 * glance: what the axes run between, what is already drawn on it, and what
 * they have put there. The first two are here; the third is announced by the
 * inputs as it changes, because it is the part that moves.
 */
export function describeGrid(frame: Frame, figure?: Figure | null): string {
  const axes =
    `Coordinate grid. ${figure?.xLabel ?? "x"} runs from ${frame.minX} to ${frame.maxX}. ` +
    `${figure?.yLabel ?? "y"} runs from ${frame.minY} to ${frame.maxY}.`;

  const marks = figure?.marks?.length
    ? " Marked: " +
      figure.marks
        .map((m) => `${m.label ? m.label + " at " : ""}(${m.at.x}, ${m.at.y})`)
        .join(", ") +
      "."
    : "";

  return axes + marks + (figure?.caption ? " " + figure.caption : "");
}

/**
 * The curves and marks of a figure, in view coordinates.
 *
 * Clipped to the plot area rather than trimmed when sampled: a curve that
 * leaves the top of the grid should look like it left, and cutting the last
 * segment short at a sample point leaves a visible gap short of the edge that
 * reads as a break in the function.
 */
export function Drawn({
  figure,
  toView,
}: {
  figure: Figure;
  toView: (p: Point) => { x: number; y: number };
}) {
  const clip = useId();
  const half = VIEW / 2;
  const reach = REACH;

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect
            x={half - reach}
            y={half - reach}
            width={reach * 2}
            height={reach * 2}
          />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clip})`}>
        {figure.curves.map((curve, i) => (
          <Stroke key={i} curve={curve} toView={toView} />
        ))}
      </g>

      {figure.marks?.map((mark, i) => {
        const at = toView(mark.at);
        return (
          <g key={`mark-${i}`}>
            <circle
              cx={at.x}
              cy={at.y}
              r={1.9}
              className={mark.open ? "fill-surface stroke-ink" : "fill-ink"}
              strokeWidth={mark.open ? 0.7 : 0}
            />
            {mark.label && (
              <text
                x={at.x + 2.8}
                y={at.y - 2.2}
                className="fill-muted"
                fontSize={3.4}
              >
                {mark.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function Stroke({
  curve,
  toView,
}: {
  curve: Curve;
  toView: (p: Point) => { x: number; y: number };
}) {
  if (curve.points.length < 2) return null;

  const path = curve.points
    .map((p, i) => {
      const v = toView(p);
      return `${i === 0 ? "M" : "L"}${round(v.x)} ${round(v.y)}`;
    })
    .join(" ");

  const tone =
    curve.tone === "guide"
      ? "stroke-faint"
      : curve.tone === "second"
        ? "stroke-muted"
        : "stroke-ink";

  const end = toView(curve.points[curve.points.length - 1]);

  return (
    <g>
      <path
        d={path}
        fill="none"
        className={tone}
        strokeWidth={curve.tone === "guide" ? 0.5 : 0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={curve.dashed ? "2 1.6" : undefined}
      />
      {curve.label && (
        <text
          x={end.x + 1.6}
          y={end.y - 1.6}
          className={curve.tone === "second" ? "fill-muted" : "fill-ink"}
          fontSize={4}
          fontStyle="italic"
        >
          {curve.label}
        </text>
      )}
    </g>
  );
}

/**
 * A figure with nothing to answer on it — the graph a multiple-choice, fill or
 * slider question is asked about.
 */
export function FigureView({ figure }: { figure: Figure }) {
  const frame = frameOf(figure.span, figure.frame);
  const { svg, toView } = useGrid(frame);

  return (
    <figure className="mb-7 flex flex-col gap-2">
      <svg
        ref={svg}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label={describeGrid(frame, figure)}
        className="w-full max-w-[340px] rounded-sm border border-line-soft bg-surface-2/40"
      >
        <Axes frame={frame} figure={figure} />
        <Drawn figure={figure} toView={toView} />
      </svg>

      {figure.caption && (
        <figcaption className="max-w-[340px] text-[13px] text-muted">
          {figure.caption}
        </figcaption>
      )}
    </figure>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
