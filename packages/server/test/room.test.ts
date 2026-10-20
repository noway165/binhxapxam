import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoArrange, cardKey, parseCards } from '@binh/rules';
import type { Arrangement, Card, DealtPayload, GameResultPayload, RoomStateView } from '@binh/rules';
import { Room, type RoomSink } from '../src/game/Room';
import type { SavedGame } from '../src/store/types';

const U = (n: number) => ({ id: `u${n}`, username: `user${n}` });

function makeSink() {
  const states: RoomStateView[] = [];
  const dealt = new Map<string, DealtPayload[]>();
  const results: GameResultPayload[] = [];
  const sink: RoomSink = {
    state: (v) => states.push(v),
    dealt: (userId, p) => dealt.set(userId, [...(dealt.get(userId) ?? []), p]),
    result: (r) => results.push(r),
  };
  return { sink, states, dealt, results, last: () => states[states.length - 1] };
}

let rec: ReturnType<typeof makeSink>;
let save: ReturnType<typeof vi.fn<(g: SavedGame) => Promise<string>>>;

function setup(n: number) {
  const room = new Room('ABC234', rec.sink, save);
  for (let i = 1; i <= n; i++) room.join(U(i));
  return room;
}

const cardsOf = (userId: string): Card[] => rec.dealt.get(userId)!.at(-1)!.cards;
const submitAuto = (room: Room, userId: string) => room.submit(userId, autoArrange(cardsOf(userId)));
const flush = () => vi.advanceTimersByTimeAsync(0);
const statusOf = (userId: string) => rec.last().players.find((p) => p.userId === userId)?.status;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T10:00:00Z'));
  rec = makeSink();
  save = vi.fn(async () => 'game-1');
});
afterEach(() => vi.useRealTimers());

describe('starting a round', () => {
  it('needs the host and at least 2 players', () => {
    const solo = setup(1);
    expect(() => solo.start('u1')).toThrow('Cần ít nhất 2 người');
    const room = setup(2);
    expect(() => room.start('u2')).toThrow('Chỉ chủ phòng mới được làm việc này');
  });

  it('deals 13 distinct cards to each player with a server deadline', () => {
    const room = setup(3);
    room.start('u1');
    const all = ['u1', 'u2', 'u3'].flatMap((id) => cardsOf(id).map(cardKey));
    expect(new Set(all).size).toBe(39);
    expect(rec.dealt.get('u1')![0].deadline).toBe(Date.now() + 90_000);
    expect(rec.last()).toMatchObject({ phase: 'ARRANGING', deadline: Date.now() + 90_000 });
    expect(statusOf('u2')).toBe('arranging');
  });

  it('time limit is host-only, 30–300 s, and only while waiting', () => {
    const room = setup(2);
    expect(() => room.setTimeLimit('u1', 29)).toThrow();
    expect(() => room.setTimeLimit('u1', 301)).toThrow();
    expect(() => room.setTimeLimit('u2', 120)).toThrow('Chỉ chủ phòng mới được làm việc này');
    room.setTimeLimit('u1', 120);
    expect(rec.last().timeLimitSec).toBe(120);
    room.start('u1');
    expect(() => room.setTimeLimit('u1', 60)).toThrow();
  });
});

