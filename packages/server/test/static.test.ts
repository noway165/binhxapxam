import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createMemoryStore } from '../src/store/memoryStore';

function appWithDist() {
  const dist = mkdtempSync(join(tmpdir(), 'binh-dist-'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Binh</title>');
  writeFileSync(join(dist, 'app.js'), 'console.log(1)');
  return createApp({ store: createMemoryStore(), jwtSecret: 's', secureCookies: false, clientDist: dist });
}

describe('serving the built client', () => {
  it('falls back to index.html for client routes', async () => {
    const res = await request(appWithDist()).get('/room/ABC234');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Binh</title>');
  });

  it('serves static assets', async () => {
    const res = await request(appWithDist()).get('/app.js');
    expect(res.text).toBe('console.log(1)');
  });

  it('does not swallow API routes', async () => {
    const res = await request(appWithDist()).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });
});
