"use client";

import { useCallback, useRef } from "react";
import { SceneCanvas, type Frame, type Palette } from "@/components/scene-canvas";
import {
  basis,
  boxAt,
  css,
  mix,
  project,
  quad,
  render,
  unit,
  type Face,
  type RGB,
  type Vec3,
} from "@/lib/scene3d";

/** World length of one "length" of track — the unit the race is scored in. */
const UNIT = 7;

/** How far each car sits either side of the centre line. */
const LANE = 2.5;

/** Half the racing surface, kerbs excluded. */
const HALF = 5.4;

/**
 * The circuit is built in segments, near to far — a painter's-algorithm scene
 * cannot use one long quad for a surface. Thirty of them reaches the haze;
 * past that the segments are thinner than a pixel and the fog has them.
 */
const SEG = 8;
const SEGMENTS = 30;

/**
 * A ground surface sorts as if it were at its far edge rather than its middle.
 *
 * The painter's algorithm ranks a face by its average depth, so an eight-metre
 * quad of tarmac claims the depth of the point four metres in. A car standing
 * on the *back* half of that quad is therefore further away than the road it
 * is standing on, and the road paints over it — the car vanished under a grey
 * rectangle for as long as it took the segment to scroll past. Pushing the
 * surface back by half a segment puts every marking, kerb and car inside it in
 * front, and leaves the surfaces in the same order relative to one another.
 *
 * With two metres to spare, because depth is measured along the camera's axis
 * and not along z: through a corner the far corners of a quad are a couple of
 * metres off where its far edge nominally sits.
 */
const GROUND_SORT = -(SEG / 2 + 2);

/**
 * How far ahead being quicker puts you: this many lengths of track per length
 * per second of advantage, and never more than `LEAD_MAX`.
 *
 * The two cars are not separated by the integral of their speeds, which over a
 * whole race would put the quicker one several hundred metres up the road and
 * out of the frame. The lead is a *reading* of the speed gap — a nose in front
 * for a small advantage, a couple of car lengths for a commanding one — so
 * both stay on screen and which of them is quicker is legible at a glance.
 */
const LEAD_PER = 0.8;
const LEAD_MAX = 1.4;

/**
 * Scenery colours, deliberately outside the design tokens. The tokens carry
 * meaning in the UI — the accent is a live answer, `--color-out` is a wrong
 * one — and a grandstand roof means none of those things. The one exception
 * is your own car, which is the accent: on a track full of colour the thing
 * that still has to *mean* something is which of the two cars is yours.
 */
const SKY_HIGH: RGB = [138, 180, 219];
const SKY_LOW: RGB = [223, 227, 219];
const GRASS: RGB = [122, 145, 95];
const RUNOFF: RGB = [196, 172, 128];
const ASPHALT: RGB = [84, 84, 90];
const PAINT: RGB = [232, 231, 226];
const KERB_RED: RGB = [193, 60, 52];
const KERB_PALE: RGB = [238, 236, 230];
const WALL: RGB = [236, 234, 228];
const WALL_PANEL: RGB = [64, 112, 154];
const STAND: RGB = [150, 148, 152];
const TRUNK: RGB = [92, 74, 58];
const LEAF: RGB[] = [
  [74, 104, 62],
  [96, 122, 70],
  [62, 92, 66],
];
const ROOFS: RGB[] = [
  [46, 122, 136],
  [198, 122, 58],
  [88, 106, 156],
  [172, 82, 94],
];
const CROWD: RGB[] = [
  [222, 96, 84],
  [240, 196, 92],
  [96, 150, 206],
  [238, 238, 234],
  [122, 176, 122],
  [206, 122, 178],
];
const RIVAL: RGB = [188, 50, 44];
const TYRE: RGB = [38, 36, 38];

/** Where the far end of the scene dissolves. It matches the sky at the horizon. */
const HAZE: RGB = mix(SKY_LOW, SKY_HIGH, 0.16);

