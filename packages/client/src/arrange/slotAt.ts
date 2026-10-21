import { swap, type Slots } from './arrangeState';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Index of the first rect containing the point (edges included), or null. */
export function slotAt(point: { x: number; y: number }, rects: Rect[]): number | null {
  const i = rects.findIndex((r) => point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom);
  return i >= 0 ? i : null;
}

/** Result of dropping the card from `from` onto `target`: a swap, or the same slots when nothing should move. */
export function dropSwap(slots: Slots, from: number, target: number | null, locked: boolean): Slots {
  if (locked || target === null || target === from) return slots;
  return swap(slots, from, target);
}
