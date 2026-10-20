import { forEachSplitMask, pick } from './splits';
import type { Card, SpecialKind } from './types';

function rankCounts(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  return m;
}

const sameSuit = (cs: Card[]) => cs.every((c) => c.suit === cs[0].suit);

/** Consecutive distinct ranks; the ace may also play low (A-2-3, A-2-3-4-5). */
function consecutive(cs: Card[]): boolean {
  const r = cs.map((c) => c.rank).sort((a, b) => a - b);
  if (new Set(r).size !== r.length) return false;
  if (r[r.length - 1] - r[0] === r.length - 1) return true;
  if (r[r.length - 1] !== 14) return false;
  const low = [1, ...r.slice(0, -1)];
  return low[low.length - 1] - low[0] === low.length - 1;
}

function existsSplit(cards: Card[], ok: (cs: Card[]) => boolean): boolean {
  let found = false;
  forEachSplitMask((m1, m2, m3) => {
    if (ok(pick(cards, m3)) && ok(pick(cards, m1)) && ok(pick(cards, m2))) found = true;
    return found;
  });
  return found;
}

/** Instant wins, checked on all 13 cards regardless of how they were arranged. */
export function detectSpecial(cards: Card[]): SpecialKind | null {
  if (cards.length !== 13) throw new Error('Cần đúng 13 lá');
  const counts = rankCounts(cards);
  if (counts.size === 13) return 'SANH_RONG';
  let pairs = 0;
  for (const n of counts.values()) pairs += Math.floor(n / 2);
  if (pairs >= 6) return 'LUC_PHE_BON';
  if (existsSplit(cards, sameSuit)) return 'BA_THUNG';
  if (existsSplit(cards, consecutive)) return 'BA_SANH';
  return null;
}