/** Deterministic 0–1. A crowd rolled per frame would flicker. */
function noise(a: number, b: number): number {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * The centre line, as a lateral offset from straight ahead. Two waves that
 * do not share a period, so the circuit never repeats a shape you recognise.
 *
 * Distance is still measured along z rather than along the arc. The gradient
 * peaks near 0.39, which makes the real racing line about 7% longer than the
 * number the race is scored in — not enough to see, and worth it for not
 * having to re-solve every position on the circuit against arc length.
 */
function bend(z: number): number {
  return 11 * Math.sin(z / 58) + 4.5 * Math.sin(z / 23 + 1.1);
}

function slope(z: number): number {
  return (11 / 58) * Math.cos(z / 58) + (4.5 / 23) * Math.cos(z / 23 + 1.1);
}

/** A point on the circuit: `z` along it, `u` across it, `y` above it. */
function on(z: number, u: number, y: number): Vec3 {
  const dx = slope(z);
  const norm = Math.hypot(1, dx);
  return [bend(z) + u / norm, y, z - (u * dx) / norm];
}

/** Which way the circuit is pointing, as a yaw for `boxAt`. */
function heading(z: number): number {
  return Math.atan(slope(z));
}

/**
 * The race, as a circuit. Distance along it is the same number the race is
 * scored in, so a length gained is a length of tarmac.
 *
 * Both cars start on the grid at nothing and are placed on the two speeds the
 * race is decided by — so the one in front as the finish arrives is the one
 * that takes it. The field travels at the average of the two, which is why the
 * tarmac keeps moving even through a bad patch, and whichever of them is
 * quicker sits a little way in front.
 *
 * A world unit is about a metre — the car below is 4.6 of them long, which is
 * roughly a real one — so the dial reads a speed straight off without
 * inventing a scale for it.
 *
 * The camera rides behind whoever is *last*, pulling back rather than
 * abandoning them.
 */
export function Track3D({
  speed,
  botSpeed,
  remaining,
  over,
}: {
  /** Both in metres per second. The race itself. */
  speed: number;
  botSpeed: number;
  /** Questions still to come. The finish sits two lengths ahead per question. */
  remaining: number;
  over: boolean;
}) {
  const shown = useRef({
    /** Lengths of tarmac the field has covered. */
    cruise: 0,
    /** Each car's pace, eased, so a step is swept to rather than jumped to. */
    pace: 0,
    botPace: 0,
    finish: 0,
    /** Below any real count, so the first frame always takes the branch. */
    remaining: -1,
    primed: false,
  });

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, frame: Frame) => {
      const { w, h, t, dt, reduced, palette: p, mono } = frame;
      const s = shown.current;

      // A question count that has gone *up* is a restart: a race only ever has
      // fewer questions left, and the first frame of one is drawn before the
      // server has said how many there are — easing from there would have the
      // finish line fly off down the road as the race began.
      if (!s.primed || remaining > s.remaining) {
        // Both cars back on the grid: the flag drops when the questions
        // arrive, and again on the next race.
        s.pace = 0;
        s.botPace = 0;
        s.finish = (s.cruise + 2 * remaining) * UNIT;
        s.primed = true;
      }

      s.remaining = remaining;

      /* ── Pace ──
         Both numbers are decided upstairs; the scene only sweeps to them, so
         a step is arrived at rather than jumped to. */
      const still = over || reduced;
      const k = 1 - Math.exp(-dt * 1.5);
      if (reduced) {
        s.pace = 0;
        s.botPace = 0;
      } else {
        s.pace += ((still ? 0 : speed / UNIT) - s.pace) * k;
        s.botPace += ((still ? 0 : botSpeed / UNIT) - s.botPace) * k;
        // The field travels at the average of the two, so one car falling to a
        // standstill slows the race down rather than stopping it dead.
        s.cruise += ((s.pace + s.botPace) / 2) * dt;
      }

      const lead = Math.max(
        -LEAD_MAX,
        Math.min(LEAD_MAX, (s.pace - s.botPace) * LEAD_PER),
      );
      const youAt = s.cruise + lead / 2;
      const botAt = s.cruise - lead / 2;

      /* ── Camera ── */
      const leadZ = Math.max(youAt, botAt) * UNIT;
      const trailZ = Math.min(youAt, botAt) * UNIT;
      // Far enough back that a car in its own lane is not out at the edge of
      // the frame, where a wide projection stretches it.
      const camZ = Math.max(trailZ - 11, leadZ - 28);
      const cam = {
        // High enough, and pitched shallow enough, that the car it is
        // following sits inside the frame rather than under its bottom edge.
        eye: on(camZ, 0, 5.4),
        look: on(camZ + 22, 0, 1.6),
        fov: 0.7,
        fog: { color: HAZE, near: 70, far: 240 },
      };
      const view = basis(cam, w, h);

      /* ── Sky ──
         Everything up here hangs off the horizon, which is wherever the
         ground runs out for this camera rather than a fraction of the frame
         someone guessed. */
      const flat = unit([view.fwd[0], 0, view.fwd[2]]);
      const far = project(view, [
        cam.eye[0] + flat[0] * 9000,
        0,
        cam.eye[2] + flat[2] * 9000,
      ]);
      const horizon = far ? far[1] : h * 0.78;

      // Distant scenery is too far away to move with the camera, so it moves
      // with where the camera is *pointing*: through a corner the hills sweep.
      const pan = Math.atan2(view.fwd[0], view.fwd[2]) * view.f;

      sky(ctx, w, h, horizon);
      ground(ctx, w, h, horizon);
      clouds(ctx, w, horizon, pan, reduced ? 0 : t);
      ridge(ctx, w, horizon, pan * 0.86, 0.8, mix(HAZE, [104, 118, 122], 0.5), 0);
      ridge(ctx, w, horizon, pan * 0.94, 0.45, mix(HAZE, GRASS, 0.62), 31);

      const faces: Face[] = [];
      const first = Math.floor((camZ - 8) / SEG) * SEG;

      for (let i = 0; i < SEGMENTS; i++) {
        const z0 = first + i * SEG;
        const z1 = z0 + SEG;
        const step = Math.round(z0 / SEG);

        /* Whether the car is past this stretch of scenery.

           Culling it by how far down the *segment list* it sat was what made
           the scenery flicker: the list is anchored to the camera, so a tree
           kept only from the tenth segment out vanished while it was still
           fifty metres up the road. The only thing that takes scenery off
           screen now is the car going past it, and the test is on the far end
           of a segment rather than its near end — a stand is eight metres
           long, and dropping it the moment its front edge passed took the rest
           of it out of a frame it was still in. Anything left over sits behind
           the near plane, where the renderer clips it for nothing. */
        const behind = z0 + SEG < camZ;

        /* Racing surface, and the run-off either side of it. */
        faces.push(
          quad(
            on(z0, -HALF, 0),
            on(z0, HALF, 0),
            on(z1, HALF, 0),
            on(z1, -HALF, 0),
            step % 2 ? ASPHALT : mix(ASPHALT, [255, 255, 255], 0.04),
            { bias: GROUND_SORT },
          ),
        );

        /* Centre line, dashed. It is the one marking that is the same size in
           every segment, so it is what the eye reads speed off. */
        faces.push(
          quad(
            on(z0 + 1.2, -0.16, 0.015),
            on(z0 + 1.2, 0.16, 0.015),
            on(z0 + 5.2, 0.16, 0.015),
            on(z0 + 5.2, -0.16, 0.015),
            PAINT,
            { flat: true, bias: 0.05 },
          ),
        );

        for (const side of [-1, 1]) {
          /* A solid white edge inside each kerb. */
          faces.push(
            quad(
              on(z0, side * (HALF - 0.42), 0.015),
              on(z0, side * (HALF - 0.14), 0.015),
              on(z1, side * (HALF - 0.14), 0.015),
              on(z1, side * (HALF - 0.42), 0.015),
              PAINT,
              { flat: true, bias: 0.05 },
            ),
          );

          faces.push(
            quad(
              on(z0, side * (HALF + 0.95), -0.02),
              on(z0, side * (HALF + 3.4), -0.02),
              on(z1, side * (HALF + 3.4), -0.02),
              on(z1, side * (HALF + 0.95), -0.02),
              RUNOFF,
              { bias: GROUND_SORT },
            ),
          );

          /* Kerbs. Two blocks per segment, so the stripe scrolls past at
             twice the rate of anything else and carries the speed. */
          for (const half of [0, 1]) {
            const a = z0 + half * (SEG / 2);
            const b = a + SEG / 2;
            faces.push(
              quad(
                on(a, side * HALF, 0.02),
                on(a, side * (HALF + 0.95), 0.02),
                on(b, side * (HALF + 0.95), 0.02),
                on(b, side * HALF, 0.02),
                (step + half) % 2 ? KERB_RED : KERB_PALE,
                { flat: true, bias: 0.06 },
              ),
            );
          }

          /* Barrier: the inward face only. Nobody sees the back of it. */
          faces.push(
            quad(
              on(z0, side * (HALF + 3.4), 0),
              on(z1, side * (HALF + 3.4), 0),
              on(z1, side * (HALF + 3.4), 1.15),
              on(z0, side * (HALF + 3.4), 1.15),
              step % 3 === 0 ? WALL_PANEL : WALL,
            ),
          );

          /* Tyre stacks in the run-off. Low and close, which is the one place
             the wide field of view can take detail without stretching it. */
          if (step % 2 === 0 && !behind) {
            faces.push(
              ...boxAt(
                on(z0 + 3, side * (HALF + 2.4), 0.35),
                [1.3, 0.7, 1.3],
                TYRE,
                { yaw: heading(z0 + 3) },
              ),
            );
          }
        }

        /* Grandstands and trees, alternating and paired. */
        const stand = !behind && step % 3 === 0;
        if (stand) {
          const side = step % 6 === 0 ? 1 : -1;
          faces.push(...grandstand(z0, side, step));
        }

        /* Trees fill in behind the barrier wherever a stand does not. A
           skyline is what makes a corner read as a place rather than a bend,
           and each one is three boxes. */
        if (!stand && !behind && step % 2 === 0) {
          for (const side of [-1, 1]) {
            faces.push(...tree(z0 + noise(step, side) * 6, side, step));
          }
        }
      }

      /* ── The finish. Two lengths per remaining question, so it closes in
           over the race and is crossed as the flag falls. ── */
      if (!over) {
        const line = (Math.max(youAt, botAt) + 2 * remaining) * UNIT;
        s.finish += (line - s.finish) * (1 - Math.exp(-dt * 1.2));
      }
      const finishZ = s.finish;

      if (finishZ > camZ - 4 && finishZ < camZ + 240) {
        for (let i = 0; i < 12; i++) {
          const u0 = -HALF + (i * HALF * 2) / 12;
          const u1 = u0 + (HALF * 2) / 12;
          for (const row of [0, 1]) {
            const a = finishZ + row * 1.3;
            faces.push(
              quad(
                on(a, u0, 0.03),
                on(a, u1, 0.03),
                on(a + 1.3, u1, 0.03),
                on(a + 1.3, u0, 0.03),
                (i + row) % 2 ? [26, 26, 28] : KERB_PALE,
                { flat: true, bias: 0.1 },
              ),
            );
          }
        }

        const yaw = heading(finishZ);
        for (const side of [-1, 1]) {
          faces.push(
            ...boxAt(on(finishZ, side * (HALF + 1.1), 2.6), [0.5, 5.2, 0.5], STAND, {
              yaw,
            }),
          );
        }
        faces.push(
          ...boxAt(on(finishZ, 0, 5.5), [HALF * 2 + 2.6, 1.1, 0.35], p.accent, {
            yaw,
          }),
        );
      }

      /* ── The cars ──
         The bob is the car working, and it beats faster the faster the car is
         going, so a surge shows in the chassis and not only in the gap. */
      // Scaled by speed the whole way down, so a car on the grid is still.
      const bob = (phase: number, rate: number) =>
        reduced || over ? 0 : Math.sin(t * (6 + rate * 0.9) + phase) * rate * 0.014;

      faces.push(
        ...car(botAt * UNIT, -LANE, RIVAL, KERB_PALE, false, bob(1.7, s.botPace)),
        ...car(youAt * UNIT, LANE, p.accent, [246, 244, 236], true, bob(0, s.pace)),
      );

      render(ctx, cam, faces, w, h);

      /* ── Speedometer ──
         Held back under reduced motion, where nothing is moving and a dial
         reading race pace over two parked cars would simply be untrue. */
      if (!reduced && w > 210) {
        const r = Math.max(28, Math.min(44, h * 0.27));
        gauge(
          ctx,
          w - r - 14,
          h - r - 12,
          r,
          s.pace * UNIT,
          s.botPace * UNIT,
          p,
          mono,
        );
      }
    },
    [speed, botSpeed, remaining, over],
  );

  const gap = speed - botSpeed;

  return (
    <SceneCanvas
      draw={draw}
      label={
        over
          ? `Race over. You ${speed} metres a second, rival ${botSpeed}.`
          : `Circuit. You ${speed} metres a second, rival ${botSpeed} — ${
              gap === 0
                ? "level"
                : gap > 0
                  ? `you lead by ${gap}`
                  : `behind by ${Math.abs(gap)}`
            }.`
      }
    />
  );
}

