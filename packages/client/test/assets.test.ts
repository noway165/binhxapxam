// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cardKey, createDeck } from '@binh/rules';

const pub = join(import.meta.dirname, '..', 'public');

describe('static assets', () => {
  it('has an SVG for every card and the card back', () => {
    const missing = createDeck()
      .map(cardKey)
      .filter((k) => !existsSync(join(pub, 'cards', `${k}.svg`)));
    expect(missing).toEqual([]);
    expect(existsSync(join(pub, 'cards', 'back.svg'))).toBe(true);
  });

  it('has exactly one file per sound effect', () => {
    const files = existsSync(join(pub, 'sounds')) ? readdirSync(join(pub, 'sounds')) : [];
    for (const name of ['deal', 'flip', 'place', 'win', 'fanfare', 'tick']) {
      expect(files.filter((f) => f.startsWith(`${name}.`))).toHaveLength(1);
    }
  });

  it('documents the asset licenses', () => {
    const text = readFileSync(join(pub, 'ASSETS-LICENSE.md'), 'utf8');
    expect(text).toMatch(/cards/i);
    expect(text).toMatch(/sounds/i);
  });
});
