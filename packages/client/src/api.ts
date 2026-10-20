import type { GameDetail, GameSummary, LeaderboardRow, MeResponse } from '@binh/rules';

async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
  return data as T;
}

export const api = {
  me: () => call<MeResponse>('GET', '/me'),
  login: (username: string, password: string) => call<MeResponse>('POST', '/login', { username, password }),
  register: (username: string, password: string) => call<MeResponse>('POST', '/register', { username, password }),
  logout: () => call<{ ok: true }>('POST', '/logout'),
  history: () => call<GameSummary[]>('GET', '/history'),
  game: (id: string) => call<GameDetail>('GET', `/games/${encodeURIComponent(id)}`),
  leaderboard: () => call<LeaderboardRow[]>('GET', '/leaderboard'),
};
