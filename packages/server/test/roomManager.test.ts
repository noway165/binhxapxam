import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomManager } from '../src/game/RoomManager';

const sink = { state: () => {}, dealt: () => {}, result: () => {} };
const alice = { id: 'a', username: 'alice' };
const bob = { id: 'b', username: 'bob' };
let manager: RoomManager;

beforeEach(() => {
  vi.useFakeTimers();
  manager = new RoomManager(() => sink, async () => 'g');
});
afterEach(() => {
  manager.stop();
  vi.useRealTimers();
});

describe('RoomManager', () => {
  it('creates rooms with 6-character unambiguous codes', () => {
    const room = manager.create(alice);
    expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(manager.roomOf('a')).toBe(room);
  });

  it('joins by code case-insensitively and rejects unknown codes', () => {
    const room = manager.create(alice);
    expect(manager.join(room.code.toLowerCase(), bob)).toBe(room);
    expect(room.playerCount).toBe(2);
    expect(() => manager.join('ZZZZZZ', bob)).toThrow('Không tìm thấy phòng');
  });

  it('moving to another room leaves the old one', () => {
    const x = manager.create(alice);
    manager.join(x.code, bob);
    const y = manager.create(alice);
    expect(manager.roomOf('a')).toBe(y);
    expect(x.has('a')).toBe(false);
    expect(x.has('b')).toBe(true);
  });

  it('leave removes the user from their room', () => {
    const x = manager.create(alice);
    manager.leave('a');
    expect(manager.roomOf('a')).toBeUndefined();
    expect(x.has('a')).toBe(false);
  });

  it('deletes a room nobody has been connected to for 10 minutes', () => {
    const x = manager.create(alice);
    manager.setConnected('a', false);
    vi.advanceTimersByTime(10 * 60_000 + 60_000);
    expect(() => manager.join(x.code, bob)).toThrow('Không tìm thấy phòng');
    expect(manager.roomOf('a')).toBeUndefined();
  });

  it('keeps a room whose players reconnect in time', () => {
    const x = manager.create(alice);
    manager.setConnected('a', false);
    vi.advanceTimersByTime(5 * 60_000);
    manager.setConnected('a', true);
    vi.advanceTimersByTime(10 * 60_000);
    expect(manager.join(x.code, bob)).toBe(x);
  });
});
