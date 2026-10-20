/**
 * Dev-only bot: logs in (registering if needed), joins a room and auto-arranges every hand.
 * Usage: npx tsx packages/server/scripts/devBot.ts <ROOM_CODE> [botName] [serverUrl]
 */
import { io } from 'socket.io-client';
import { autoArrange, type DealtPayload, type GameResultPayload } from '@binh/rules';

const [code, name = 'bot_1', url = 'http://localhost:3000'] = process.argv.slice(2);
if (!code) {
  console.error('Usage: devBot.ts <ROOM_CODE> [botName] [serverUrl]');
  process.exit(1);
}
const password = 'bot-password';

async function session(): Promise<string> {
  for (const path of ['/api/login', '/api/register']) {
    const res = await fetch(url + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password }),
    });
    if (res.ok) return res.headers.get('set-cookie')!.split(';')[0];
  }
  throw new Error('Không đăng nhập được bot');
}

const cookie = await session();
const socket = io(url, { transports: ['websocket'], extraHeaders: { cookie } });

socket.on('connect', () => {
  socket.emit('room:join', { code }, (ack: unknown) => console.log(`[${name}] join`, ack));
});
socket.on('game:dealt', (d: DealtPayload) => {
  if (d.submitted) return;
  setTimeout(() => {
    socket.emit('hand:submit', autoArrange(d.cards), (ack: unknown) => console.log(`[${name}] submit`, ack));
  }, 2000);
});
socket.on('game:result', (r: GameResultPayload) => {
  console.log(`[${name}] result`, r.players.map((p) => `${p.username}:${p.score}`).join(' '));
});
socket.on('connect_error', (e) => console.error(`[${name}]`, e.message));
