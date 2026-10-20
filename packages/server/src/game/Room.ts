import {
  autoArrange,
  deal,
  MAX_PLAYERS,
  scoreRound,
  TIME_LIMIT,
  type Arrangement,
  type Card,
  type DealtPayload,
  type GameResultPayload,
  type PlayerStatus,
  type RoomPhase,
  type RoomStateView,
} from '@binh/rules';
import type { SavedGame } from '../store/types';
import { RoomError } from './RoomError';
import { validateArrangement } from './validate';

export interface RoomSink {
  state(v: RoomStateView): void;
  dealt(userId: string, p: DealtPayload): void;
  result(r: GameResultPayload): void;
}

interface Member {
  id: string;
  username: string;
  connected: boolean;
  /** Left during a round: still scored, removed when the round ends. */
  left: boolean;
  inRound: boolean;
  roomScore: number;
}

interface Round {
  startedAt: Date;
  deadline: number;
  hands: Map<string, Card[]>;
  submitted: Map<string, Arrangement>;
  timer: ReturnType<typeof setTimeout>;
  finalized: boolean;
}

export class Room {
  private phase: RoomPhase = 'WAITING';
  private timeLimitSec: number = TIME_LIMIT.default;
  /** In join order; the first one still present is the host. */
  private members: Member[] = [];
  private round: Round | null = null;
  private lastResult: GameResultPayload | null = null;

  constructor(
    readonly code: string,
    private readonly sink: RoomSink,
    private readonly saveGame: (g: SavedGame) => Promise<string>,
  ) {}

  // ---- queries ----

  has(userId: string): boolean {
    return this.members.some((m) => m.id === userId && !m.left);
  }

  get playerCount(): number {
    return this.present().length;
  }

  get isEmptyOfConnected(): boolean {
    return !this.members.some((m) => m.connected && !m.left);
  }

  snapshotFor(userId: string): { state: RoomStateView; dealt: DealtPayload | null; result: GameResultPayload | null } {
    return {
      state: this.view(),
      dealt: this.dealtFor(userId),
      result: this.phase === 'REVEAL' ? this.lastResult : null,
    };
  }

  // ---- membership ----

  join(user: { id: string; username: string }): void {
    const existing = this.members.find((m) => m.id === user.id);
    if (existing && !existing.left) {
      existing.connected = true;
    } else {
      if (this.playerCount >= MAX_PLAYERS) throw new RoomError(`Phòng đã đủ ${MAX_PLAYERS} người`);
      if (existing) {
        existing.left = false;
        existing.connected = true;
      } else {
        this.members.push({ ...user, connected: true, left: false, inRound: false, roomScore: 0 });
      }
    }
    this.emitState();
  }

  leave(userId: string): void {
    const m = this.members.find((x) => x.id === userId);
    if (!m) return;
    if (this.phase === 'ARRANGING' && m.inRound) {
      m.left = true;
      m.connected = false;
      this.emitState();
      if (this.round && this.allSubmitted()) void this.finalize();
      return;
    }
    this.members = this.members.filter((x) => x !== m);
    this.emitState();
  }

  setConnected(userId: string, connected: boolean): void {
    const m = this.members.find((x) => x.id === userId && !x.left);
    if (!m) return;
    m.connected = connected;
    this.emitState();
  }

  // ---- host actions ----

  setTimeLimit(userId: string, sec: number): void {
    this.requireHost(userId);
    if (this.phase !== 'WAITING') throw new RoomError('Chỉ đổi thời gian khi đang chờ');
    if (!Number.isInteger(sec) || sec < TIME_LIMIT.min || sec > TIME_LIMIT.max) {
      throw new RoomError(`Thời gian xếp bài phải từ ${TIME_LIMIT.min} đến ${TIME_LIMIT.max} giây`);
    }
    this.timeLimitSec = sec;
    this.emitState();
  }

  start(userId: string): void {
    this.requireHost(userId);
    if (this.phase !== 'WAITING') throw new RoomError('Ván đang diễn ra');
    if (this.playerCount < 2) throw new RoomError('Cần ít nhất 2 người');
    this.dealRound();
  }

  next(userId: string): void {
    this.requireHost(userId);
    if (this.phase !== 'REVEAL') throw new RoomError('Ván hiện tại chưa kết thúc');
    if (this.playerCount < 2) {
      this.phase = 'WAITING';
      this.lastResult = null;
      this.emitState();
      return;
    }
    this.dealRound();
  }

  // ---- player actions ----

  submit(userId: string, a: Arrangement): void {
    const hand = this.activeHand(userId);
    const err = validateArrangement(hand, a);
    if (err) throw new RoomError(err);
    this.round!.submitted.set(userId, { chi1: [...a.chi1], chi2: [...a.chi2], chi3: [...a.chi3] });
    this.emitState();
    if (this.allSubmitted()) void this.finalize();
  }

