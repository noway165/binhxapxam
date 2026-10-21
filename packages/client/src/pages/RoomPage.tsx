import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TIME_LIMIT, type RoomStateView } from '@binh/rules';
import ArrangeBoard from '../arrange/ArrangeBoard';
import { useAuth } from '../auth';
import RevealView from '../components/RevealView';
import SoundToggle from '../components/SoundToggle';
import Table from '../table/Table';
import TimerRing from '../table/TimerRing';
import { emitAck, useGame } from '../socket';

export default function RoomPage() {
  const { code = '' } = useParams();
  const game = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const joining = useRef(false);
  const leaving = useRef(false);
  const room = game.room?.code === code ? game.room : null;

  useEffect(() => {
    if (!game.ready || !game.connected || room || joining.current || leaving.current) return;
    joining.current = true;
    void emitAck('room:join', { code }).then((ack) => {
      joining.current = false;
      if (!ack.ok) navigate('/', { replace: true });
    });
  }, [game.ready, game.connected, room, code, navigate]);

  async function leave() {
    // The server clears our room state before acking; don't let the auto-join fire in between.
    leaving.current = true;
    await emitAck('room:leave');
    navigate('/');
  }

  if (!room) return <main className="page narrow">Đang vào phòng {code}…</main>;
  const me = room.players.find((p) => p.userId === user?.id);

  return (
    <main className="page">
      <header className="room-header">
        <span className="code">Phòng {room.code}</span>
        <span className="row">
          <SoundToggle />
          <button className="link" onClick={leave}>
            Rời phòng
          </button>
        </span>
      </header>
      {room.phase === 'WAITING' && <Waiting room={room} myId={user?.id ?? ''} />}
      {room.phase === 'ARRANGING' && <Arranging room={room} myId={user?.id ?? ''} />}
      {room.phase === 'REVEAL' && game.result && (
        <>
          <RevealView key={game.result.gameId ?? 'r'} result={game.result} animate myUserId={user?.id} />
          {me?.isHost ? (
            <button className="primary block" onClick={() => void emitAck('game:next')}>
              Ván mới
            </button>
          ) : (
            <p className="muted center">Chờ chủ phòng bắt đầu ván mới…</p>
          )}
        </>
      )}
    </main>
  );
}

function Arranging({ room, myId }: { room: RoomStateView; myId: string }) {
  const { dealt } = useGame();
  const me = room.players.find((p) => p.userId === myId);
  return (
    <>
      <Table
        room={room}
        myId={myId}
        compact
        center={room.deadline && <TimerRing deadline={room.deadline} totalSec={room.timeLimitSec} />}
      />
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

function Waiting({ room, myId }: { room: RoomStateView; myId: string }) {
  const isHost = !!room.players.find((p) => p.userId === myId)?.isHost;
  return (
    <>
      <Table room={room} myId={myId} center={<span className="felt-title">Binh Xập Xám</span>} />
      <section className="card-panel">
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
    </>
  );
}
