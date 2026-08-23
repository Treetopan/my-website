import type { RoomPlayer } from "@/lib/rtdb";

/**
 * Turn order logic for Last One Standing. Kept out of the component because
 * it is the rule of the game, not a detail of the screen — and because going
 * around a table while people drop out is exactly the sort of thing that
 * looks obvious and is wrong at the edges.
 *
 * Two states per player, and they mean different things:
 *   alive   — still in the game. Lost only by being removed by a round winner.
 *   inRound — still answering this round. Lost by getting a question wrong.
 */

export type Table = Record<string, RoomPlayer>;

/** Seat order around the table, lowest seat first. */
export function seated(players: Table): [string, RoomPlayer][] {
  return Object.entries(players).sort((a, b) => a[1].seat - b[1].seat);
}

/** Everyone still in the game. */
export function alive(players: Table) {
  return seated(players).filter(([, p]) => p.alive);
}

/** Everyone still answering this round. */
export function answering(players: Table) {
  return seated(players).filter(([, p]) => p.alive && p.inRound);
}

/**
 * The next player still answering, continuing clockwise from `fromUid`.
 * Returns null when nobody is left — including when `fromUid` was the last
 * one and has just sat down.
 */
export function nextTurn(players: Table, fromUid: string): string | null {
  const order = seated(players);
  if (order.length === 0) return null;

  const start = order.findIndex(([uid]) => uid === fromUid);
  // An unknown uid still has to produce a sane answer rather than skipping a
  // seat, so scan from the top of the table.
  const from = start === -1 ? -1 : start;

  for (let step = 1; step <= order.length; step++) {
    const [uid, p] = order[(from + step + order.length) % order.length];
    if (p.alive && p.inRound) return uid;
  }
  return null;
}

/** The round ends the moment only one player is still answering. */
export function roundWinner(players: Table): string | null {
  const left = answering(players);
  return left.length === 1 ? left[0][0] : null;
}

/** The game ends when only one player is still in it. */
export function gameWinner(players: Table): string | null {
  const left = alive(players);
  return left.length === 1 ? left[0][0] : null;
}

/** Who leads off the next round. */
export function firstSeat(players: Table): string | null {
  return alive(players)[0]?.[0] ?? null;
}
