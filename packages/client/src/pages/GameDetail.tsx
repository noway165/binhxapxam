import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { GameDetail as Detail } from '@binh/rules';
import { api } from '../api';
import { useAuth } from '../auth';
import RevealView from '../components/RevealView';

export default function GameDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [game, setGame] = useState<Detail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.game(id).then(setGame, (e: Error) => setError(e.message));
  }, [id]);

  return (
    <main className="page">
      <Link to="/history">← Lịch sử</Link>
      {error && <p className="error">{error}</p>}
      {game && (
        <>
          <p className="muted">{new Date(game.endedAt).toLocaleString('vi-VN')}</p>
          <RevealView result={game} animate={false} myUserId={user?.id} />
        </>
      )}
    </main>
  );
}
