import { Router, type CookieOptions, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { MeResponse } from '@binh/rules';
import { UsernameTakenError, type Store, type UserRecord } from '../store/types';
import { COOKIE_NAME, SESSION_DAYS, requireAuth, signToken } from './jwt';
import { checkPassword, hashPassword } from './password';

const Credentials = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/, 'Tên đăng nhập 3–20 ký tự: chữ, số, _'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100, 'Mật khẩu quá dài'),
});

const me = (u: UserRecord): MeResponse => ({
  id: u.id,
  username: u.username,
  totalScore: u.totalScore,
  gamesPlayed: u.gamesPlayed,
});

export function authRoutes(opts: { store: Store; jwtSecret: string; secureCookies: boolean }): Router {
  const { store, jwtSecret } = opts;
  const r = Router();
  const cookie: CookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: opts.secureCookies,
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
    path: '/',
  };
  const startSession = (res: Response, u: UserRecord) =>
    res.cookie(COOKIE_NAME, signToken({ uid: u.id, username: u.username }, jwtSecret), cookie);

  r.post('/register', async (req, res) => {
    const parsed = Credentials.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    try {
      const u = await store.createUser(parsed.data.username, await hashPassword(parsed.data.password));
      startSession(res, u).status(201).json(me(u));
    } catch (e) {
      if (e instanceof UsernameTakenError) {
        res.status(409).json({ error: e.message });
        return;
      }
      throw e;
    }
  });

  const loginLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Đăng nhập sai quá nhiều lần, thử lại sau một phút' },
  });

  r.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body ?? {};
    const u = typeof username === 'string' ? await store.findUserByUsername(username) : null;
    if (!u || typeof password !== 'string' || !(await checkPassword(password, u.passwordHash))) {
      res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
      return;
    }
    startSession(res, u).json(me(u));
  });

  r.post('/logout', (_req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/' }).json({ ok: true });
  });

  r.get('/me', requireAuth(jwtSecret), async (_req, res) => {
    const u = await store.findUserById(res.locals.session.uid);
    if (!u) {
      res.status(401).json({ error: 'Bạn cần đăng nhập' });
      return;
    }
    res.json(me(u));
  });

  return r;
}
