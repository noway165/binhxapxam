import type {
  Arrangement,
  Card,
  GameDetail,
  GameSummary,
  LeaderboardRow,
  PairResult,
  SpecialKind,
} from '@binh/rules';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  totalScore: number;
  gamesPlayed: number;
}

export interface SavedGamePlayer {
  userId: string;
  cards: Card[];
  arrangement: Arrangement;
  autoArranged: boolean;
  foul: boolean;
  special: SpecialKind | null;
  score: number;
}

export interface SavedGame {
  roomCode: string;
  timeLimitSec: number;
  startedAt: Date;
  endedAt: Date;
  players: SavedGamePlayer[];
  pairs: PairResult[];
}

export class UsernameTakenError extends Error {
  constructor() {
    super('Tên đăng nhập đã tồn tại');
  }
}

export interface Store {
  /** Throws UsernameTakenError if the name exists (case-insensitive). */
  createUser(username: string, passwordHash: string): Promise<UserRecord>;
  /** Case-insensitive lookup. */
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  /** Saves the game and adds each player's score/gamesPlayed atomically. Returns the game id. */
  saveGame(g: SavedGame): Promise<string>;
  /** Newest first. */
  listGamesForUser(userId: string, limit: number): Promise<GameSummary[]>;
  getGame(id: string): Promise<GameDetail | null>;
  /** Highest totalScore first. */
  leaderboard(limit: number): Promise<LeaderboardRow[]>;
}
