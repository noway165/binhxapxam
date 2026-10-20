import { beforeEach, describe, expect, it } from 'vitest';
import { autoArrange, deal, mulberry32 } from '@binh/rules';
import { UsernameTakenError, type SavedGame, type Store } from '../src/store/types';

export function sampleGame(userIds: string[], scores: number[], endedAt = new Date()): SavedGame {
  const hands = deal(userIds.length, mulberry32(3));
  return {
    roomCode: 'ABC234',
    timeLimitSec: 90,
    startedAt: new Date(endedAt.getTime() - 60_000),
    endedAt,
    players: userIds.map((userId, i) => ({
      userId,
      cards: hands[i],
      arrangement: autoArrange(hands[i]),
      autoArranged: i === 0,
      foul: false,
      special: null,
      score: scores[i],
    })),
    pairs: [{ a: userIds[0], b: userIds[1], chi: [1, 1, 1], sapHam: true, net: scores[0] }],
  };
}

export function runStoreContract(name: string, make: () => Promise<Store>) {
  describe(`Store contract: ${name}`, () => {
    let store: Store;
    beforeEach(async () => {
      store = await make();
    });

    it('creates and finds users case-insensitively', async () => {
      const u = await store.createUser('Lam', 'hash');
      expect(u).toMatchObject({ username: 'Lam', passwordHash: 'hash', totalScore: 0, gamesPlayed: 0 });
      expect((await store.findUserByUsername('lAM'))?.id).toBe(u.id);
      expect((await store.findUserById(u.id))?.username).toBe('Lam');
      expect(await store.findUserByUsername('nobody')).toBeNull();
      expect(await store.findUserById('missing')).toBeNull();
    });

    it('rejects a duplicate username regardless of case', async () => {
      await store.createUser('Lam', 'hash');
      await expect(store.createUser('lam', 'hash')).rejects.toBeInstanceOf(UsernameTakenError);
    });

    it('saves a game, updates totals, lists history and leaderboard', async () => {
      const a = await store.createUser('alice', 'h');
      const b = await store.createUser('bob', 'h');
      const old = await store.saveGame(sampleGame([a.id, b.id], [-2, 2], new Date(Date.now() - 3_600_000)));
      const id = await store.saveGame(sampleGame([a.id, b.id], [6, -6]));

      expect(await store.findUserById(a.id)).toMatchObject({ totalScore: 4, gamesPlayed: 2 });
      expect(await store.findUserById(b.id)).toMatchObject({ totalScore: -4, gamesPlayed: 2 });

      const hist = await store.listGamesForUser(a.id, 50);
      expect(hist.map((g) => g.id)).toEqual([id, old]);
      expect(hist[0].myScore).toBe(6);
      expect(hist[0].players).toEqual(
        expect.arrayContaining([
          { username: 'alice', score: 6 },
          { username: 'bob', score: -6 },
        ]),
      );
      expect(await store.listGamesForUser(a.id, 1)).toHaveLength(1);

      const detail = await store.getGame(id);
      expect(detail?.pairs).toHaveLength(1);
      expect(detail?.players.find((p) => p.username === 'alice')).toMatchObject({ score: 6, autoArranged: true });
      expect(detail?.players[0].arrangement.chi1).toHaveLength(5);
      expect(await store.getGame('missing')).toBeNull();

      expect(await store.leaderboard(10)).toEqual([
        { username: 'alice', totalScore: 4, gamesPlayed: 2 },
        { username: 'bob', totalScore: -4, gamesPlayed: 2 },
      ]);
    });
  });
}
