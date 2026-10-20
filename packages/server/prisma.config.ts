import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // Placeholder lets `prisma generate` run without a database (e.g. during the Render build).
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/binh',
  },
});
