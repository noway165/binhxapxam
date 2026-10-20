import { createServer } from './app';
import { createMemoryStore } from './store/memoryStore';
import { createPrismaStore } from './store/prismaStore';

const production = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.JWT_SECRET ?? (production ? '' : 'dev-secret-binh');
if (!jwtSecret) throw new Error('JWT_SECRET là bắt buộc khi chạy production');

const store = process.env.DATABASE_URL ? createPrismaStore(process.env.DATABASE_URL) : createMemoryStore();
if (!process.env.DATABASE_URL) console.warn('Không có DATABASE_URL – dữ liệu chỉ lưu trong bộ nhớ');

const { httpServer } = createServer({ store, jwtSecret, secureCookies: production });
httpServer.listen(port, () => console.log(`Listening on ${port}`));
