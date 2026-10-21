import { describe, expect, it } from 'vitest';
import { parseCards } from '@binh/rules';
import { initialSlots } from '../src/arrange/arrangeState';
import { dropSwap, slotAt } from '../src/arrange/slotAt';

const rect = (left: number, top: number) => ({ left, top, right: left + 50, bottom: top + 70 });
const rects = [rect(0, 0), rect(60, 0), rect(120, 0)];

describe('slotAt', () => {
  it('finds the slot under the point', () => {
    expect(slotAt({ x: 145, y: 35 }, rects)).toBe(2);
  });

  it('counts the edge as inside', () => {
    expect(slotAt({ x: 0, y: 10 }, rects)).toBe(0);
  });

  it('returns null in the gap between two slots (RF1)', () => {
    expect(slotAt({ x: 55, y: 35 }, rects)).toBeNull();
  });

  it('returns null outside every slot and for no slots', () => {
    expect(slotAt({ x: 500, y: 500 }, rects)).toBeNull();
    expect(slotAt({ x: 1, y: 1 }, [])).toBeNull();
  });
});

describe('dropSwap', () => {
  const slots = initialSlots(parseCards('2S 9H 4D KC 6S 7H 8D 5C TS JH QD 3C AS'));

  it('swaps the dragged card with the card it was dropped on', () => {
    const out = dropSwap(slots, 0, 12, false);
    expect(out[0]).toBe(slots[12]);
    expect(out[12]).toBe(slots[0]);
  });

  it('keeps the order when dropped outside or on itself (RF1)', () => {
    expect(dropSwap(slots, 0, null, false)).toBe(slots);
    expect(dropSwap(slots, 3, 3, false)).toBe(slots);
  });

  it('keeps the order once the hand is submitted (RF5)', () => {
    expect(dropSwap(slots, 0, 12, true)).toBe(slots);
  });
});
