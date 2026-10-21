import type { RoomPlayerView } from '@binh/rules';
import PlayingCard from '../cards/PlayingCard';
import { avatarColor, initials } from './avatar';
import type { SeatPosition } from './seating';

const DUMMY = { rank: 2, suit: 'S' } as const;
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

interface Props {
  player: RoomPlayerView;
  position: SeatPosition | 'bottom';
  /** Show a small stack of face-down cards once the player has submitted. */
  showBacks: boolean;
}

export default function Seat({ player, position, showBacks }: Props) {
  const status = !player.connected ? (
    <span className="seat-status offline">Mất kết nối</span>
  ) : player.status === 'submitted' ? (
    <span className="seat-status done">
      <span aria-hidden="true">✓</span>
      <span>Xong</span>
    </span>
  ) : player.status === 'arranging' ? (
    <span className="seat-status busy">Đang xếp</span>
  ) : player.status === 'waitingNext' ? (
    <span className="seat-status">Chờ ván sau</span>
  ) : null;

  return (
    <div className={`seat seat-${position}${player.connected ? '' : ' offline'}`}>
      <div className="avatar" style={{ background: avatarColor(player.username) }}>
        {initials(player.username)}
        {player.isHost && (
          <span className="crown" aria-label="Chủ phòng" title="Chủ phòng">
            👑
          </span>
        )}
      </div>
      <div className="seat-info">
        <span className="seat-name">{player.username}</span>
        <span className={player.roomScore >= 0 ? 'seat-score plus' : 'seat-score minus'}>
          {signed(player.roomScore)}
        </span>
        {status}
      </div>
      {showBacks && player.status === 'submitted' && (
        <div className="seat-backs">
          {[0, 1, 2].map((i) => (
            <PlayingCard key={i} card={DUMMY} faceDown size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