describe('submitting', () => {
  it('rejects malformed arrangements and keeps state (RF1)', () => {
    const room = setup(2);
    room.start('u1');
    const good = autoArrange(cardsOf('u1'));
    const short: Arrangement = { ...good, chi1: good.chi1.slice(0, 4) };
    const dup: Arrangement = { ...good, chi3: [good.chi3[0], good.chi3[0], good.chi3[1]] };
    const foreign: Arrangement = { ...good, chi3: [...good.chi3.slice(0, 2), cardsOf('u2')[0]] };
    for (const bad of [short, dup, foreign]) expect(() => room.submit('u1', bad)).toThrow();
    expect(statusOf('u1')).toBe('arranging');
  });

  it('scores once when everyone submits, then saves and reveals', async () => {
    const room = setup(3);
    room.start('u1');
    ['u1', 'u2', 'u3'].forEach((id) => submitAuto(room, id));
    await flush();
    expect(rec.results).toHaveLength(1);
    const r = rec.results[0];
    expect(r.gameId).toBe('game-1');
    expect(r.players.reduce((s, p) => s + p.score, 0)).toBe(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(rec.last().phase).toBe('REVEAL');
  });

  it('does not score twice when the timer fires after everyone submitted (RF2)', async () => {
    const room = setup(2);
    room.start('u1');
    submitAuto(room, 'u1');
    submitAuto(room, 'u2');
    await vi.advanceTimersByTimeAsync(200_000);
    expect(rec.results).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('auto-arranges whoever has not submitted when time runs out', async () => {
    const room = setup(2);
    room.start('u1');
    submitAuto(room, 'u1');
    await vi.advanceTimersByTimeAsync(90_000);
    const p2 = rec.results[0].players.find((p) => p.userId === 'u2')!;
    expect(p2).toMatchObject({ autoArranged: true, foul: false });
    expect(rec.results[0].players.find((p) => p.userId === 'u1')!.autoArranged).toBe(false);
  });

  it('unsubmit lets time run out into auto-arrange', async () => {
    const room = setup(2);
    room.start('u1');
    submitAuto(room, 'u1');
    room.unsubmit('u1');
    expect(statusOf('u1')).toBe('arranging');
    await vi.advanceTimersByTimeAsync(90_000);
    expect(rec.results[0].players.every((p) => p.autoArranged)).toBe(true);
  });

  it('keeps a fouled arrangement as submitted', async () => {
    const room = setup(2);
    room.start('u1');
    const hand = cardsOf('u1');
    const sorted = [...hand].sort((a, b) => a.rank - b.rank); // weakest cards in chi 1
    room.submit('u1', { chi1: sorted.slice(0, 5), chi2: sorted.slice(5, 10), chi3: sorted.slice(10) });
    submitAuto(room, 'u2');
    await flush();
    const p1 = rec.results[0].players.find((p) => p.userId === 'u1')!;
    expect(p1.autoArranged).toBe(false);
  });

  it('a failed save still reveals the result with gameId null', async () => {
    save.mockRejectedValueOnce(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const room = setup(2);
    room.start('u1');
    submitAuto(room, 'u1');
    submitAuto(room, 'u2');
    await flush();
    expect(rec.results[0].gameId).toBeNull();
  });
});

describe('reconnect and membership', () => {
  it('snapshot after submitting returns cards, deadline and the submitted arrangement (RF3)', () => {
    const room = setup(2);
    room.start('u1');
    const deadline = Date.now() + 90_000;
    const mine = autoArrange(cardsOf('u2'));
    room.submit('u2', mine);
    room.setConnected('u2', false);
    vi.advanceTimersByTime(5_000);
    room.setConnected('u2', true);
    const snap = room.snapshotFor('u2');
    expect(snap.dealt).toEqual({ cards: cardsOf('u2'), deadline, submitted: mine });
    expect(snap.state.players.find((p) => p.userId === 'u2')!.status).toBe('submitted');
    expect(snap.result).toBeNull();
  });

  it('host leaving mid-round is still scored, then the next player becomes host (RF4)', async () => {
    const room = setup(3);
    room.start('u1');
    room.leave('u1');
    submitAuto(room, 'u2');
    submitAuto(room, 'u3');
    await flush();
    expect(rec.results[0].players.map((p) => p.userId)).toContain('u1');
    expect(room.has('u1')).toBe(false);
    expect(rec.last().players.find((p) => p.isHost)!.userId).toBe('u2');
    room.next('u2');
    expect(rec.last().phase).toBe('ARRANGING');
  });

  it('a player joining mid-round waits for the next round; a 5th player is rejected', async () => {
    const room = setup(2);
    room.start('u1');
    room.join(U(3));
    expect(statusOf('u3')).toBe('waitingNext');
    expect(rec.dealt.get('u3')).toBeUndefined();
    room.join(U(4));
    expect(() => room.join(U(5))).toThrow('Phòng đã đủ 4 người');
    submitAuto(room, 'u1');
    submitAuto(room, 'u2');
    await flush();
    room.next('u1');
    expect(rec.dealt.get('u3')).toHaveLength(1);
  });

  it('next with fewer than 2 players goes back to waiting', async () => {
    const room = setup(2);
    room.start('u1');
    room.leave('u2');
    submitAuto(room, 'u1');
    await vi.advanceTimersByTimeAsync(90_000);
    room.next('u1');
    expect(rec.last().phase).toBe('WAITING');
  });

  it('room score accumulates over rounds', async () => {
    const room = setup(2);
    for (let round = 0; round < 2; round++) {
      round === 0 ? room.start('u1') : room.next('u1');
      submitAuto(room, 'u1');
      submitAuto(room, 'u2');
      await flush();
    }
    const [r1, r2] = rec.results;
    const s1 = r1.players.find((p) => p.userId === 'u1')!.score;
    const s2 = r2.players.find((p) => p.userId === 'u1')!.score;
    expect(r2.players.find((p) => p.userId === 'u1')!.roomScore).toBe(s1 + s2);
  });

  it('reports when no one is connected', () => {
    const room = setup(2);
    expect(room.isEmptyOfConnected).toBe(false);
    room.setConnected('u1', false);
    room.setConnected('u2', false);
    expect(room.isEmptyOfConnected).toBe(true);
  });
});

describe('validateArrangement', () => {
  it('accepts exactly the dealt cards in 5/5/3', async () => {
    const { validateArrangement } = await import('../src/game/validate');
    const hand = parseCards('2S 3H 4D 5C 6S 7H 8D 9C TS JH QD KC AS');
    expect(validateArrangement(hand, autoArrange(hand))).toBeNull();
  });
});