  unsubmit(userId: string): void {
    this.activeHand(userId);
    this.round!.submitted.delete(userId);
    this.emitState();
  }

  // ---- internals ----

  private present(): Member[] {
    return this.members.filter((m) => !m.left);
  }

  private host(): Member | undefined {
    return this.present()[0];
  }

  private requireHost(userId: string): void {
    if (this.host()?.id !== userId) throw new RoomError('Chỉ chủ phòng mới được làm việc này');
  }

  private activeHand(userId: string): Card[] {
    const m = this.members.find((x) => x.id === userId && !x.left);
    const hand = this.round?.hands.get(userId);
    if (this.phase !== 'ARRANGING' || !this.round || this.round.finalized || !m?.inRound || !hand) {
      throw new RoomError('Không thể xếp bài lúc này');
    }
    return hand;
  }

  private allSubmitted(): boolean {
    const r = this.round!;
    return this.members.filter((m) => m.inRound && !m.left).every((m) => r.submitted.has(m.id));
  }

  private dealRound(): void {
    const players = this.present();
    const hands = deal(players.length);
    const ms = this.timeLimitSec * 1000;
    this.round = {
      startedAt: new Date(),
      deadline: Date.now() + ms,
      hands: new Map(players.map((m, i) => [m.id, hands[i]])),
      submitted: new Map(),
      timer: setTimeout(() => void this.finalize(), ms),
      finalized: false,
    };
    for (const m of this.members) m.inRound = !m.left;
    this.phase = 'ARRANGING';
    this.lastResult = null;
    for (const m of players) this.sink.dealt(m.id, this.dealtFor(m.id)!);
    this.emitState();
  }

  private async finalize(): Promise<void> {
    const round = this.round;
    if (!round || round.finalized) return;
    round.finalized = true;
    clearTimeout(round.timer);

    const players = this.members.filter((m) => m.inRound);
    const arranged = players.map((m) => {
      const submitted = round.submitted.get(m.id);
      return { m, arrangement: submitted ?? autoArrange(round.hands.get(m.id)!), autoArranged: !submitted };
    });
    const scored = scoreRound(arranged.map(({ m, arrangement }) => ({ id: m.id, arrangement })));
    const outcome = new Map(scored.players.map((o) => [o.id, o]));
    for (const { m } of arranged) m.roomScore += outcome.get(m.id)!.score;

    let gameId: string | null = null;
    try {
      gameId = await this.saveGame({
        roomCode: this.code,
        timeLimitSec: this.timeLimitSec,
        startedAt: round.startedAt,
        endedAt: new Date(),
        players: arranged.map(({ m, arrangement, autoArranged }) => {
          const o = outcome.get(m.id)!;
          return {
            userId: m.id,
            cards: round.hands.get(m.id)!,
            arrangement,
            autoArranged,
            foul: o.foul,
            special: o.special,
            score: o.score,
          };
        }),
        pairs: scored.pairs,
      });
    } catch (e) {
      console.error(`[room ${this.code}] saving game failed`, e);
    }

    const result: GameResultPayload = {
      gameId,
      pairs: scored.pairs,
      players: arranged.map(({ m, arrangement, autoArranged }) => {
        const o = outcome.get(m.id)!;
        return {
          userId: m.id,
          username: m.username,
          arrangement,
          hands: o.hands,
          foul: o.foul,
          special: o.special,
          autoArranged,
          score: o.score,
          roomScore: m.roomScore,
        };
      }),
    };

    this.round = null;
    this.lastResult = result;
    this.phase = 'REVEAL';
    this.members = this.members.filter((m) => !m.left);
    for (const m of this.members) m.inRound = false;
    this.sink.result(result);
    this.emitState();
  }

  private dealtFor(userId: string): DealtPayload | null {
    const hand = this.round?.hands.get(userId);
    if (this.phase !== 'ARRANGING' || !this.round || !hand) return null;
    return { cards: hand, deadline: this.round.deadline, submitted: this.round.submitted.get(userId) ?? null };
  }

  private status(m: Member): PlayerStatus {
    if (this.phase !== 'ARRANGING') return 'idle';
    if (!m.inRound) return 'waitingNext';
    return this.round?.submitted.has(m.id) ? 'submitted' : 'arranging';
  }

  private view(): RoomStateView {
    const host = this.host();
    return {
      code: this.code,
      phase: this.phase,
      timeLimitSec: this.timeLimitSec,
      deadline: this.phase === 'ARRANGING' ? (this.round?.deadline ?? null) : null,
      players: this.members.map((m) => ({
        userId: m.id,
        username: m.username,
        isHost: m === host,
        connected: m.connected,
        status: this.status(m),
        roomScore: m.roomScore,
      })),
    };
  }

  private emitState(): void {
    this.sink.state(this.view());
  }
}
