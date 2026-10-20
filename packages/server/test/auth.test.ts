import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createMemoryStore } from '../src/store/memoryStore';

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp({ store: createMemoryStore(), jwtSecret: 'test-secret', secureCookies: false });
});

describe('auth', () => {
  it('registers, sets the session cookie and returns me', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/register').send({ username: 'Lam', password: 'secret1' });
    expect(res.status).toBe(201);
    expect(String(res.headers['set-cookie'])).toMatch(/binh_token=.*HttpOnly/i);
    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ username: 'Lam', totalScore: 0, gamesPlayed: 0 });
  });

  it('rejects a username that differs only by case', async () => {
    await request(app).post('/api/register').send({ username: 'Lam', password: 'secret1' });
    const res = await request(app).post('/api/register').send({ username: 'lam', password: 'secret1' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Tên đăng nhập đã tồn tại');
  });

  it('logs in with any letter case and the right password', async () => {
    await request(app).post('/api/register').send({ username: 'Lam', password: 'secret1' });
    const ok = await request(app).post('/api/login').send({ username: 'LAM', password: 'secret1' });
    expect(ok.status).toBe(200);
    expect(ok.body.username).toBe('Lam');
    const bad = await request(app).post('/api/login').send({ username: 'Lam', password: 'wrong12' });
    expect(bad.status).toBe(401);
    expect(bad.body.error).toBe('Sai tên đăng nhập hoặc mật khẩu');
  });

  it('validates username and password', async () => {
    const shortName = await request(app).post('/api/register').send({ username: 'ab', password: 'secret1' });
    expect(shortName.status).toBe(400);
    expect(shortName.body.error).toBe('Tên đăng nhập 3–20 ký tự: chữ, số, _');
    const shortPass = await request(app).post('/api/register').send({ username: 'abc', password: '12345' });
    expect(shortPass.status).toBe(400);
    expect(shortPass.body.error).toBe('Mật khẩu tối thiểu 6 ký tự');
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/register').send({ username: 'Lam', password: 'secret1' });
    await agent.post('/api/logout');
    expect((await agent.get('/api/me')).status).toBe(401);
  });

  it('rate limits failed logins: the 11th attempt in a minute gets 429', async () => {
    await request(app).post('/api/register').send({ username: 'Lam', password: 'secret1' });
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post('/api/login').send({ username: 'Lam', password: 'wrong12' })).status).toBe(401);
    }
    expect((await request(app).post('/api/login').send({ username: 'Lam', password: 'wrong12' })).status).toBe(429);
  });
});