/* ── Sky ─────────────────────────────────────────────────── */

/** Deep overhead, pale at the horizon, and the haze colour where they meet. */
function sky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
) {
  const stop = Math.max(0.05, Math.min(1, horizon / h));
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, css(SKY_HIGH));
  g.addColorStop(stop * 0.6, css(mix(SKY_HIGH, SKY_LOW, 0.55)));
  g.addColorStop(stop, css(HAZE));
  g.addColorStop(1, css(HAZE));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * The infield, painted flat rather than built. One quad reaching the horizon
 * takes a single haze value from its own middle, which fogs the grass under
 * your wheels as heavily as the grass a mile away; cutting it into segments
 * puts a huge surface into the depth sort next to everything standing on it.
 * A screen-space gradient is neither: distance runs down the frame, so the
 * fade is continuous and costs one fill.
 */
function ground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizon: number,
) {
  const top = Math.max(0, Math.min(h, horizon));
  if (top >= h) return;
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, css(HAZE));
  g.addColorStop(0.1, css(mix(GRASS, HAZE, 0.74)));
  g.addColorStop(0.34, css(mix(GRASS, HAZE, 0.34)));
  g.addColorStop(1, css(GRASS));
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);
}

/** A smooth 0–1 wave with no repeat you can pick out. */
function wave(a: number): number {
  return (
    0.5 +
    0.26 * Math.sin(a * 0.0131) +
    0.15 * Math.sin(a * 0.0307 + 1.7) +
    0.09 * Math.sin(a * 0.0071 + 4.1)
  );
}

