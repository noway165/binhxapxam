import { describe, expect, it } from 'vitest';
import type { RoomPlayerView } from '@binh/rules';
import { AVATAR_COLORS, avatarColor, initials } from '../src/table/avatar';
import { seatLayout } from '../src/table/seating';

const P = (n: number): RoomPlayerView => ({
  userId: `u${n}`,
  username: `user${n}`,
  isHost: n === 1,
  connected: true,
  status: 'idle',
  roomScore: 0,
});
const layout = (count: number, me: string) => {
  const r = seatLayout([1, 2, 3, 4].slice(0, count).map(P), me);
  return { me: r.me?.userId ?? null, others: r.others.map((o) => `${o.player.userId}:${o.position}`) };
};

describe('seatLayout', () => {
  it('two players: the other sits on top', () => {
    expect(layout(2, 'u2')).toEqual({ me: 'u2', others: ['u1:top'] });
  });

  it('three players: left and right', () => {
    expect(layout(3, 'u1')).toEqual({ me: 'u1', others: ['u2:left', 'u3:right'] });
  });

  it('four players: rotates from the player after me', () => {
    expect(layout(4, 'u2')).toEqual({ me: 'u2', others: ['u3:left', 'u4:top', 'u1:right'] });
  });

  it('someone not in the room sees everyone', () => {
    const r = seatLayout([1, 2, 3].map(P), 'zz');
    expect(r.me).toBeNull();
    expect(r.others).toHaveLength(3);
  });
});

describe('avatar', () => {
  it('makes two-letter initials', () => {
    expect(initials('tester_a')).toBe('TA');
    expect(initials('lam')).toBe('LA');
    expect(initials('Nguyen Van')).toBe('NV');
  });

  it('picks a stable color from the palette', () => {
    expect(avatarColor('lam')).toBe(avatarColor('lam'));
    expect(AVATAR_COLORS).toContain(avatarColor('lam'));
    expect(AVATAR_COLORS).toHaveLength(8);
  });
});
