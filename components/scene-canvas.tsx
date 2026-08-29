"use client";

import { useEffect, useRef } from "react";
import { hexToRgb, type RGB } from "@/lib/scene3d";

/**
 * The theme, read back out of CSS. `app/globals.css` stays the one place the
 * colours are decided — a scene that hard-coded them would drift the moment
 * a token changed.
 */
export type Palette = Record<
  | "ground"
  | "surface"
  | "surface2"
  | "line"
  | "lineSoft"
  | "ink"
  | "muted"
  | "faint"
  | "accent"
  | "accentHi"
  | "correct"
  | "out",
  RGB
>;

const TOKENS: Record<keyof Palette, string> = {
  ground: "--color-ground",
  surface: "--color-surface",
  surface2: "--color-surface-2",
  line: "--color-line",
  lineSoft: "--color-line-soft",
  ink: "--color-ink",
  muted: "--color-muted",
  faint: "--color-faint",
  accent: "--color-accent",
  accentHi: "--color-accent-hi",
  correct: "--color-correct",
  out: "--color-out",
};

/** The mono stack, with a fallback for the frames before the font lands. */
function readMono(el: Element): string {
  const value = getComputedStyle(el).getPropertyValue("--font-mono").trim();
  return value ? `${value}, ui-monospace, monospace` : "ui-monospace, monospace";
}

function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const out = {} as Palette;
  for (const key of Object.keys(TOKENS) as (keyof Palette)[]) {
    out[key] = hexToRgb(style.getPropertyValue(TOKENS[key]));
  }
  return out;
}

export type Frame = {
  w: number;
  h: number;
  /** Seconds since the scene mounted. */
  t: number;
  /** Seconds since the last frame, capped so a backgrounded tab cannot jump. */
  dt: number;
  /**
   * The viewer asked for less motion. Scenes honour it by snapping to their
   * target state instead of easing towards it, and by holding still.
   */
  reduced: boolean;
  palette: Palette;
  /** The page's own font stack, for `ctx.font`. */
  font: string;
  /** The page's mono stack. Figures on a HUD have to hold their column. */
  mono: string;
};

/**
 * Hosts a canvas and drives it: device-pixel sizing, resize, and one frame
 * loop that calls `draw`. The callback is read through a ref, so a scene can
 * close over fresh props every render without the loop being torn down and
 * restarted each time.
 */
export function SceneCanvas({
  draw,
  label,
  className,
}: {
  draw: (ctx: CanvasRenderingContext2D, frame: Frame) => void;
  /** What the scene shows, for anyone who cannot see it. */
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let palette = readPalette(canvas);
    let font = getComputedStyle(canvas).fontFamily;
    let mono = readMono(canvas);
    let w = 1;
    let h = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Two device pixels per CSS pixel is enough for flat-shaded polygons,
      // and it keeps the fill cost sane on a 3x phone.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      palette = readPalette(canvas);
      font = getComputedStyle(canvas).fontFamily;
      mono = readMono(canvas);
    };

    resize();
    // The canvas is sized by CSS, so writing its backing store here cannot
    // feed back into layout and loop.
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const start = performance.now();
    let previous = start;
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, {
        w,
        h,
        t: (now - start) / 1000,
        dt,
        reduced: motion.matches,
        palette,
        font,
        mono,
      });
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className={className}
      // Filled every frame; the browser never needs to read it back.
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

/** Centred text on a soft plate, so a label stays readable over the scene. */
export function plate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lines: { text: string; font: string; color: string }[],
  background: string,
  /** Canvas width. A label on an edge slides inwards rather than being cut. */
  within?: number,
) {
  const lineHeight = 14;
  let width = 0;
  for (const line of lines) {
    ctx.font = line.font;
    width = Math.max(width, ctx.measureText(line.text).width);
  }

  const padX = 7;
  const padY = 5;
  const boxW = width + padX * 2;
  const boxH = lines.length * lineHeight + padY * 2 - 2;

  if (within !== undefined) {
    x = Math.max(boxW / 2 + 2, Math.min(within - boxW / 2 - 2, x));
  }

  ctx.beginPath();
  ctx.roundRect(x - boxW / 2, y - boxH, boxW, boxH, 5);
  ctx.fillStyle = background;
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, i) => {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, x, y - boxH + padY + lineHeight * (i + 1) - 4);
  });
}
