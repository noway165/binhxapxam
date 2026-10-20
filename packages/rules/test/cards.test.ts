import { describe, expect, it } from 'vitest';
import { cardKey, createDeck, deal, mulberry32, parseCards } from '../src/index';

describe('createDeck', () => {
  it('has 52 distinct cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map(cardKey)).size).toBe(52);
  });
});

describe('deal', () => {
  it('deals 13 distinct cards to each of 4 players', () => {
    const hands = deal(4, mulberry32(1));
    expect(hands).toHaveLength(4);
    for (const h of hands) expect(h).toHaveLength(13);
    expect(new Set(hands.flat().map(cardKey)).size).toBe(52);
  });

  it('rejects fewer than 2 or more than 4 players', () => {
    expect(() => deal(1)).toThrow();
    expect(() => deal(5)).toThrow();
  });

  it('is deterministic for the same seed', () => {
    expect(deal(3, mulberry32(42))).toEqual(deal(3, mulberry32(42)));
  });
});

describe('parseCards', () => {
  it('parses rank and suit codes', () => {
    expect(parseCards('AS TD 2C')).toEqual([
      { rank: 14, suit: 'S' },
      { rank: 10, suit: 'D' },
      { rank: 2, suit: 'C' },
    ]);
  });
});
