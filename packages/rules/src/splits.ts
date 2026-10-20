import type { Card } from './types';

const FULL = (1 << 13) - 1;

function popcount(x: number): number {
  let n = 0;
  for (; x; x &= x - 1) n++;
  return n;
}

/** All 13-bit masks with exactly 5 bits set (1287 of them). */
const FIVE_OF_13: number[] = [];
for (let m = 0; m <= FULL; m++) if (popcount(m) === 5) FIVE_OF_13.push(m);

/**
 * Visits every split of 13 card positions into chi1 (5) / chi2 (5) / chi3 (3)
 * as bitmasks. Return true from the callback to stop early.
 */
export function forEachSplitMask(fn: (m1: number, m2: number, m3: number) => boolean | void): void {
  for (const m1 of FIVE_OF_13) {
    const rest = FULL ^ m1;
    // Enumerate the submasks of `rest` with 5 bits.
    for (let m2 = rest; m2; m2 = (m2 - 1) & rest) {
      if (popcount(m2) !== 5) continue;
      if (fn(m1, m2, rest ^ m2) === true) return;
    }
  }
}

export function pick(cards: Card[], mask: number): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < cards.length; i++) if (mask & (1 << i)) out.push(cards[i]);
  return out;
}

/** Visits every 5-5-3 split of 13 cards. Return true from the callback to stop early. */
export function forEachSplit(
  cards: Card[],
  fn: (chi1: Card[], chi2: Card[], chi3: Card[]) => boolean | void,
): void {
  if (cards.length !== 13) throw new Error('Cần đúng 13 lá');
  forEachSplitMask((m1, m2, m3) => fn(pick(cards, m1), pick(cards, m2), pick(cards, m3)));
}
