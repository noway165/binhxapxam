import { compareHands } from './compare';
import { evaluate } from './evaluate';
import { detectSpecial } from './special';
import { Cat, type Arrangement, type HandValue, type SpecialKind } from './types';

export interface PlayerInput {
  id: string;
  arrangement: Arrangement;
}

export interface PlayerOutcome {
  id: string;
  hands: [HandValue, HandValue, HandValue];
  foul: boolean;
  special: SpecialKind | null;
  score: number;
}

/** chi[i] is the sign of the comparison from a's side; null when decided by instant win or foul. net is from a's side. */
export interface PairResult {
  a: string;
  b: string;
  chi: [number, number, number] | null;
  sapHam: boolean;
  net: number;
}

export const SPECIAL_POINTS = 6;

/** Points the winner of a chi collects (spec 3.5). */
export function chiValue(chi: 1 | 2 | 3, h: HandValue): number {
  if (chi === 1) {
    if (h.cat === Cat.ThungPhaSanh) return 5;
    if (h.cat === Cat.TuQuy) return 4;
  } else if (chi === 2) {
    if (h.cat === Cat.ThungPhaSanh) return 10;
    if (h.cat === Cat.TuQuy) return 8;
    if (h.cat === Cat.CuLu) return 2;
  } else if (h.cat === Cat.Xam) {
    return 3;
  }
  return 1;
}

const allChiValue = (o: PlayerOutcome) =>
  chiValue(1, o.hands[0]) + chiValue(2, o.hands[1]) + chiValue(3, o.hands[2]);

function scorePair(a: PlayerOutcome, b: PlayerOutcome): PairResult {
  const res: PairResult = { a: a.id, b: b.id, chi: null, sapHam: false, net: 0 };
  if (a.special || b.special) {
    res.net = a.special && b.special ? 0 : a.special ? SPECIAL_POINTS : -SPECIAL_POINTS;
    return res;
  }
  if (a.foul || b.foul) {
    if (a.foul && b.foul) res.net = 0;
    else res.net = a.foul ? -allChiValue(b) * 2 : allChiValue(a) * 2;
    return res;
  }
  const chi = [0, 1, 2].map((i) => Math.sign(compareHands(a.hands[i], b.hands[i]))) as [number, number, number];
  let net = 0;
  chi.forEach((s, i) => {
    const n = (i + 1) as 1 | 2 | 3;
    if (s > 0) net += chiValue(n, a.hands[i]);
    if (s < 0) net -= chiValue(n, b.hands[i]);
  });
  const sapHam = chi.every((s) => s > 0) || chi.every((s) => s < 0);
  return { ...res, chi, sapHam, net: sapHam ? net * 2 : net };
}

export function scoreRound(players: PlayerInput[]): { players: PlayerOutcome[]; pairs: PairResult[] } {
  const outcomes: PlayerOutcome[] = players.map(({ id, arrangement: a }) => {
    const hands: [HandValue, HandValue, HandValue] = [evaluate(a.chi1), evaluate(a.chi2), evaluate(a.chi3)];
    const special = detectSpecial([...a.chi1, ...a.chi2, ...a.chi3]);
    const foul = !special && (compareHands(hands[0], hands[1]) < 0 || compareHands(hands[1], hands[2]) < 0);
    return { id, hands, foul, special, score: 0 };
  });
  const pairs: PairResult[] = [];
  for (let i = 0; i < outcomes.length; i++) {
    for (let j = i + 1; j < outcomes.length; j++) {
      const p = scorePair(outcomes[i], outcomes[j]);
      outcomes[i].score += p.net;
      outcomes[j].score -= p.net;
      pairs.push(p);
    }
  }
  return { players: outcomes, pairs };
}
