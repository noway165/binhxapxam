import type { RoomPlayerView } from '@binh/rules';

export type SeatPosition = 'left' | 'top' | 'right';

const POSITIONS: Record<number, SeatPosition[]> = {
  0: [],
  1: ['top'],
  2: ['left', 'right'],
  3: ['left', 'top', 'right'],
};

/**
 * I always sit at the bottom; the others follow join order, starting with the
 * player after me, going around the table left → top → right.
 */
export function seatLayout(
  players: RoomPlayerView[],
  myId: string,
): { me: RoomPlayerView | null; others: { player: RoomPlayerView; position: SeatPosition }[] } {
  const idx = players.findIndex((p) => p.userId === myId);
  const me = idx >= 0 ? players[idx] : null;
  const others = idx >= 0 ? [...players.slice(idx + 1), ...players.slice(0, idx)] : players;
  const positions = POSITIONS[others.length] ?? POSITIONS[3];
  return { me, others: others.slice(0, 3).map((player, i) => ({ player, position: positions[i] })) };
}
