import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANK_CHARS = '23456789TJQKA';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let r = 2; r <= 14; r++) deck.push({ rank: r as Rank, suit });
  }
  return deck;
}

function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/** Fisher–Yates shuffle; returns a new array. */
export function shuffle(cards: Card[], rng: () => number = cryptoRandom): Card[] {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function deal(numPlayers: number, rng: () => number = cryptoRandom): Card[][] {
  if (!Number.isInteger(numPlayers) || numPlayers < 2 || numPlayers > 4) {
    throw new Error(`Số người chơi phải từ 2 đến 4 (nhận ${numPlayers})`);
  }
  const deck = shuffle(createDeck(), rng);
  return Array.from({ length: numPlayers }, (_, i) => deck.slice(i * 13, i * 13 + 13));
}

/** Small seeded PRNG for deterministic tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cardKey(c: Card): string {
  return RANK_CHARS[c.rank - 2] + c.suit;
}

/** Parses "AS KH TD 2C" into cards. */
export function parseCards(s: string): Card[] {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((code) => {
      const idx = RANK_CHARS.indexOf(code[0]);
      const suit = code[1] as Suit;
      if (code.length !== 2 || idx < 0 || !SUITS.includes(suit)) {
        throw new Error(`Lá bài không hợp lệ: ${code}`);
      }
      return { rank: (idx + 2) as Rank, suit };
    });
}
