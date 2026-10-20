import { describe } from 'vitest';
import { createPrismaStore, resetPrismaStoreForTests } from '../src/store/prismaStore';
import { runStoreContract } from './store.contract';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('prisma store', () => {
  runStoreContract('prisma', async () => {
    const store = createPrismaStore(url!);
    await resetPrismaStoreForTests(store);
    return store;
  });
});
