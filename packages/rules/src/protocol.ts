import type { PairResult } from './scoring';
import type { Arrangement, SpecialKind } from './types';

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
