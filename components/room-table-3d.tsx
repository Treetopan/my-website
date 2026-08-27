"use client";

import { useCallback, useRef } from "react";
import { SceneCanvas, plate, type Frame } from "@/components/scene-canvas";
import {
  boxAt,
  column,
  css,
  depthOf,
  disc,
  mix,
  project,
  render,
  type Face,
  type RGB,
  type Vec3,
} from "@/lib/scene3d";

export type TableSeat = {
  uid: string;
  displayName: string;
  isBot: boolean;
  /** Still in the game. */
  alive: boolean;
  /** Still answering this round. */
  inRound: boolean;
  correct: number;
  /**
   * Nobody has taken this seat yet — the lobby's unclaimed places. An empty
   * chair like a removed player's, but it has never been sat in rather than
   * having been vacated, which is what the label says.
   */
  empty?: boolean;
  /**
   * Overrides the line under the name. The lobby and the elimination screen
   * are describing something other than how the round is going.
   */
  status?: string;
};

const TABLE_R = 3.6;
const SEAT_R = 5.4;

/** Everything worth keeping in frame sits inside this radius of the centre. */
const SCENE_R = 7.8;

/** How far above the floor the camera looks down from. */
const ELEVATION = 0.63;

const FOV = 0.86;

/**
 * Scenery colours, outside the design tokens for the same reason the circuit's
 * are: a walnut table and a green baize mean nothing about the game, whereas
 * every token does. The accent is still reserved — it marks whose turn it is,
 * and nothing else in the room may borrow it.
 */
const WALNUT: RGB = [122, 82, 52];
const FELT: RGB = [64, 116, 92];

/**
 * A jersey each, assigned by seat so it holds all game. Deliberately clear of
 * the accent's teal: whoever is answering turns accent-coloured, and a player
 * who was already nearly that colour would blunt the one signal that matters.
 */
const JERSEYS: RGB[] = [
  [206, 96, 74],
  [232, 176, 74],
  [104, 122, 190],
  [176, 106, 168],
  [116, 158, 96],
  [214, 132, 106],
];

/**
 * The table, as a table. Three states have to be legible at a glance and they
 * are not a scale: standing (still answering), sat down (out for the round,
 * still in the game), and gone (removed for good — the chair stays, empty).
 * A list could only say those with words; a room says them with posture.
 *
 * Your own seat is rotated to the near side, so "whose turn is it" is read
 * from where the light is rather than from matching a name against your own.
 */
