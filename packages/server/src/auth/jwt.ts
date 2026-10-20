import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'binh_token';
export const SESSION_DAYS = 30;

export interface SessionUser {
  uid: string;
  username: string;
}

export function signToken(user: SessionUser, secret: string): string {
  return jwt.sign(user, secret, { expiresIn: `${SESSION_DAYS}d` });
}

export function verifyToken(token: string | undefined, secret: string): SessionUser | null {
  if (!token) return null;
  try {
    const p = jwt.verify(token, secret) as Partial<SessionUser>;
    return typeof p.uid === 'string' && typeof p.username === 'string' ? { uid: p.uid, username: p.username } : null;
  } catch {
    return null;
  }
}

export function sessionFrom(req: Request, secret: string): SessionUser | null {
  return verifyToken(req.cookies?.[COOKIE_NAME], secret);
}

/** Rejects with 401 unless a valid session cookie is present; puts it in res.locals.session. */
export function requireAuth(secret: string): RequestHandler {
  return (req, res, next) => {
    const s = sessionFrom(req, secret);
    if (!s) {
      res.status(401).json({ error: 'Bạn cần đăng nhập' });
      return;
    }
    res.locals.session = s;
    next();
  };
}
