import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createMemoryStore } from '../src/store/memoryStore';
import type { Store } from '../src/store/types';
import { sampleGame } from './store.contract';

let store: Store;
let app: ReturnType<typeof createApp>;
let cookie: string;
let gameId: string;

beforeEach(async () => {
  store = createMemoryStore();
  app = createApp({ store, jwtSecret: 'test-secret', secureCookies: false });
  const res = await request(app).post('/api/register').send({ username: 'alice', password: 'secret1' });
  cookie = String(res.headers['set-cookie']).split(';')[0];
  const bob = await store.createUser('bob', 'h');
  gameId = await store.saveGame(sampleGame([res.body.id, bob.id], [6, -6]));
});

describe('history API', () => {
  it('requires a session', async () => {
    for (const path of ['/api/history', `/api/games/${gameId}`, '/api/leaderboard']) {
      expect((await request(app).get(path)).status).toBe(401);
    }
  });

  it('lists my games', async () => {
    const res = await request(app).get('/api/history').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: gameId, myScore: 6 });
  });

  it('returns one game, or 404', async () => {
    const res = await request(app).get(`/api/games/${gameId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.players).toHaveLength(2);
    expect(res.body.pairs).toHaveLength(1);
    const missing = await request(app).get('/api/games/nope').set('Cookie', cookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe('Không tìm thấy ván');
  });

  it('returns the leaderboard', async () => {
    const res = await request(app).get('/api/leaderboard').set('Cookie', cookie);
    expect(res.body).toEqual([
      { username: 'alice', totalScore: 6, gamesPlayed: 1 },
      { username: 'bob', totalScore: -6, gamesPlayed: 1 },
    ]);
  });
});
