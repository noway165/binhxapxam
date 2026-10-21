import type { ReactNode } from 'react';
import { MAX_PLAYERS, type RoomStateView } from '@binh/rules';
import { toast } from '../toast';
import Seat from './Seat';
import { seatLayout, type SeatPosition } from './seating';

interface Props {
  room: RoomStateView;
  myId: string;
  /** What sits in the middle of the felt (timer, deck, banner…). */
  center?: ReactNode;
  /** Thin strip used while arranging, so the tray gets the screen. */
  compact?: boolean;
}

const ALL: SeatPosition[] = ['left', 'top', 'right'];

export default function Table({ room, myId, center, compact }: Props) {
  const { me, others } = seatLayout(room.players, myId);
  const showBacks = room.phase === 'ARRANGING';
  const taken = new Set(others.map((o) => o.position));
  const free = room.phase === 'WAITING' ? ALL.filter((p) => !taken.has(p)).slice(0, MAX_PLAYERS - room.players.length) : [];

  async function invite() {
    const link = `${window.location.origin}/room/${room.code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast('Đã sao chép link phòng, gửi cho bạn bè nhé');
    } catch {
      toast(link);
    }
  }

  if (compact) {
    return (
      <div className="table-strip">
        {others.map(({ player }) => (
          <Seat key={player.userId} player={player} position="top" showBacks={false} />
        ))}
        <div className="strip-center">{center}</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <div className="felt">
        <div className="felt-center">{center}</div>
        {others.map(({ player, position }) => (
          <Seat key={player.userId} player={player} position={position} showBacks={showBacks} />
        ))}
        {free.map((position) => (
          <button key={position} className={`seat seat-${position} invite`} onClick={invite}>
            <span className="avatar empty">+</span>
            <span className="seat-name">Mời bạn</span>
          </button>
        ))}
        {me && <Seat player={me} position="bottom" showBacks={false} />}
      </div>
    </div>
  );
}