/** A range of hills along the horizon, drawn flat because it is miles away. */
function ridge(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizon: number,
  pan: number,
  height: number,
  color: RGB,
  seed: number,
) {
  ctx.beginPath();
  ctx.moveTo(0, horizon + 2);
  for (let x = 0; x <= w + 6; x += 6) {
    ctx.lineTo(x, horizon - horizon * height * 0.4 * wave(x + pan + seed * 137));
  }
  ctx.lineTo(w + 6, horizon + 2);
  ctx.closePath();
  ctx.fillStyle = css(color);
  ctx.fill();
}

/** A handful of puffs, drifting. Cheap, and the sky is dead without them. */
function clouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizon: number,
  pan: number,
  t: number,
) {
  const span = w + 320;
  ctx.fillStyle = "rgb(255 255 255 / 0.7)";

  for (let i = 0; i < 5; i++) {
    const size = 0.7 + noise(i, 3) * 0.9;
    const x = ((noise(i, 1) * span + pan * 0.55 + t * 7) % span + span) % span - 160;
    const y = horizon * (0.16 + noise(i, 2) * 0.38);

    ctx.beginPath();
    for (let puff = 0; puff < 4; puff++) {
      const dx = (puff - 1.5) * 22 * size;
      const dy = noise(i * 5 + puff, 9) * 7 - 3;
      const rx = (16 + noise(i, puff) * 13) * size;
      ctx.ellipse(x + dx, y + dy, rx, rx * 0.44, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

/* ── The dial ────────────────────────────────────────────── */

/** Top of the dial, in metres per second. Twenty questions taken reaches 40. */
const TOP_SPEED = 45;

/**
 * The speedometer. The needle is your run — nothing on the grid, two metres a
 * second up for every question taken and two back for every one missed — and
 * the mark on the rim is the rival's, which is where the race is really being
 * run. A light plate in the page's own tokens: a black-glass instrument would
 * belong to a different website.
 */
function gauge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  speed: number,
  rival: number,
  p: Palette,
  mono: string,
) {
  const START = Math.PI * 0.75;
  const SWEEP = Math.PI * 1.5;
  const angle = (v: number) =>
    START + SWEEP * Math.max(0, Math.min(1, v / TOP_SPEED));

  ctx.save();

  /* Plate. */
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = css(p.surface, 1, 0.88);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = css(p.line, 1, 0.9);
  ctx.stroke();

  /* The dial, and the last stretch of it nobody should reach. */
  ctx.lineWidth = 2;
  ctx.strokeStyle = css(p.lineSoft);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, START, START + SWEEP);
  ctx.stroke();

  ctx.strokeStyle = css(p.out, 1, 0.55);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, angle(38), START + SWEEP);
  ctx.stroke();

  /* Ticks: every 3, longer every 15. */
  for (let v = 0; v <= TOP_SPEED; v += 3) {
    const a = angle(v);
    const long = v % 15 === 0;
    const outer = r - 6;
    const inner = outer - (long ? 6 : 3);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.lineWidth = long ? 1.4 : 1;
    ctx.strokeStyle = css(long ? p.muted : p.faint, 1, long ? 0.85 : 0.6);
    ctx.stroke();
  }

  /* The rival, on the rim. */
  const ra = angle(rival);
  ctx.beginPath();
  ctx.arc(
    cx + Math.cos(ra) * (r - 2.5),
    cy + Math.sin(ra) * (r - 2.5),
    2.2,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = css(RIVAL);
  ctx.fill();

  /* The needle, counterweighted, in the colour that means "you". */
  const a = angle(speed);
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(a) * r * 0.2, cy - Math.sin(a) * r * 0.2);
  ctx.lineTo(cx + Math.cos(a) * (r - 9), cy + Math.sin(a) * (r - 9));
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = css(p.accent);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = css(p.accent);
  ctx.fill();

  /* The figure, under the hub where the dial is open anyway. */
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${Math.round(r * 0.4)}px ${mono}`;
  ctx.fillStyle = css(p.ink);
  ctx.fillText(String(Math.round(speed)), cx, cy + r * 0.46);
  ctx.font = `500 ${Math.max(7, Math.round(r * 0.18))}px ${mono}`;
  ctx.fillStyle = css(p.faint);
  ctx.fillText("m/s", cx, cy + r * 0.72);

  ctx.restore();
}

/* ── Scenery ─────────────────────────────────────────────── */

/** How many rows of seating a stand is cut into. */
const TIERS = 5;

/** A stand of spectators: terraced deck, roof, and a crowd on it. */
function grandstand(z: number, side: number, step: number): Face[] {
  // Set back beyond the run-off, far enough that a stand slides off the side
  // of the frame before the car reaches it rather than filling half of it.
  const inner = side * (HALF + 8);
  const outer = side * (HALF + 18);
  const mid = inner + (outer - inner) * 0.45;
  const back = z + 8;
  const roof = ROOFS[step % ROOFS.length];

  const faces: Face[] = [
    // Its face, so the stand is a solid thing rather than a ramp.
    quad(
      on(z, inner, 0),
      on(back, inner, 0),
      on(back, inner, 1.1),
      on(z, inner, 1.1),
      mix(STAND, [0, 0, 0], 0.22),
    ),
    // The back wall, carried up past the deck so the roof has something to
    // sit on. A roof cantilevered off nothing is what a real stand has and
    // what this camera cannot read — from track height it comes out as a
    // beam hanging in the sky.
    quad(
      on(z, outer, 0),
      on(back, outer, 0),
      on(back, outer, 5),
      on(z, outer, 5),
      roof,
    ),
    // Roof, over the back half of the rake only.
    quad(
      on(z, outer, 5),
      on(back, outer, 5),
      on(back, mid, 4.8),
      on(z, mid, 4.8),
      mix(roof, [0, 0, 0], 0.18),
    ),
    quad(
      on(z, mid, 4.8),
      on(back, mid, 4.8),
      on(back, mid, 4.6),
      on(z, mid, 4.6),
      mix(roof, [0, 0, 0], 0.32),
    ),
  ];

  // The deck, as steps rather than one raked plane. Seen from a camera that
  // sits above it, a plane is a bare grey ramp with people floating on it;
  // the treads and risers are what read as seating from the track.
  const tread = (a: number) => 1.1 + 3.2 * a;
  for (let tier = 0; tier < TIERS; tier++) {
    const a0 = tier / TIERS;
    const a1 = (tier + 1) / TIERS;
    const u0 = inner + (outer - inner) * a0;
    const u1 = inner + (outer - inner) * a1;

    faces.push(
      quad(
        on(z, u0, tread(a0)),
        on(back, u0, tread(a0)),
        on(back, u1, tread(a0)),
        on(z, u1, tread(a0)),
        mix(STAND, [0, 0, 0], 0.06 + tier * 0.03),
      ),
      quad(
        on(z, u1, tread(a0)),
        on(back, u1, tread(a0)),
        on(back, u1, tread(a1)),
        on(z, u1, tread(a1)),
        mix(STAND, [0, 0, 0], 0.26),
      ),
    );
  }

  // The crowd. One flat quad each, biased forward so the deck cannot paint
  // over the rows sitting on it.
  for (let row = 0; row < 3; row++) {
    for (let seat = 0; seat < 6; seat++) {
      const along = z + 1 + seat * 1.2 + noise(step + row, seat) * 0.35;
      // Fractions of the way up the rake, all of which must stay inside it —
      // past 1 the row lifts off the back of the stand and sits in the air.
      const across = 0.2 + row * 0.28;
      const u = inner + (outer - inner) * across;
      // Standing on a tread, not hovering part way up a riser.
      const y = tread(Math.floor(across * TIERS) / TIERS) + 0.24;
      const c = CROWD[Math.floor(noise(step * 3 + row, seat * 7) * CROWD.length)];

      faces.push(...person(along, u, y, c));
    }
  }

  return faces;
}

/**
 * A spectator: a torso with a head on it, as two ovals. At this distance a
 * person is a dozen pixels across and does not need to be more than that, but
 * a rectangle read as a coloured tile stuck to the seating rather than as
 * somebody sitting in it.
 *
 * Both face down the circuit rather than across it, which is what a spectator
 * does and is also what keeps them off edge-on to a camera that is *on* the
 * track — turned the other way the crowd came out as coloured slivers.
 */
function person(along: number, u: number, y: number, c: RGB): Face[] {
  const oval = (dy: number, rx: number, ry: number, color: RGB): Face => {
    const points: Vec3[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      points.push(on(along, u + Math.cos(a) * rx, y + dy + Math.sin(a) * ry));
    }
    // Biased hard forward: the tread they sit on spans eight metres and sorts
    // by its middle, which is otherwise in front of half of them.
    return { points, color, flat: true, bias: 3 };
  };

  return [
    oval(0.23, 0.19, 0.23, c),
    oval(0.56, 0.1, 0.12, mix(c, [240, 218, 194], 0.62)),
  ];
}

/** A tree beyond the barrier: a trunk and a canopy in two tapering blocks. */
function tree(z: number, side: number, step: number): Face[] {
  const u = side * (HALF + 13 + noise(step, side * 2) * 9);
  const tall = 3.8 + noise(step, side * 5) * 2.6;
  const leaf = LEAF[Math.floor(noise(step * 7, side) * LEAF.length)];
  const yaw = heading(z);

  return [
    ...boxAt(on(z, u, tall * 0.3), [0.36, tall * 0.6, 0.36], TRUNK, { yaw }),
    ...boxAt(on(z, u, tall * 0.68), [2.2, tall * 0.52, 2.2], leaf, { yaw }),
    ...boxAt(
      on(z, u, tall * 0.98),
      [1.35, tall * 0.34, 1.35],
      mix(leaf, [255, 255, 255], 0.1),
      { yaw },
    ),
  ];
}

/**
 * One car, open-wheel: floor, nose, both wings, an airbox and four exposed
 * wheels. The two on track differ in silhouette as well as livery — a tall
 * swan-neck rear wing and a long nose against a low one and a stubby nose —
 * so they stay apart at the far end of the circuit where colour has faded
 * into the haze.
 */
function car(
  z: number,
  u: number,
  body: RGB,
  trim: RGB,
  tall: boolean,
  bob: number,
): Face[] {
  const yaw = heading(z);
  const y = bob;
  const dark = mix(body, [0, 0, 0], 0.35);

  const at = (dz: number, du: number, dy: number) => on(z + dz, u + du, dy + y);

  const faces: Face[] = [
    // Shadow. Flat and cheap, and the car sits on the track without it.
    quad(
      on(z - 2.1, u - 1.15, 0.02),
      on(z - 2.1, u + 1.15, 0.02),
      on(z + 2.1, u + 1.15, 0.02),
      on(z + 2.1, u - 1.15, 0.02),
      [0, 0, 0],
      { flat: true, alpha: 0.16, bias: 0.05 },
    ),

    ...boxAt(at(0, 0, 0.42), [1.1, 0.34, 3.6], body, { yaw }),
    // Nose, ahead of the floor and narrower than it.
    ...boxAt(at(tall ? 2.5 : 2.25, 0, 0.5), [0.5, 0.36, tall ? 1.7 : 1.2], body, {
      yaw,
    }),
    // Front wing, wide and low.
    ...boxAt(at(tall ? 3.3 : 2.9, 0, 0.2), [2.5, 0.12, 0.75], trim, { yaw }),
    // Sidepods.
    ...boxAt(at(-0.2, 0, 0.62), [2, 0.42, 1.9], dark, { yaw }),
    // Airbox behind the driver.
    ...boxAt(at(-1.15, 0, 0.95), [0.55, 0.55, 1.1], body, { yaw }),
    // Helmet, in the cockpit.
    ...boxAt(at(-0.35, 0, 0.92), [0.42, 0.36, 0.44], trim, { yaw }),
    // Rear wing: a plane on a single pylon. The pylon reaches the floor —
    // from a camera this close it is the nearest thing on the car, and a
    // stub that stopped short read as a post hanging under the wing.
    ...boxAt(
      at(-1.95, 0, tall ? 1.02 : 0.87),
      [0.18, tall ? 0.98 : 0.7, 0.3],
      dark,
      { yaw },
    ),
    ...boxAt(at(-2.05, 0, tall ? 1.5 : 1.25), [2.1, 0.14, 0.72], trim, { yaw }),
  ];

  // Four wheels, outside the bodywork, which is the whole silhouette.
  for (const du of [-1.15, 1.15]) {
    for (const dz of [-1.35, 1.45]) {
      faces.push(...boxAt(at(dz, du, 0.44), [0.42, 0.88, 0.98], TYRE, { yaw }));
    }
  }

  return faces;
}
