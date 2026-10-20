import type { PairResult } from './scoring';
import type { Arrangement, Card, HandValue, SpecialKind } from './types';

// ---- REST ----

export interface MeResponse {
  id: string;
  username: string;
  totalScore: number;
  gamesPlayed: number;
}

export interface GameSummary {
  id: string;
  endedAt: string;
  myScore: number;
  players: { username: string; score: number }[];
}

export interface GameDetailPlayer {
  userId: string;
  username: string;
  arrangement: Arrangement;
  foul: boolean;
  special: SpecialKind | null;
  autoArranged: boolean;
  score: number;
}

export interface GameDetail {
  id: string;
  endedAt: string;
  players: GameDetailPlayer[];
  pairs: PairResult[];
}

export interface LeaderboardRow {
  username: string;
  totalScore: number;
  gamesPlayed: number;
}

// ---- Socket ----

export type RoomPhase = 'WAITING' | 'ARRANGING' | 'REVEAL';
export type PlayerStatus = 'idle' | 'arranging' | 'submitted' | 'waitingNext';

export interface RoomPlayerView {
  userId: string;
  username: string;
  isHost: boolean;
  connected: boolean;
  status: PlayerStatus;
  roomScore: number;
}

export interface RoomStateView {
  code: string;
  phase: RoomPhase;
  timeLimitSec: number;
  /** Epoch ms when arranging ends; null outside ARRANGING. */
  deadline: number | null;
  players: RoomPlayerView[];
}

export interface DealtPayload {
  cards: Card[];
  deadline: number;
  submitted: Arrangement | null;
}

export interface ResultPlayer {
  userId: string;
  username: string;
  arrangement: Arrangement;
  hands: HandValue[];
  foul: boolean;
  special: SpecialKind | null;
  autoArranged: boolean;
  score: number;
  roomScore: number;
}

export interface GameResultPayload {
  gameId: string | null;
  players: ResultPlayer[];
  pairs: PairResult[];
}

export type Ack = { ok: true; code?: string } | { ok: false; error: string };

export const TIME_LIMIT = { min: 30, max: 300, default: 90 } as const;
export const MAX_PLAYERS = 4;
