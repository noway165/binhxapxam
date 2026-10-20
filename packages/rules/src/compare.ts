import { evaluate } from './evaluate';
import type { Arrangement, HandValue } from './types';

export type FoulReason = 'CHI2_GT_CHI1' | 'CHI3_GT_CHI2';

/**
 * Positive if a is stronger, negative if weaker, 0 if equal.
 * Tiebreaks are compared only up to the shorter length, so a 5-card chi can be
 * compared with a 3-card chi when checking for a foul.
 */
export function compareHands(a: HandValue, b: HandValue): number {
  if (a.cat !== b.cat) return a.cat - b.cat;
  const n = Math.min(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < n; i++) {
    if (a.tiebreak[i] !== b.tiebreak[i]) return a.tiebreak[i] - b.tiebreak[i];
  }
  return 0;
}

export function foulReason(a: Arrangement): FoulReason | null {
  const [h1, h2, h3] = [evaluate(a.chi1), evaluate(a.chi2), evaluate(a.chi3)];
  if (compareHands(h1, h2) < 0) return 'CHI2_GT_CHI1';
  if (compareHands(h2, h3) < 0) return 'CHI3_GT_CHI2';
  return null;
}

export function isFoul(a: Arrangement): boolean {
  return foulReason(a) !== null;
}

export function foulMessage(r: FoulReason): string {
  return r === 'CHI2_GT_CHI1' ? 'Binh lủng: Chi 2 mạnh hơn Chi 1' : 'Binh lủng: Chi 3 mạnh hơn Chi 2';
}
