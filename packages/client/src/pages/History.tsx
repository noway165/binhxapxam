import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GameSummary } from '@binh/rules';
import { api } from '../api';

export default function History() {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.history().then(setGames, (e: Error) => setError(e.message));
  }, []);

  return (
    <main className="page narrow">
      <Link to="/">← Sảnh</Link>
      <h2>Lịch sử ván</h2>
      {error && <p className="error">{error}</p>}
      {games?.length === 0 && <p className="muted">Bạn chưa chơi ván nào.</p>}
      <ul className="players">
        {games?.map((g) => (
          <li key={g.id}>
            <Link to={`/games/${g.id}`} className="history-link">
              <span className="muted">{new Date(g.endedAt).toLocaleString('vi-VN')}</span>
              <span>{g.players.map((p) => p.username).join(', ')}</span>
            </Link>
            <b className={g.myScore >= 0 ? 'plus' : 'minus'}>{g.myScore > 0 ? `+${g.myScore}` : g.myScore}</b>
          </li>
        ))}
      </ul>
    </main>
  );
}
