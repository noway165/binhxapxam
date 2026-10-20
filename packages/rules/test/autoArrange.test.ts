import { describe, expect, it } from 'vitest';
import { autoArrange, Cat, cardKey, deal, evaluate, isFoul, mulberry32, parseCards } from '../src/index';
import type { Card } from '../src/index';

const keys = (cs: Card[]) => cs.map(cardKey).sort();

describe('autoArrange', () => {
  it('uses exactly the given cards and never fouls (200 hands)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const hand of deal(4, mulberry32(seed))) {
        const a = autoArrange(hand);
        expect([a.chi1.length, a.chi2.length, a.chi3.length]).toEqual([5, 5, 3]);
        expect(keys([...a.chi1, ...a.chi2, ...a.chi3])).toEqual(keys(hand));
        expect(isFoul(a)).toBe(false);
      }
    }
  });

  it('puts four aces into chi 1', () => {
    const a = autoArrange(parseCards('AS AH AD AC 2S 5H 7D 9C JS 3H 8D TC QS'));
    expect(evaluate(a.chi1).cat).toBeGreaterThanOrEqual(Cat.TuQuy);
  });

  it('runs in under 200ms on average', () => {
    const hands = deal(4, mulberry32(7)).concat(deal(4, mulberry32(8)));
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) autoArrange(hands[i % hands.length]);
    expect((performance.now() - t0) / 20).toBeLessThan(200);
  });
});
