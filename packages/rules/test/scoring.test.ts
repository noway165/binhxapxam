import { describe, expect, it } from 'vitest';
import { parseCards, scoreRound } from '../src/index';
import type { PlayerInput } from '../src/index';

const P = (id: string, c1: string, c2: string, c3: string): PlayerInput => ({
  id,
  arrangement: { chi1: parseCards(c1), chi2: parseCards(c2), chi3: parseCards(c3) },
});

// Normal hands (no instant win, not fouled).
const A = P('A', 'KC KD 9H 5S 3D', '7C 7D 4H 2S 6D', 'AS 8C 3C');
const B = P('B', 'QC QD TH 5H 2D', '8D 8H 4S 3S 2C', 'KH JS 9C'); // loses chi1, wins chi2, loses chi3 vs A
const B2 = P('B2', 'QC QD TH 5H 2D', '6C 6H 4S 3S 2C', 'KH JS 9C'); // loses every chi vs A
const B4 = P('B4', 'QC QD TH 5H 2D', '6C 6H 4S 3S 2C', 'AH 8D 3H'); // ties chi3 vs A
const FOUL = P('F', 'AH 8C 8S 6S 3D', 'JC JS 4H 4S 2D', 'KC 7H 2C');
const FOUL2 = P('F2', 'AH 8C 8S 6S 3D', 'JC JS 4H 4S 2D', 'QC 7H 2C');
// 3 thùng, arranged so that chi 2 beats chi 1 (would be a foul).
const TRANG = P('T', '2H 4H 6H 8H TH', '3S 5S 7S 9S JS', '2C QC KC');
const TRANG2 = P('T2', '2D 4D 6D 8D TD', '3C 5C 7C 9C JC', '2S QS KS');

function pair(players: PlayerInput[]) {
  const r = scoreRound(players);
  expect(r.players.reduce((s, p) => s + p.score, 0)).toBe(0);
  return r;
}

describe('scoreRound — pairs of two', () => {
  it('wins 2 chi and loses 1 → +1', () => {
    const r = pair([A, B]);
    expect(r.pairs).toEqual([{ a: 'A', b: 'B', chi: [1, -1, 1], sapHam: false, net: 1 }]);
    expect(r.players.map((p) => p.score)).toEqual([1, -1]);
  });

  it('wins all 3 chi → sập hầm, +6', () => {
    const r = pair([A, B2]);
    expect(r.pairs[0]).toMatchObject({ chi: [1, 1, 1], sapHam: true, net: 6 });
  });

  it('tứ quý in chi 1 and sập hầm → (4+1+1)×2 = 12', () => {
    const r = pair([P('A', '9C 9D 9H 9S 2D', '7C 7D 4H 2S 6D', 'AS 8C 3C'), B2]);
    expect(r.pairs[0].net).toBe(12);
  });

  it('cù lũ in chi 2 is worth 2', () => {
    const a = P('A', 'AH AD AC 4D 4C', '7C 7D 5H 2S 6D', 'KS 8C 3C');
    const b = P('B', 'QC QD QH 5S 5D', 'JC JD JH 3S 3D', 'TH 9S 2C');
    const r = pair([a, b]);
    expect(r.pairs[0]).toMatchObject({ chi: [1, -1, 1], net: 0 });
  });

  it('a tied chi prevents sập hầm', () => {
    const r = pair([A, B4]);
    expect(r.pairs[0]).toMatchObject({ chi: [1, 1, 0], sapHam: false, net: 2 });
  });

  it('opponent foul → my chi values ×2', () => {
    const a = P('A', 'TC JD QH KS AD', '9C 9D 9H 2S 4D', '5C 5D 5H');
    const r = pair([a, FOUL]);
    expect(r.pairs[0]).toMatchObject({ chi: null, net: (1 + 1 + 3) * 2 });
    expect(r.players[1].foul).toBe(true);
  });

  it('both foul → 0', () => {
    expect(pair([FOUL, FOUL2]).pairs[0].net).toBe(0);
  });

  it('instant win beats a normal hand and a fouled hand by 6, and is never a foul', () => {
    const r1 = pair([TRANG, B]);
    expect(r1.pairs[0]).toMatchObject({ chi: null, net: 6 });
    expect(r1.players[0]).toMatchObject({ special: 'BA_THUNG', foul: false });
    expect(pair([FOUL, TRANG]).pairs[0].net).toBe(-6);
  });

  it('two instant wins → 0', () => {
    expect(pair([TRANG, TRANG2]).pairs[0].net).toBe(0);
  });
});

describe('scoreRound — table of four', () => {
  it('scores all 6 pairs and each score is the sum of its nets', () => {
    const r = pair([A, B, B2, B4]);
    expect(r.pairs).toHaveLength(6);
    for (const p of r.players) {
      const sum = r.pairs.reduce(
        (s, x) => s + (x.a === p.id ? x.net : x.b === p.id ? -x.net : 0),
        0,
      );
      expect(p.score).toBe(sum);
    }
  });
});
