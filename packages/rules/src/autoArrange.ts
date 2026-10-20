import { compareHands } from './compare';
import { evaluate } from './evaluate';
import { forEachSplitMask, pick } from './splits';
import type { Arrangement, Card, HandValue } from './types';

/**
 * Best non-foul arrangement: highest sum of the three categories, ties broken by
 * the stronger chi 1, then chi 2, then chi 3.
 */
export function autoArrange(cards: Card[]): Arrangement {
  if (cards.length !== 13) throw new Error('Cần đúng 13 lá');
  const cache = new Array<HandValue | undefined>(1 << 13);
  const ev = (m: number) => (cache[m] ??= evaluate(pick(cards, m)));

  let best: { m: [number, number, number]; h: HandValue[]; sum: number } | null = null;
  forEachSplitMask((m1, m2, m3) => {
    const h = [ev(m1), ev(m2), ev(m3)];
    if (compareHands(h[0], h[1]) < 0 || compareHands(h[1], h[2]) < 0) return;
    const sum = h[0].cat + h[1].cat + h[2].cat;
    if (best) {
      if (sum < best.sum) return;
      if (sum === best.sum) {
        let c = 0;
        for (let i = 0; i < 3 && c === 0; i++) c = compareHands(h[i], best.h[i]);
        if (c <= 0) return;
      }
    }
    best = { m: [m1, m2, m3], h, sum };
  });
  // A non-foul split always exists (e.g. the strongest possible chi 1 first).
  const m = best!.m;
  return { chi1: pick(cards, m[0]), chi2: pick(cards, m[1]), chi3: pick(cards, m[2]) };
}
