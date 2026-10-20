import { randomUUID } from 'node:crypto';
import type { GameDetail, GameSummary, LeaderboardRow } from '@binh/rules';
import { UsernameTakenError, type SavedGame, type Store, type UserRecord } from './types';

/** In-memory store for tests and local development. Data is lost on restart. */
export function createMemoryStore(): Store {
  const users = new Map<string, UserRecord>();
  const games = new Map<string, SavedGame & { id: string }>();
  const byName = (name: string) =>
    [...users.values()].find((u) => u.username.toLowerCase() === name.toLowerCase()) ?? null;
  const username = (id: string) => users.get(id)?.username ?? '?';

  return {
    async createUser(name, passwordHash) {
      if (byName(name)) throw new UsernameTakenError();
      const u: UserRecord = { id: randomUUID(), username: name, passwordHash, totalScore: 0, gamesPlayed: 0 };
      users.set(u.id, u);
      return { ...u };
    },
    async findUserByUsername(name) {
      const u = byName(name);
      return u ? { ...u } : null;
    },
    async findUserById(id) {
      const u = users.get(id);
      return u ? { ...u } : null;
    },
    async saveGame(g) {
      const id = randomUUID();
      games.set(id, structuredClone({ ...g, id }));
      for (const p of g.players) {
        const u = users.get(p.userId);
        if (u) {
          u.totalScore += p.score;
          u.gamesPlayed += 1;
        }
      }
      return id;
    },
    async listGamesForUser(userId, limit): Promise<GameSummary[]> {
      return [...games.values()]
        .filter((g) => g.players.some((p) => p.userId === userId))
        .sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())
        .slice(0, limit)
        .map((g) => ({
          id: g.id,
          endedAt: g.endedAt.toISOString(),
          myScore: g.players.find((p) => p.userId === userId)!.score,
          players: g.players.map((p) => ({ username: username(p.userId), score: p.score })),
        }));
    },
    async getGame(id): Promise<GameDetail | null> {
      const g = games.get(id);
      if (!g) return null;
      return {
        id: g.id,
        endedAt: g.endedAt.toISOString(),
        pairs: g.pairs,
        players: g.players.map((p) => ({
          userId: p.userId,
          username: username(p.userId),
          arrangement: p.arrangement,
          foul: p.foul,
          special: p.special,
          autoArranged: p.autoArranged,
          score: p.score,
        })),
      };
    },
    async leaderboard(limit): Promise<LeaderboardRow[]> {
      return [...users.values()]
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, limit)
        .map(({ username, totalScore, gamesPlayed }) => ({ username, totalScore, gamesPlayed }));
    },
  };
}
