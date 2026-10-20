import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { emitAck, useGame } from '../socket';

export default function Lobby() {
  const { user, refresh, logout } = useAuth();
  const game = useGame();
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createRoom() {
    const ack = await emitAck('room:create');
    if (ack.ok && ack.code) navigate(`/room/${ack.code}`);
  }

  function joinRoom(e: FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c) navigate(`/room/${c}`);
  }

  return (
    <main className="page narrow">
      <h1 className="logo">Binh Xập Xám</h1>
      <section className="card-panel">
        <p>
          Xin chào <b>{user?.username}</b>
        </p>
        <p className="muted">
          Tổng điểm: <b className={(user?.totalScore ?? 0) >= 0 ? 'plus' : 'minus'}>{user?.totalScore ?? 0}</b> ·{' '}
          {user?.gamesPlayed ?? 0} ván
        </p>
      </section>

      {game.room && (
        <Link className="button primary block" to={`/room/${game.room.code}`}>
          Quay lại phòng {game.room.code}
        </Link>
      )}

      <section className="card-panel">
        <button className="primary block" onClick={createRoom} disabled={!game.connected}>
          Tạo phòng
        </button>
        <form className="row" onSubmit={joinRoom}>
          <input
            aria-label="Mã phòng"
            placeholder="Mã phòng"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit">Vào</button>
        </form>
      </section>

      <nav className="links">
        <Link to="/history">Lịch sử</Link>
        <Link to="/leaderboard">Bảng xếp hạng</Link>
        <button className="link" onClick={() => void logout()}>
          Đăng xuất
        </button>
      </nav>
    </main>
  );
}
