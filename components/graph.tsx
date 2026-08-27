"use client";

import { useCallback, useId, useRef } from "react";
import type { Curve, Figure, Point } from "@/lib/questions";

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

/** Screen units per grid unit, and the two conversions. */
export function useGrid(span: number) {
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

export function Axes({ span, figure }: { span: number; figure?: Figure | null }) {
  const half = VIEW / 2;
  const unit = (half - MARGIN) / span;
  const reach = half - MARGIN;

  // Past a certain density the gridlines stop being a scale and start being a
  // texture, so a wide grid is ruled every second or fifth unit instead.
  const gap = span <= 10 ? 1 : span <= 25 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = -span; t <= span; t += gap) ticks.push(t);

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
      <text
        x={half + reach - 1}
        y={half + 4.5}
        textAnchor="end"
        className="fill-faint"
        fontSize={3.4}
      >
        {figure?.xLabel ? `${figure.xLabel} = ${span}` : span}
      </text>
      <text
        x={half + 1.5}
        y={half - reach + 3.6}
        className="fill-faint"
        fontSize={3.4}
      >
        {figure?.yLabel ? `${figure.yLabel} = ${span}` : span}
      </text>
    </g>
  );
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
  const reach = half - MARGIN;

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
  const { svg, toView } = useGrid(figure.span);

  return (
    <figure className="mb-7 flex flex-col gap-2">
      <svg
        ref={svg}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label={figure.caption ?? "The graph this question is about"}
        className="w-full max-w-[340px] rounded-sm border border-line-soft bg-surface-2/40"
      >
        <Axes span={figure.span} figure={figure} />
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
