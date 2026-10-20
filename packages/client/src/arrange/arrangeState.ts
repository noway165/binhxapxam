import type { Arrangement, Card } from '@binh/rules';

/** 13 slots: 0–2 = chi 3, 3–7 = chi 2, 8–12 = chi 1. */
export type Slots = Card[];

export const CHI_RANGES = { chi3: [0, 3], chi2: [3, 8], chi1: [8, 13] } as const;

const SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 } as const;
const byRank = (a: Card, b: Card) => b.rank - a.rank || SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
const bySuit = (a: Card, b: Card) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || b.rank - a.rank;

/** Highest 5 cards into chi 1, next 5 into chi 2, lowest 3 into chi 3. */
export function initialSlots(cards: Card[]): Slots {
  const sorted = [...cards].sort(byRank);
  return [...sorted.slice(10), ...sorted.slice(5, 10), ...sorted.slice(0, 5)];
}

export function swap(s: Slots, i: number, j: number): Slots {
  const t = [...s];
  [t[i], t[j]] = [t[j], t[i]];
  return t;
}

export function toArrangement(s: Slots): Arrangement {
  return { chi1: s.slice(8, 13), chi2: s.slice(3, 8), chi3: s.slice(0, 3) };
}

export function fromArrangement(a: Arrangement): Slots {
  return [...a.chi3, ...a.chi2, ...a.chi1];
}

/** Re-orders cards inside each chi without moving any card to another chi. */
export function sortWithinChis(s: Slots, by: 'rank' | 'suit'): Slots {
  const cmp = by === 'rank' ? byRank : bySuit;
  return Object.values(CHI_RANGES).flatMap(([from, to]) => s.slice(from, to).sort(cmp));
}
