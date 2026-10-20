import type { SavedGame } from '../store/types';
import { Room, type RoomSink } from './Room';
import { RoomError } from './RoomError';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const EMPTY_ROOM_TTL_MS = 10 * 60_000;
const SWEEP_EVERY_MS = 60_000;

type User = { id: string; username: string };

export class RoomManager {
  private rooms = new Map<string, Room>();
  private userRoom = new Map<string, string>();
  private emptySince = new Map<string, number>();
  private sweeper: ReturnType<typeof setInterval>;

  constructor(
    private readonly makeSink: (code: string) => RoomSink,
    private readonly saveGame: (g: SavedGame) => Promise<string>,
  ) {
    this.sweeper = setInterval(() => this.sweep(), SWEEP_EVERY_MS);
    this.sweeper.unref?.();
  }

  create(user: User): Room {
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    } while (this.rooms.has(code));
    const room = new Room(code, this.makeSink(code), this.saveGame);
    this.rooms.set(code, room);
    this.leave(user.id);
    room.join(user);
    this.userRoom.set(user.id, code);
    return room;
  }

  join(code: string, user: User): Room {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) throw new RoomError('Không tìm thấy phòng');
    const previous = this.roomOf(user.id);
    room.join(user);
    if (previous && previous !== room) previous.leave(user.id);
    this.userRoom.set(user.id, room.code);
    return room;
  }

  roomOf(userId: string): Room | undefined {
    const code = this.userRoom.get(userId);
    const room = code ? this.rooms.get(code) : undefined;
    if (room?.has(userId)) return room;
    this.userRoom.delete(userId);
    return undefined;
  }

  leave(userId: string): void {
    this.roomOf(userId)?.leave(userId);
    this.userRoom.delete(userId);
  }

  setConnected(userId: string, connected: boolean): void {
    this.roomOf(userId)?.setConnected(userId, connected);
  }

  stop(): void {
    clearInterval(this.sweeper);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (!room.isEmptyOfConnected) {
        this.emptySince.delete(code);
        continue;
      }
      const since = this.emptySince.get(code) ?? now;
      this.emptySince.set(code, since);
      if (now - since >= EMPTY_ROOM_TTL_MS) {
        this.rooms.delete(code);
        this.emptySince.delete(code);
        for (const [user, c] of this.userRoom) if (c === code) this.userRoom.delete(user);
      }
    }
  }
}
