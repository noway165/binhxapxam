import { describe, expect, it } from 'vitest';
import { detectSpecial, forEachSplit, parseCards } from '../src/index';

const p = parseCards;

describe('forEachSplit', () => {
  it('visits all 72072 splits of 13 cards into 5-5-3', () => {
    let n = 0;
    forEachSplit(p('2S 3H 4D 5C 6S 7H 8D 9C TS JH QD KC AS'), (a, b, c) => {
      expect([a.length, b.length, c.length]).toEqual([5, 5, 3]);
      n++;
    });
    expect(n).toBe(72072);
  });

  it('stops early when the callback returns true', () => {
    let n = 0;
    forEachSplit(p('2S 3H 4D 5C 6S 7H 8D 9C TS JH QD KC AS'), () => ++n === 10);
    expect(n).toBe(10);
  });
});

describe('detectSpecial', () => {
  it.each([
    ['2S 3H 4D 5C 6S 7H 8D 9C TS JH QD KC AS', 'SANH_RONG'],
    ['2S 2H 4D 4C 6S 6H 8D 8C TS TH QD QC AS', 'LUC_PHE_BON'],
    ['3S 3H 3D 4C 4S 5H 5D 6C 6S 7H 7D 8C 8S', 'LUC_PHE_BON'],
    ['9S 9H 9D 9C 2S 2H 4D 4C 6S 6H 8D 8C KS', 'LUC_PHE_BON'],
    ['2H 4H 6H 8H TH 3S 5S 7S 9S JS 2C QC KC', 'BA_THUNG'],
    ['2S 3H 4D 5C 6S 8H 9D TC JS QH QD KC AS', 'BA_SANH'],
    ['AH 2C 3S 5D 6H 7C 8S 9D TH JC QS KD 9C', 'BA_SANH'],
  ])('%s → %s', (cards, kind) => {
    expect(detectSpecial(p(cards))).toBe(kind);
  });

  it.each([
    ['9S 9H 9D 9C 2S 2H 4D 4C 6S 6H KD AC 7S'], // tứ quý + 3 đôi = 5 đôi
    ['2S 2H 5D 7C 9S JH KD 4C 6S 8H TD QC AS'],
  ])('%s → null', (cards) => {
    expect(detectSpecial(p(cards))).toBeNull();
  });
});
