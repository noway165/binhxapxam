import { Router } from 'express';
import { requireAuth } from '../auth/jwt';
import type { Store } from '../store/types';

const LIST_LIMIT = 50;

export function apiRoutes(opts: { store: Store; jwtSecret: string }): Router {
  const { store } = opts;
  const r = Router();
  r.use(requireAuth(opts.jwtSecret));

  r.get('/history', async (_req, res) => {
    res.json(await store.listGamesForUser(res.locals.session.uid, LIST_LIMIT));
  });

  r.get('/games/:id', async (req, res) => {
    const game = await store.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Không tìm thấy ván' });
      return;
    }
    res.json(game);
  });

  r.get('/leaderboard', async (_req, res) => {
    res.json(await store.leaderboard(LIST_LIMIT));
  });

  return r;
}
