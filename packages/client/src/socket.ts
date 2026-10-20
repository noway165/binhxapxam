import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Ack, DealtPayload, GameResultPayload, RoomStateView } from '@binh/rules';
import { toast } from './toast';

export interface GameState {
  /** True once the server has told us which room (if any) we are in. */
  ready: boolean;
  connected: boolean;
  /** Another tab took over this account. */
  replaced: boolean;
  room: RoomStateView | null;
  dealt: DealtPayload | null;
  result: GameResultPayload | null;
}

const initial: GameState = { ready: false, connected: false, replaced: false, room: null, dealt: null, result: null };
let state = initial;
const listeners = new Set<() => void>();
let socket: Socket | null = null;

function set(patch: Partial<GameState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getSocket(): Socket {
  if (socket) return socket;
  const s = io({ withCredentials: true });
  s.on('connect', () => set({ connected: true, replaced: false }));
  s.on('disconnect', () => set({ connected: false }));
  s.on('session:replaced', () => {
    set({ replaced: true });
    s.disconnect(); // a manual disconnect stops auto-reconnect, so the tabs don't fight
  });
  s.on('room:state', (room: RoomStateView | null) =>
    set({
      ready: true,
      room,
      dealt: room?.phase === 'ARRANGING' ? state.dealt : null,
      result: room?.phase === 'REVEAL' ? state.result : null,
    }),
  );
  s.on('game:dealt', (dealt: DealtPayload) => set({ dealt, result: null }));
  s.on('game:result', (result: GameResultPayload) => set({ result, dealt: null }));
  socket = s;
  return s;
}

export function reconnectSocket(): void {
  getSocket().connect();
}

export function closeSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
  state = initial;
  listeners.forEach((l) => l());
}

/** Emits an event and resolves with the server's ack; failures are also shown as a toast. */
export function emitAck(event: string, payload?: unknown): Promise<Ack> {
  const s = getSocket();
  return new Promise((resolve) => {
    const done = (ack: Ack) => {
      if (!ack.ok) toast(ack.error);
      resolve(ack);
    };
    s.timeout(10_000).emit(event, ...(payload === undefined ? [] : [payload]), (err: Error | null, ack: Ack) =>
      done(err ? { ok: false, error: 'Mất kết nối tới máy chủ' } : ack),
    );
  });
}

export function useGame(): GameState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
