import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeaderboardRow } from '@binh/rules';
import { api } from '../api';
import { useAuth } from '../auth';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.leaderboard().then(setRows, (e: Error) => setError(e.message));
  }, []);

  return (
    <main className="page narrow">
      <Link to="/">← Sảnh</Link>
      <h2>Bảng xếp hạng</h2>
      {error && <p className="error">{error}</p>}
      <ol className="players">
        {rows?.map((r, i) => (
          <li key={r.username} className={r.username === user?.username ? 'me' : ''}>
            <span>
              {MEDALS[i] ?? `${i + 1}.`} {r.username} <span className="muted">· {r.gamesPlayed} ván</span>
            </span>
            <b className={r.totalScore >= 0 ? 'plus' : 'minus'}>{r.totalScore}</b>
          </li>
        ))}
      </ol>
    </main>
  );
}
