import { describe, expect, it } from 'vitest';
import { cardKey, parseCards } from '@binh/rules';
import { fromArrangement, initialSlots, sortWithinChis, swap, toArrangement } from '../src/arrange/arrangeState';

const hand = parseCards('2S 9H 4D KC 6S 7H 8D 5C TS JH QD 3C AS');
const keys = (cs: { rank: number; suit: string }[]) => cs.map((c) => cardKey(c as never));

describe('arrangeState', () => {
  it('puts the highest card first in chi 1 (slot 8)', () => {
    const s = initialSlots(hand);
    expect(cardKey(s[8])).toBe('AS');
    expect(keys(s.slice(8))).toEqual(['AS', 'KC', 'QD', 'JH', 'TS']);
    expect(keys(s.slice(0, 3))).toEqual(['4D', '3C', '2S']);
  });

  it('swap exchanges two slots without mutating the input', () => {
    const s = initialSlots(hand);
    const t = swap(s, 0, 12);
    expect(t[0]).toBe(s[12]);
    expect(t[12]).toBe(s[0]);
    expect(cardKey(s[8])).toBe('AS');
    expect(s).not.toBe(t);
  });

  it('round-trips through an arrangement', () => {
    const s = initialSlots(hand);
    const a = toArrangement(s);
    expect([a.chi1.length, a.chi2.length, a.chi3.length]).toEqual([5, 5, 3]);
    expect(fromArrangement(a)).toEqual(s);
  });

  it('sorting keeps every card in its chi', () => {
    const s = swap(initialSlots(hand), 0, 9);
    for (const by of ['rank', 'suit'] as const) {
      const t = sortWithinChis(s, by);
      for (const [from, to] of [[0, 3], [3, 8], [8, 13]]) {
        expect(keys(t.slice(from, to)).sort()).toEqual(keys(s.slice(from, to)).sort());
      }
    }
  });
});
