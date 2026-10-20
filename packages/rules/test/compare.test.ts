import { describe, expect, it } from 'vitest';
import { compareHands, evaluate, foulMessage, foulReason, isFoul, parseCards } from '../src/index';
import type { Arrangement } from '../src/index';

const h = (s: string) => evaluate(parseCards(s));
const arr = (c1: string, c2: string, c3: string): Arrangement => ({
  chi1: parseCards(c1),
  chi2: parseCards(c2),
  chi3: parseCards(c3),
});

describe('compareHands', () => {
  it('flush beats straight', () => {
    expect(compareHands(h('2H 7H 9H JH KH'), h('TC JD QH KS AD'))).toBeGreaterThan(0);
  });

  it('same pair is decided by kickers', () => {
    expect(compareHands(h('KC KD 9H 5S 3D'), h('KH KS 9C 5D 2D'))).toBeGreaterThan(0);
  });

  it('identical ranks in different suits tie', () => {
    expect(compareHands(h('KC KD 9H 5S 3D'), h('KH KS 9C 5D 3H'))).toBe(0);
  });

  it('A-2-3-4-5 is the smallest straight', () => {
    expect(compareHands(h('5H 4D 3S 2C AH'), h('6H 5D 4S 3C 2H'))).toBeLessThan(0);
  });

  it('compares a 5-card chi with a 3-card chi up to the shorter tiebreak', () => {
    expect(compareHands(h('KC 9D 7H 4S 3D'), h('KH 9S 8C'))).toBeLessThan(0);
    expect(compareHands(h('KC 9D 8H 4S 3D'), h('KH 9S 8C'))).toBe(0);
    expect(compareHands(h('7C 7D 7H KS 2D'), h('9C 9D 9H'))).toBeLessThan(0);
  });
});

describe('foulReason', () => {
  it('detects chi 2 stronger than chi 1', () => {
    const a = arr('8C 8D AH 5S 3D', 'JC JD 4H 4S AD', 'KC 9H 2S');
    expect(foulReason(a)).toBe('CHI2_GT_CHI1');
    expect(isFoul(a)).toBe(true);
    expect(foulMessage('CHI2_GT_CHI1')).toBe('Binh lủng: Chi 2 mạnh hơn Chi 1');
  });

  it('detects chi 3 stronger than chi 2', () => {
    const a = arr('JC JD 4H 4S AD', '8C 8D AH 5S 3D', 'QC QD 2S');
    expect(foulReason(a)).toBe('CHI3_GT_CHI2');
    expect(foulMessage('CHI3_GT_CHI2')).toBe('Binh lủng: Chi 3 mạnh hơn Chi 2');
  });

  it('accepts a valid arrangement', () => {
    expect(foulReason(arr('JC JD 4H 4S AD', 'QC QD 2S 5H 6C', '8C 7D 3H'))).toBeNull();
  });

  it('chi 2 equal to chi 3 under short comparison is not a foul', () => {
    const a = arr('AC AD 4H 4S 2D', 'KC 9D 8H 4C 3D', 'KH 9S 8C');
    expect(isFoul(a)).toBe(false);
  });
});
