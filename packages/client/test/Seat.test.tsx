import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RoomPlayerView } from '@binh/rules';
import Seat from '../src/table/Seat';

const base: RoomPlayerView = {
  userId: 'u1',
  username: 'lam',
  isHost: false,
  connected: true,
  status: 'arranging',
  roomScore: 3,
};

describe('Seat', () => {
  it('shows a submitted player with face-down cards', () => {
    render(<Seat player={{ ...base, status: 'submitted' }} position="top" showBacks />);
    expect(screen.getByText('Xong')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Lá úp').length).toBeGreaterThan(0);
  });

  it('a player waiting for the next round has no cards (RF3)', () => {
    render(<Seat player={{ ...base, status: 'waitingNext' }} position="left" showBacks />);
    expect(screen.getByText('Chờ ván sau')).toBeInTheDocument();
    expect(screen.queryAllByLabelText('Lá úp')).toHaveLength(0);
  });

  it('shows a disconnected player (RF3)', () => {
    render(<Seat player={{ ...base, connected: false }} position="right" showBacks={false} />);
    expect(screen.getByText('Mất kết nối')).toBeInTheDocument();
  });

  it('crowns the host and shows the room score', () => {
    render(<Seat player={{ ...base, isHost: true }} position="bottom" showBacks={false} />);
    expect(screen.getByLabelText('Chủ phòng')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });
});
