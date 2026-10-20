import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TIME_LIMIT, type RoomStateView } from '@binh/rules';
import { useAuth } from '../auth';
import { emitAck, useGame } from '../socket';
import { toast } from '../toast';

export default function RoomPage() {
  const { code = '' } = useParams();
  const game = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const joining = useRef(false);
  const room = game.room?.code === code ? game.room : null;

  useEffect(() => {
    if (!game.ready || !game.connected || room || joining.current) return;
    joining.current = true;
    void emitAck('room:join', { code }).then((ack) => {
      joining.current = false;
      if (!ack.ok) navigate('/', { replace: true });
    });
  }, [game.ready, game.connected, room, code, navigate]);

  async function leave() {
    await emitAck('room:leave');
    navigate('/');
  }

  if (!room) return <main className="page narrow">Đang vào phòng {code}…</main>;
  const me = room.players.find((p) => p.userId === user?.id);

  return (
    <main className="page">
      <header className="room-header">
        <span>
          Phòng <b>{room.code}</b>
        </span>
        <button className="link" onClick={leave}>
          Rời phòng
        </button>
      </header>
      {room.phase === 'WAITING' && <Waiting room={room} isHost={!!me?.isHost} />}
    </main>
  );
}

function Waiting({ room, isHost }: { room: RoomStateView; isHost: boolean }) {
  const link = `${window.location.origin}/room/${room.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast('Đã sao chép link phòng');
    } catch {
      toast(link);
    }
  }

  return (
    <section className="card-panel">
      <div className="row between">
        <span className="muted">Gửi link cho bạn bè để vào phòng</span>
        <button onClick={copy}>Sao chép link</button>
      </div>
      <ul className="players">
        {room.players.map((p) => (
          <li key={p.userId} className={p.connected ? '' : 'offline'}>
            <span>
              {p.username}
              {p.isHost && <span className="badge">Chủ phòng</span>}
              {!p.connected && <span className="badge gray">Mất kết nối</span>}
            </span>
            <span className={p.roomScore >= 0 ? 'plus' : 'minus'}>{p.roomScore}</span>
          </li>
        ))}
      </ul>
      <label className="row between">
        Thời gian xếp bài
        <select
          value={room.timeLimitSec}
          disabled={!isHost}
          onChange={(e) => void emitAck('room:settings', { timeLimitSec: Number(e.target.value) })}
        >
          {Array.from({ length: (TIME_LIMIT.max - TIME_LIMIT.min) / 15 + 1 }, (_, i) => TIME_LIMIT.min + i * 15).map(
            (s) => (
              <option key={s} value={s}>
                {s} giây
              </option>
            ),
          )}
        </select>
      </label>
      {isHost ? (
        <button className="primary block" disabled={room.players.length < 2} onClick={() => void emitAck('game:start')}>
          {room.players.length < 2 ? 'Chờ thêm người…' : 'Bắt đầu'}
        </button>
      ) : (
        <p className="muted center">Chờ chủ phòng bắt đầu…</p>
      )}
    </section>
  );
}
