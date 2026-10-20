import type { Server as HttpServer } from 'node:http';
import { parse as parseCookie } from 'cookie';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import type { Ack, Arrangement } from '@binh/rules';
import { COOKIE_NAME, verifyToken } from './auth/jwt';
import type { Room } from './game/Room';
import { RoomError } from './game/RoomError';
import { RoomManager } from './game/RoomManager';
import type { Store } from './store/types';

const CardSchema = z.object({
  rank: z.number().int().min(2).max(14),
  suit: z.enum(['S', 'H', 'D', 'C']),
});
const ArrangementSchema = z.object({
  chi1: z.array(CardSchema).length(5),
  chi2: z.array(CardSchema).length(5),
  chi3: z.array(CardSchema).length(3),
});
const JoinSchema = z.object({ code: z.string().min(1).max(12) });
const SettingsSchema = z.object({ timeLimitSec: z.number().int() });

type User = { id: string; username: string };
const userChannel = (id: string) => `user:${id}`;
const roomChannel = (code: string) => `room:${code}`;

export function attachSocket(httpServer: HttpServer, opts: { store: Store; jwtSecret: string }) {
  const io = new Server(httpServer);

  const manager = new RoomManager(
    (code) => ({
      state: (v) => io.to(roomChannel(code)).emit('room:state', v),
      dealt: (userId, p) => io.to(userChannel(userId)).emit('game:dealt', p),
      result: (r) => io.to(roomChannel(code)).emit('game:result', r),
    }),
    (g) => opts.store.saveGame(g),
  );

  io.use((socket, next) => {
    const token = parseCookie(socket.handshake.headers.cookie ?? '')[COOKIE_NAME];
    const session = verifyToken(token, opts.jwtSecret);
    if (!session) return next(new Error('unauthorized'));
    socket.data.user = { id: session.uid, username: session.username } satisfies User;
    next();
  });

  /** Sends everything this socket needs to render the room it is in (or null). */
  function sendSnapshot(socket: Socket, room: Room | undefined, userId: string) {
    if (!room) {
      socket.emit('room:state', null);
      return;
    }
    const snap = room.snapshotFor(userId);
    socket.emit('room:state', snap.state);
    if (snap.dealt) socket.emit('game:dealt', snap.dealt);
    if (snap.result) socket.emit('game:result', snap.result);
  }

  io.on('connection', (socket) => {
    const user = socket.data.user as User;

    // One live connection per account: the newest one wins. Kept synchronous so the
    // handlers below are registered before any client event can arrive.
    const others = [...(io.sockets.adapter.rooms.get(userChannel(user.id)) ?? [])]
      .map((id) => io.sockets.sockets.get(id))
      .filter((s): s is Socket => !!s && s.id !== socket.id);
    socket.join(userChannel(user.id));
    for (const s of others) {
      s.emit('session:replaced');
      s.disconnect(true);
    }

    const current = manager.roomOf(user.id);
    if (current) {
      socket.join(roomChannel(current.code));
      manager.setConnected(user.id, true);
    }
    sendSnapshot(socket, current, user.id);

    const enterChannel = (room: Room) => {
      for (const ch of socket.rooms) if (ch.startsWith('room:') && ch !== roomChannel(room.code)) socket.leave(ch);
      socket.join(roomChannel(room.code));
    };

    /** Registers an event whose handler may throw RoomError; replies through the ack. */
    const on = (event: string, fn: (payload: unknown) => { code?: string } | void) => {
      socket.on(event, (payload: unknown, ack?: (r: Ack) => void) => {
        if (typeof payload === 'function') {
          ack = payload as (r: Ack) => void;
          payload = undefined;
        }
        try {
          const extra = fn(payload) ?? {};
          ack?.({ ok: true, ...extra });
        } catch (e) {
          if (e instanceof RoomError) ack?.({ ok: false, error: e.message });
          else if (e instanceof z.ZodError) ack?.({ ok: false, error: 'Dữ liệu không hợp lệ' });
          else {
            console.error(`[socket ${event}]`, e);
            ack?.({ ok: false, error: 'Lỗi máy chủ' });
          }
        }
      });
    };

    const myRoom = () => {
      const room = manager.roomOf(user.id);
      if (!room) throw new RoomError('Bạn chưa ở trong phòng nào');
      return room;
    };

    on('room:create', () => {
      const room = manager.create(user);
      enterChannel(room);
      sendSnapshot(socket, room, user.id);
      return { code: room.code };
    });

    on('room:join', (p) => {
      const { code } = JoinSchema.parse(p);
      const room = manager.join(code, user);
      enterChannel(room);
      sendSnapshot(socket, room, user.id);
      return { code: room.code };
    });

    on('room:leave', () => {
      const room = manager.roomOf(user.id);
      manager.leave(user.id);
      if (room) socket.leave(roomChannel(room.code));
      socket.emit('room:state', null);
    });

    on('room:settings', (p) => myRoom().setTimeLimit(user.id, SettingsSchema.parse(p).timeLimitSec));
    on('game:start', () => myRoom().start(user.id));
    on('game:next', () => myRoom().next(user.id));
    on('hand:submit', (p) => myRoom().submit(user.id, ArrangementSchema.parse(p) as Arrangement));
    on('hand:unsubmit', () => myRoom().unsubmit(user.id));

    socket.on('disconnect', () => {
      const stillOnline = (io.sockets.adapter.rooms.get(userChannel(user.id))?.size ?? 0) > 0;
      if (!stillOnline) manager.setConnected(user.id, false);
    });
  });

  return { io, manager };
}