export function RoomTable3D({
  seats,
  turnUid,
  meUid,
  revealing,
  markedUid = null,
}: {
  /** In seat order. */
  seats: TableSeat[];
  /** Whose turn it is, or null during a reveal. */
  turnUid: string | null;
  meUid: string | null;
  revealing: boolean;
  /**
   * A seat singled out for removal — the player the round's winner is about
   * to take out of the game. Marked in `--color-out` rather than the accent,
   * because it is the same thing that colour means everywhere else.
   */
  markedUid?: string | null;
}) {
  // Figures ease between postures, so sitting down is a movement you catch
  // out of the corner of your eye rather than a swap between two frames.
  const posture = useRef(new Map<string, number>());

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, frame: Frame) => {
      const { w, h, t, dt, reduced, palette: p, font } = frame;

      const wood = mix(p.surface, WALNUT, 0.55);
      const felt = FELT;

      /* ── Room. A wash behind, and the floor. ── */
      const air = ctx.createLinearGradient(0, 0, 0, h);
      air.addColorStop(0, css(mix(p.ground, p.surface, 0.55)));
      air.addColorStop(1, css(p.ground));
      ctx.fillStyle = air;
      ctx.fillRect(0, 0, w, h);

      /* ── Camera. The aside this sits in is narrow on a laptop and short and
           wide on a phone, so the distance is solved for rather than fixed:
           back off until the table fits whichever of the two angles is the
           tighter one. Nothing gets cropped at any shape of box. ── */
      const half = Math.min(
        FOV / 2,
        Math.atan(Math.tan(FOV / 2) * (w / h)),
      );
      const distance = SCENE_R / Math.tan(half);
      const look: Vec3 = [0, 1.35, 0];
      const eye: Vec3 = [
        0,
        look[1] + Math.sin(ELEVATION) * distance,
        -Math.cos(ELEVATION) * distance,
      ];

      const faces: Face[] = [
        {
          points: [
            [-60, 0, -60],
            [60, 0, -60],
            [60, 0, 60],
            [-60, 0, 60],
          ],
          color: mix(p.ground, p.ink, 0.08),
        },
        ...column([0, 0, 0], TABLE_R, 1.15, 30, wood, mix(wood, p.ink, 0.18)),
        disc([0, 1.16, 0], TABLE_R - 0.55, 30, felt, { bias: 0.02 }),
      ];

      /* ── Seats. Yours nearest the camera, the rest clockwise from it. ── */
      const n = Math.max(1, seats.length);
      const mine = seats.findIndex((s) => s.uid === meUid);
      const step = (Math.PI * 2) / n;
      // The near side of the table is at -z, which is where the camera is.
      const start = -Math.PI / 2 - (mine === -1 ? 0 : mine) * step;

      const labels: {
        at: Vec3;
        depth: number;
        seat: TableSeat;
        turn: boolean;
      }[] = [];

      seats.forEach((seat, i) => {
        const angle = start + i * step;
        const ux = Math.cos(angle);
        const uz = Math.sin(angle);
        const x = ux * SEAT_R;
        const z = uz * SEAT_R;
        // Faces are built along +x and turned about y, so a seat's yaw is the
        // negative of its angle for it to look inwards.
        const yaw = -angle;

        const turn = seat.uid === turnUid && seat.alive && !revealing;

        // 1 standing, 0 sat down. Removed players leave the chair empty.
        const want = seat.alive && seat.inRound ? 1 : 0;
        const held = posture.current.get(seat.uid) ?? want;
        const now = reduced ? want : held + (want - held) * (1 - Math.exp(-dt * 6));
        posture.current.set(seat.uid, now);

        /* Chair. */
        const taken = seat.alive && !seat.empty;
        const chair = taken ? mix(wood, p.ink, 0.1) : mix(p.ground, p.ink, 0.05);
        faces.push(
          ...boxAt([x, 0.44, z], [1.15, 0.16, 1.05], chair, { yaw }),
          ...boxAt(
            [x + ux * 0.5, 0.86, z + uz * 0.5],
            [1.15, 0.9, 0.14],
            chair,
            { yaw },
          ),
        );

        if (!taken) {
          labels.push({ at: [x, 1.6, z], depth: 0, seat, turn: false });
          return;
        }

        /* Figure. Standing tall, or dropped and tipped back into the chair. */
        const lift = 0.42 * now;
        const bodyH = 1.05 + 0.5 * now;
        const bodyY = 0.95 + lift + (bodyH - 1.05) / 2;
        const headY = bodyY + bodyH / 2 + 0.36;

        // Whose turn it is beats whose jersey it is. Sitting down drains the
        // colour towards the floor, so the round's survivors are the only
        // bright things left standing by the end of it.
        const marked = seat.uid === markedUid;
        const jersey = JERSEYS[i % JERSEYS.length];
        const body: RGB = marked ? p.out : turn ? p.accent : jersey;
        const dim = now < 0.5 ? mix(body, p.ground, 0.5 * (1 - now)) : body;
        const skin = mix([214, 168, 132], p.surface, 0.2);

        faces.push(
          ...boxAt([x, bodyY, z], [0.92, bodyH, 0.62], dim, { yaw }),
          ...boxAt([x, headY, z], [0.56, 0.56, 0.56], skin, { yaw }),
        );

        /* A ring on the floor — whose turn it is, or who is about to be taken
           out of the game. Findable in the periphery without reading a name. */
        if (turn || marked) {
          const pulse = reduced ? 0.5 : 0.35 + 0.25 * Math.sin(t * 3.4);
          faces.push(
            disc([x, 0.02, z], 1.42, 24, marked ? p.out : p.accent, {
              flat: true,
              alpha: pulse,
              bias: 0.05,
            }),
          );
        }

        labels.push({ at: [x, headY + 0.3, z], depth: 0, seat, turn });
      });

      const basis = render(ctx, { eye, look, fov: FOV }, faces, w, h);

      /* ── Names. Drawn after the scene, far ones first, so a near label is
           never covered by somebody standing behind it. ── */
      for (const label of labels) label.depth = depthOf(basis, label.at);
      labels.sort((a, b) => b.depth - a.depth);

      for (const label of labels) {
        const at = project(basis, label.at);
        if (!at) continue;
        const { seat, turn } = label;

        const present = seat.alive && !seat.empty;
        const marked = seat.uid === markedUid;

        const status =
          seat.status ??
          (seat.empty
            ? "waiting"
            : !seat.alive
              ? "out"
              : marked
                ? "removing"
                : !seat.inRound
                  ? "sat down"
                  : turn
                    ? "answering"
                    : `${seat.correct} right`);

        // Anchored to the top of the head and lifted a fixed number of
        // pixels: a world-space gap would close up on the near seat and open
        // out on the far one, which is the opposite of what is wanted.
        plate(
          ctx,
          at[0],
          at[1] - 12,
          [
            {
              text: seat.displayName + (seat.isBot ? " ·bot" : ""),
              font: `500 12px ${font}`,
              color: css(present ? p.ink : p.faint),
            },
            {
              text: status,
              font: `11px ${font}`,
              color: css(marked ? p.out : turn ? p.accent : p.faint),
            },
          ],
          css(p.surface, 1, present ? 0.92 : 0.62),
          w,
        );
      }
    },
    [seats, turnUid, meUid, revealing, markedUid],
  );

  return (
    <SceneCanvas
      draw={draw}
      label={`The table. ${seats
        .map(
          (s) =>
            `${s.displayName}${s.isBot ? " (bot)" : ""}: ${
              s.status ??
              (s.empty
                ? "empty seat, waiting for a player"
                : !s.alive
                  ? "out of the game"
                  : s.uid === markedUid
                    ? "about to be removed from the game"
                    : !s.inRound
                      ? "sat down for the round"
                      : s.uid === turnUid
                        ? "answering now"
                        : "still answering")
            }`,
        )
        .join(". ")}.`}
    />
  );
}
