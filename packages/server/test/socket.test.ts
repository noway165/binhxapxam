import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { autoArrange } from '@binh/rules';
import type { Ack, DealtPayload, GameResultPayload, RoomStateView } from '@binh/rules';
import { createServer } from '../src/app';
import { createMemoryStore } from '../src/store/memoryStore';

let srv: ReturnType<typeof createServer>;
let url: string;
const sockets: Socket[] = [];

beforeEach(async () => {
  srv = createServer({ store: createMemoryStore(), jwtSecret: 'test-secret', secureCookies: false });
  await new Promise<void>((r) => srv.httpServer.listen(0, r));
  url = `http://localhost:${(srv.httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
  sockets.splice(0).forEach((s) => s.disconnect());
  srv.manager.stop();
  await new Promise((r) => srv.io.close(() => r(null)));
});

async function cookieFor(username: string): Promise<string> {
  const res = await request(srv.app).post('/api/register').send({ username, password: 'secret1' });
  return String(res.headers['set-cookie']).split(';')[0];
}

function client(cookie?: string): Socket {
  const s = connect(url, {
    transports: ['websocket'],
    extraHeaders: cookie ? { cookie } : {},
    reconnection: false,
    forceNew: true,
  });
  sockets.push(s);
  return s;
}

const next = <T>(s: Socket, event: string) => new Promise<T>((r) => s.once(event, r));
const connected = (s: Socket) => new Promise<void>((ok, fail) => {
  s.once('connect', () => ok());
  s.once('connect_error', fail);
});
const emit = (s: Socket, event: string, payload?: unknown) =>
  new Promise<Ack>((r) => (payload === undefined ? s.emit(event, r) : s.emit(event, payload, r)));

async function stateWhere(s: Socket, pred: (v: RoomStateView) => boolean) {
  return new Promise<RoomStateView>((r) => {
    const h = (v: RoomStateView) => {
      if (v && pred(v)) {
        s.off('room:state', h);
        r(v);
      }
    };
    s.on('room:state', h);
  });
}

describe('socket', () => {
  it('rejects connections without a session cookie', async () => {
    await expect(connected(client())).rejects.toThrow('unauthorized');
  });

  it('plays a full round between two players', async () => {
    const [ca, cb] = await Promise.all([cookieFor('alice'), cookieFor('bob')]);
    const a = client(ca);
    const b = client(cb);
    await Promise.all([connected(a), connected(b)]);

    const created = await emit(a, 'room:create');
    expect(created).toMatchObject({ ok: true, code: expect.stringMatching(/^[A-Z2-9]{6}$/) });
    const code = (created as { code: string }).code;
    expect(await emit(b, 'room:join', { code })).toEqual({ ok: true, code });

    const dealtA = next<DealtPayload>(a, 'game:dealt');
    const dealtB = next<DealtPayload>(b, 'game:dealt');
    expect(await emit(a, 'game:start')).toEqual({ ok: true });
    const [da, db] = await Promise.all([dealtA, dealtB]);
    expect(da.cards).toHaveLength(13);

    const resultA = next<GameResultPayload>(a, 'game:result');
    const resultB = next<GameResultPayload>(b, 'game:result');
    expect(await emit(a, 'hand:submit', autoArrange(da.cards))).toEqual({ ok: true });
    expect(await emit(b, 'hand:submit', autoArrange(db.cards))).toEqual({ ok: true });
    const [ra] = await Promise.all([resultA, resultB]);
    expect(ra.players.reduce((s, p) => s + p.score, 0)).toBe(0);
    expect(ra.gameId).toBeTruthy();

    const me = await request(srv.app).get('/api/me').set('Cookie', ca);
    expect(me.body.gamesPlayed).toBe(1);
  });

  it('a reconnecting player gets their submitted hand back (RF3)', async () => {
    const [ca, cb] = await Promise.all([cookieFor('alice'), cookieFor('bob')]);
    const a = client(ca);
    const b = client(cb);
    await Promise.all([connected(a), connected(b)]);
    const { code } = (await emit(a, 'room:create')) as { code: string };
    await emit(b, 'room:join', { code });
    const dealtB = next<DealtPayload>(b, 'game:dealt');
    await emit(a, 'game:start');
    const db = await dealtB;
    const mine = autoArrange(db.cards);
    await emit(b, 'hand:submit', mine);
    b.disconnect();

    const b2 = client(cb);
    const state = stateWhere(b2, (v) => v.code === code);
    const dealt = next<DealtPayload>(b2, 'game:dealt');
    await connected(b2);
    const [s, d] = await Promise.all([state, dealt]);
    expect(s.players.find((p) => p.username === 'bob')!.status).toBe('submitted');
    expect(d.submitted).toEqual(mine);
    expect(d.deadline).toBe(db.deadline);
  });

  it('a second connection for the same user replaces the first', async () => {
    const ca = await cookieFor('alice');
    const first = client(ca);
    await connected(first);
    const replaced = next(first, 'session:replaced');
    const gone = next(first, 'disconnect');
    const second = client(ca);
    await connected(second);
    await Promise.all([replaced, gone]);
    expect(second.connected).toBe(true);
  });

  it('acks malformed submissions with an error', async () => {
    const [ca, cb] = await Promise.all([cookieFor('alice'), cookieFor('bob')]);
    const a = client(ca);
    const b = client(cb);
    await Promise.all([connected(a), connected(b)]);
    const { code } = (await emit(a, 'room:create')) as { code: string };
    await emit(b, 'room:join', { code });
    const dealtA = next<DealtPayload>(a, 'game:dealt');
    await emit(a, 'game:start');
    const da = await dealtA;
    const arr = autoArrange(da.cards);
    const res = await emit(a, 'hand:submit', { ...arr, chi3: [...arr.chi3, arr.chi1[0]] });
    expect(res.ok).toBe(false);
    expect(await emit(b, 'room:join', { code: 'ZZZZZZ' })).toEqual({ ok: false, error: 'Không tìm thấy phòng' });
  });
});
