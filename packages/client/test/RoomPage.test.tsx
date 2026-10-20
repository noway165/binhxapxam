import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSyncExternalStore } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Ack, RoomStateView } from '@binh/rules';
import RoomPage from '../src/pages/RoomPage';
import type { GameState } from '../src/socket';

const room: RoomStateView = {
  code: 'ABCDEF',
  phase: 'WAITING',
  timeLimitSec: 90,
  deadline: null,
  players: [{ userId: 'u1', username: 'me', isHost: true, connected: true, status: 'idle', roomScore: 0 }],
};

// A controllable stand-in for the socket store.
let game: GameState = { ready: true, connected: true, replaced: false, room, dealt: null, result: null };
const listeners = new Set<() => void>();
const setGame = (patch: Partial<GameState>) => {
  game = { ...game, ...patch };
  listeners.forEach((l) => l());
};
let resolveLeave: (a: Ack) => void = () => {};
const emitAck = vi.fn((event: string, _payload?: unknown) =>
  event === 'room:leave' ? new Promise<Ack>((r) => (resolveLeave = r)) : Promise.resolve<Ack>({ ok: true }),
);

vi.mock('../src/socket', () => ({
  emitAck: (event: string, payload?: unknown) => emitAck(event, payload),
  useGame: () =>
    useSyncExternalStore(
      (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      () => game,
    ),
}));
vi.mock('../src/auth', () => ({ useAuth: () => ({ user: { id: 'u1', username: 'me' } }) }));

describe('RoomPage', () => {
  it('leaving does not re-join the room when the server clears the room state first', async () => {
    render(
      <MemoryRouter initialEntries={['/room/ABCDEF']}>
        <Routes>
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/" element={<p>Sảnh</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Rời phòng' }));
    // Server order: room:state null arrives before the leave ack.
    act(() => setGame({ room: null }));
    await act(async () => resolveLeave({ ok: true }));
    expect(emitAck.mock.calls.map((c) => c[0])).toEqual(['room:leave']);
    expect(screen.getByText('Sảnh')).toBeInTheDocument();
  });
});
