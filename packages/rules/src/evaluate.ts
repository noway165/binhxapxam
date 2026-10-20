import { Cat, type Card, type HandValue } from './types';

/** Highest card of a 5-card straight, or 0 if the ranks are not a straight. */
export function straightHigh(ranksDesc: number[]): number {
  const distinct = new Set(ranksDesc).size === ranksDesc.length;
  if (!distinct) return 0;
  if (ranksDesc[0] - ranksDesc[ranksDesc.length - 1] === ranksDesc.length - 1) return ranksDesc[0];
  // A-2-3-4-5: the ace plays low.
  if (ranksDesc.length === 5 && ranksDesc.join() === '14,5,4,3,2') return 5;
  return 0;
}

/** Evaluates a 5-card chi or a 3-card chi (3-card chi has no flush/straight). */
export function evaluate(cards: Card[]): HandValue {
  if (cards.length !== 5 && cards.length !== 3) {
    throw new Error(`Một chi phải có 3 hoặc 5 lá (nhận ${cards.length})`);
  }
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  // Groups sorted by size desc, then rank desc — this order is also the tiebreak order.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const tiebreak = groups.map(([rank]) => rank);
  const sizes = groups.map(([, n]) => n);

  if (cards.length === 3) {
    if (sizes[0] === 3) return { cat: Cat.Xam, tiebreak };
    if (sizes[0] === 2) return { cat: Cat.Doi, tiebreak };
    return { cat: Cat.MauThau, tiebreak };
  }

  const flush = cards.every((c) => c.suit === cards[0].suit);
  const high = sizes.length === 5 ? straightHigh(tiebreak) : 0;
  if (flush && high) return { cat: Cat.ThungPhaSanh, tiebreak: [high] };
  if (sizes[0] === 4) return { cat: Cat.TuQuy, tiebreak };
  if (sizes[0] === 3 && sizes[1] === 2) return { cat: Cat.CuLu, tiebreak };
  if (flush) return { cat: Cat.Thung, tiebreak };
  if (high) return { cat: Cat.Sanh, tiebreak: [high] };
  if (sizes[0] === 3) return { cat: Cat.Xam, tiebreak };
  if (sizes[0] === 2 && sizes[1] === 2) return { cat: Cat.Thu, tiebreak };
  if (sizes[0] === 2) return { cat: Cat.Doi, tiebreak };
  return { cat: Cat.MauThau, tiebreak };
}
