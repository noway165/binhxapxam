import http from 'node:http';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import { apiRoutes } from './api/routes';
import { authRoutes } from './auth/routes';
import { attachSocket } from './socket';
import type { Store } from './store/types';

export interface AppOptions {
  store: Store;
  jwtSecret: string;
  secureCookies: boolean;
  /** Built client (Vite dist) to serve, with index.html as the SPA fallback. */
  clientDist?: string;
}

export function createApp(opts: AppOptions): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', authRoutes(opts));
  app.use('/api', apiRoutes(opts));
  if (opts.clientDist) {
    const dist = opts.clientDist;
    app.use(express.static(dist, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(join(dist, 'index.html'));
    });
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  };
  app.use(onError);
  return app;
}

export function createServer(opts: AppOptions) {
  const app = createApp(opts);
  const httpServer = http.createServer(app);
  const { io, manager } = attachSocket(httpServer, opts);
  return { app, httpServer, io, manager };
}
