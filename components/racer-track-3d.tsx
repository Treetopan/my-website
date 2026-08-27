"use client";

import { useCallback, useRef } from "react";
import { SceneCanvas, type Frame } from "@/components/scene-canvas";
import {
  boxAt,
  css,
  mix,
  quad,
  render,
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
 * cannot use one long quad for a surface. Twenty-eight of them reaches the
 * haze; past that the segments are thinner than a pixel.
 */
const SEG = 8;
const SEGMENTS = 28;

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
const KERB_RED: RGB = [193, 60, 52];
const KERB_PALE: RGB = [238, 236, 230];
const WALL: RGB = [236, 234, 228];
const WALL_PANEL: RGB = [64, 112, 154];
const STAND: RGB = [150, 148, 152];
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
 * The camera rides behind whoever is *last*, pulling back rather than
 * abandoning them, up to the point where the leader would be too far off to
 * read. The gap is something you see rather than something you work out from
 * two bar widths.
 */
export function Track3D({
  you,
  bot,
  length,
  over,
}: {
  you: number;
  bot: number;
  /** Questions in the race. Two lengths each is the maximum, so that is the finish. */
  length: number;
  over: boolean;
}) {
  // Distances arrive in steps, one per answer. The scene eases towards them
  // so a gain reads as the car pulling away rather than teleporting.
  const shown = useRef({ you: 0, bot: 0, primed: false });

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, frame: Frame) => {
      const { w, h, t, dt, reduced, palette: p } = frame;
      const s = shown.current;

      if (reduced || !s.primed) {
        s.you = you;
        s.bot = bot;
        s.primed = true;
      } else {
        const k = 1 - Math.exp(-dt * 3.2);
        s.you += (you - s.you) * k;
        s.bot += (bot - s.bot) * k;
      }

      /* ── Sky ── */
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, css(SKY_HIGH));
      sky.addColorStop(1, css(SKY_LOW));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      /* ── Camera ── */
      const leadZ = Math.max(s.you, s.bot) * UNIT;
      const trailZ = Math.min(s.you, s.bot) * UNIT;
      const camZ = Math.max(trailZ - 7.5, leadZ - 26);
      const eye = on(camZ, 0, 4.3);
      const look = on(camZ + 13, 0, 1.1);

      const faces: Face[] = [];

      /* ── Infield. One quad: nothing is ever further away than it is. ── */
      faces.push(
        quad(
          [-500, -0.06, camZ - 60],
          [500, -0.06, camZ - 60],
          [500, -0.06, camZ + 800],
          [-500, -0.06, camZ + 800],
          GRASS,
        ),
      );

      const first = Math.floor((camZ - 16) / SEG) * SEG;

      for (let i = 0; i < SEGMENTS; i++) {
        const z0 = first + i * SEG;
        const z1 = z0 + SEG;
        const step = Math.round(z0 / SEG);

        /* Racing surface, and the run-off either side of it. */
        faces.push(
          quad(
            on(z0, -HALF, 0),
            on(z0, HALF, 0),
            on(z1, HALF, 0),
            on(z1, -HALF, 0),
            step % 2 ? ASPHALT : mix(ASPHALT, [255, 255, 255], 0.04),
          ),
        );

        for (const side of [-1, 1]) {
          faces.push(
            quad(
              on(z0, side * (HALF + 0.95), -0.02),
              on(z0, side * (HALF + 3.4), -0.02),
              on(z1, side * (HALF + 3.4), -0.02),
              on(z1, side * (HALF + 0.95), -0.02),
              RUNOFF,
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
          if (step % 2 === 0) {
            faces.push(
              ...boxAt(
                on(z0 + 3, side * (HALF + 2.4), 0.42),
                [1.5, 0.84, 1.5],
                TYRE,
                { yaw: heading(z0 + 3) },
              ),
            );
          }
        }

        /* Grandstands, alternating sides, and only near enough to be worth
           the faces they cost. */
        // Not too near, for the same reason: a stand alongside the camera is
        // in the stretched part of the frame, one well ahead is not.
        if (i >= 6 && i < 22 && step % 3 === 0) {
          const side = step % 6 === 0 ? 1 : -1;
          faces.push(...grandstand(z0, side, step));
        }
      }

      /* ── The finish. Two lengths per question is the most anyone can
           score, so it never has to move mid-race. ── */
      const finishZ = Math.max(1, length) * 2 * UNIT;
      if (finishZ > camZ - 4 && finishZ < camZ + 220) {
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

      /* ── The cars ── */
      const bob = (phase: number) =>
        reduced || over ? 0 : Math.sin(t * 9 + phase) * 0.035;

      faces.push(
        ...car(s.bot * UNIT, -LANE, RIVAL, KERB_PALE, false, bob(1.7)),
        ...car(s.you * UNIT, LANE, p.accent, [246, 244, 236], true, bob(0)),
      );

      render(ctx, { eye, look, fov: 0.78 }, faces, w, h);
    },
    [you, bot, length, over],
  );

  const gap = you - bot;

  return (
    <SceneCanvas
      draw={draw}
      label={
        over
          ? `Race over. You ${you.toFixed(1)} lengths, rival ${bot.toFixed(1)}.`
          : `Circuit. You ${you.toFixed(1)} lengths, rival ${bot.toFixed(1)} — ${
              gap === 0
                ? "level"
                : gap > 0
                  ? `you lead by ${gap.toFixed(1)}`
                  : `behind by ${Math.abs(gap).toFixed(1)}`
            }.`
      }
    />
  );
}

/** A stand of spectators: raked deck, roof, and a crowd on it. */
function grandstand(z: number, side: number, step: number): Face[] {
  // Set well back from the barrier. Close to the track puts a five-metre wall
  // out at the edge of a very wide field of view, where the projection
  // stretches it into a slab; back here it stays in the middle of the frame.
  const inner = side * (HALF + 6.5);
  const outer = side * (HALF + 16);
  const mid = inner + (outer - inner) * 0.45;
  const back = z + 8;
  const roof = ROOFS[step % ROOFS.length];

  const faces: Face[] = [
    // The raked deck, low at the front and high at the back.
    quad(
      on(z, inner, 1.1),
      on(back, inner, 1.1),
      on(back, outer, 4.3),
      on(z, outer, 4.3),
      mix(STAND, [0, 0, 0], 0.1),
    ),
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

  // The crowd. One flat quad each, biased forward so the deck cannot paint
  // over the rows sitting on it.
  for (let row = 0; row < 3; row++) {
    for (let seat = 0; seat < 6; seat++) {
      const along = z + 1 + seat * 1.2 + noise(step + row, seat) * 0.35;
      // Fractions of the way up the rake, all of which must stay inside it —
      // past 1 the row lifts off the back of the stand and sits in the air.
      const across = 0.2 + row * 0.28;
      const u = inner + (outer - inner) * across;
      const y = 1.1 + 3.2 * across + 0.24;
      const c = CROWD[Math.floor(noise(step * 3 + row, seat * 7) * CROWD.length)];

      // Facing down the circuit rather than across it. A spectator turned to
      // the track is what a spectator does and is also edge-on to a camera
      // that is *on* the track — the crowd came out as coloured slivers.
      faces.push(
        quad(
          on(along, u - 0.24, y),
          on(along, u + 0.24, y),
          on(along, u + 0.24, y + 0.46),
          on(along, u - 0.24, y + 0.46),
          c,
          { flat: true, bias: 3 },
        ),
      );
    }
  }

  return faces;
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
    // Rear wing: a plane on a single pylon.
    ...boxAt(at(-1.95, 0, tall ? 1.15 : 0.95), [0.18, 0.7, 0.3], dark, { yaw }),
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
