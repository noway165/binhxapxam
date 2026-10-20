import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TIME_LIMIT, type RoomStateView } from '@binh/rules';
import ArrangeBoard from '../arrange/ArrangeBoard';
import { useAuth } from '../auth';
import Timer from '../components/Timer';
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
      {room.phase === 'ARRANGING' && <Arranging room={room} myId={user?.id ?? ''} />}
    </main>
  );
}

const STATUS_TEXT = { arranging: 'Đang xếp', submitted: 'Xong', waitingNext: 'Chờ ván sau', idle: '' } as const;

function Arranging({ room, myId }: { room: RoomStateView; myId: string }) {
  const { dealt } = useGame();
  const me = room.players.find((p) => p.userId === myId);
  const others = room.players.filter((p) => p.userId !== myId);
  return (
    <>
      <div className="opponents">
        {others.map((p) => (
          <span key={p.userId} className={`opponent ${p.status}`}>
            {p.username}: {p.connected ? STATUS_TEXT[p.status] : 'Mất kết nối'}
          </span>
        ))}
        {room.deadline && <Timer deadline={room.deadline} />}
      </div>
      {me?.status === 'waitingNext' || !dealt ? (
        <p className="card-panel center muted">Bạn sẽ chơi từ ván sau…</p>
      ) : (
        <ArrangeBoard
          key={dealt.deadline}
          cards={dealt.cards}
          initial={dealt.submitted}
          locked={me?.status === 'submitted'}
          onSubmit={(a) => void emitAck('hand:submit', a)}
          onUnsubmit={() => void emitAck('hand:unsubmit')}
        />
      )}
    </>
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
