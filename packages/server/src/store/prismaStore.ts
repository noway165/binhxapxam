import { PrismaPg } from '@prisma/adapter-pg';
import type { Arrangement, Card, GameDetail, PairResult, SpecialKind } from '@binh/rules';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { UsernameTakenError, type Store, type UserRecord } from './types';

const json = (v: unknown) => v as Prisma.InputJsonValue;

const toUser = (u: {
  id: string;
  username: string;
  passwordHash: string;
  totalScore: number;
  gamesPlayed: number;
}): UserRecord => ({
  id: u.id,
  username: u.username,
  passwordHash: u.passwordHash,
  totalScore: u.totalScore,
  gamesPlayed: u.gamesPlayed,
});

const clients = new WeakMap<Store, PrismaClient>();

export function createPrismaStore(databaseUrl: string): Store {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  const store: Store = {
    async createUser(username, passwordHash) {
      try {
        const u = await db.user.create({
          data: { username, usernameLower: username.toLowerCase(), passwordHash },
        });
        return toUser(u);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new UsernameTakenError();
        throw e;
      }
    },
    async findUserByUsername(username) {
      const u = await db.user.findUnique({ where: { usernameLower: username.toLowerCase() } });
      return u ? toUser(u) : null;
    },
    async findUserById(id) {
      const u = await db.user.findUnique({ where: { id } });
      return u ? toUser(u) : null;
    },
    async saveGame(g) {
      const [game] = await db.$transaction([
        db.game.create({
          data: {
            roomCode: g.roomCode,
            timeLimitSec: g.timeLimitSec,
            startedAt: g.startedAt,
            endedAt: g.endedAt,
            pairs: json(g.pairs),
            players: {
              create: g.players.map((p, seat) => ({
                userId: p.userId,
                seat,
                cards: json(p.cards),
                chi1: json(p.arrangement.chi1),
                chi2: json(p.arrangement.chi2),
                chi3: json(p.arrangement.chi3),
                autoArranged: p.autoArranged,
                foul: p.foul,
                special: p.special,
                score: p.score,
              })),
            },
          },
        }),
        ...g.players.map((p) =>
          db.user.update({
            where: { id: p.userId },
            data: { totalScore: { increment: p.score }, gamesPlayed: { increment: 1 } },
          }),
        ),
      ]);
      return game.id;
    },
    async listGamesForUser(userId, limit) {
      const games = await db.game.findMany({
        where: { players: { some: { userId } } },
        orderBy: { endedAt: 'desc' },
        take: limit,
        include: { players: { orderBy: { seat: 'asc' }, include: { user: { select: { username: true } } } } },
      });
      return games.map((g) => ({
        id: g.id,
        endedAt: g.endedAt.toISOString(),
        myScore: g.players.find((p) => p.userId === userId)!.score,
        players: g.players.map((p) => ({ username: p.user.username, score: p.score })),
      }));
    },
    async getGame(id): Promise<GameDetail | null> {
      const g = await db.game.findUnique({
        where: { id },
        include: { players: { orderBy: { seat: 'asc' }, include: { user: { select: { username: true } } } } },
      });
      if (!g) return null;
      return {
        id: g.id,
        endedAt: g.endedAt.toISOString(),
        pairs: g.pairs as unknown as PairResult[],
        players: g.players.map((p) => ({
          userId: p.userId,
          username: p.user.username,
          arrangement: {
            chi1: p.chi1 as unknown as Card[],
            chi2: p.chi2 as unknown as Card[],
            chi3: p.chi3 as unknown as Card[],
          } satisfies Arrangement,
          foul: p.foul,
          special: p.special as SpecialKind | null,
          autoArranged: p.autoArranged,
          score: p.score,
        })),
      };
    },
    async leaderboard(limit) {
      const rows = await db.user.findMany({
        orderBy: [{ totalScore: 'desc' }, { gamesPlayed: 'desc' }],
        take: limit,
        select: { username: true, totalScore: true, gamesPlayed: true },
      });
      return rows;
    },
  };
  clients.set(store, db);
  return store;
}

/** Empties all tables. Only for the store contract tests against a throwaway database. */
export async function resetPrismaStoreForTests(store: Store): Promise<void> {
  const db = clients.get(store);
  if (!db) throw new Error('Not a Prisma store');
  await db.$transaction([db.gamePlayer.deleteMany(), db.game.deleteMany(), db.user.deleteMany()]);
}
