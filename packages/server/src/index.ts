import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from './app';
import { createMemoryStore } from './store/memoryStore';
import { createPrismaStore } from './store/prismaStore';

const production = process.env.NODE_ENV === 'production';
const portArg = process.argv.indexOf('--port');
const port = Number(portArg > 0 ? process.argv[portArg + 1] : (process.env.PORT ?? 3000));
const jwtSecret = process.env.JWT_SECRET ?? (production ? '' : 'dev-secret-binh');
if (!jwtSecret) throw new Error('JWT_SECRET là bắt buộc khi chạy production');

const store = process.env.DATABASE_URL ? createPrismaStore(process.env.DATABASE_URL) : createMemoryStore();
if (!process.env.DATABASE_URL) console.warn('Không có DATABASE_URL – dữ liệu chỉ lưu trong bộ nhớ');

const dist = process.env.CLIENT_DIST ?? resolve(import.meta.dirname, '../../client/dist');
const clientDist = existsSync(resolve(dist, 'index.html')) ? dist : undefined;

const { httpServer } = createServer({ store, jwtSecret, secureCookies: production, clientDist });
httpServer.listen(port, () => console.log(`Listening on ${port}`));
