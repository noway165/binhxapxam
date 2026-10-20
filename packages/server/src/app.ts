import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import { authRoutes } from './auth/routes';
import type { Store } from './store/types';

export interface AppOptions {
  store: Store;
  jwtSecret: string;
  secureCookies: boolean;
}

export function createApp(opts: AppOptions): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', authRoutes(opts));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  };
  app.use(onError);
  return app;
}
