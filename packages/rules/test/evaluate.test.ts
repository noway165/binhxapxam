import { describe, expect, it } from 'vitest';
import { Cat, catName, evaluate, parseCards } from '../src/index';

const cases: [string, Cat, number[]][] = [
  ['AS KS QS JS TS', Cat.ThungPhaSanh, [14]],
  ['5H 4H 3H 2H AH', Cat.ThungPhaSanh, [5]],
  ['9C 9D 9H 9S 2D', Cat.TuQuy, [9, 2]],
  ['KC KD KH 4S 4D', Cat.CuLu, [13, 4]],
  ['2H 7H 9H JH KH', Cat.Thung, [13, 11, 9, 7, 2]],
  ['5H 4D 3S 2C AH', Cat.Sanh, [5]],
  ['TC JD QH KS AD', Cat.Sanh, [14]],
  ['QC KD AH 2S 3D', Cat.MauThau, [14, 13, 12, 3, 2]],
  ['7C 7D 7H KS 2D', Cat.Xam, [7, 13, 2]],
  ['JC JD 4H 4S AD', Cat.Thu, [11, 4, 14]],
  ['8C 8D AH 5S 3D', Cat.Doi, [8, 14, 5, 3]],
  ['QC QD QH', Cat.Xam, [12]],
  ['5C 5D KH', Cat.Doi, [5, 13]],
  ['AS KS QS', Cat.MauThau, [14, 13, 12]],
];

describe('evaluate', () => {
  it.each(cases)('%s', (input, cat, tiebreak) => {
    expect(evaluate(parseCards(input))).toEqual({ cat, tiebreak });
  });

  it('rejects hands that are not 3 or 5 cards', () => {
    expect(() => evaluate(parseCards('AS KS QS JS'))).toThrow();
  });
});

describe('catName', () => {
  it('gives Vietnamese names', () => {
    expect(catName(Cat.CuLu)).toBe('Cù lũ');
    expect(catName(Cat.ThungPhaSanh)).toBe('Thùng phá sảnh');
  });
});
