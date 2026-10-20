import { createMemoryStore } from '../src/store/memoryStore';
import { runStoreContract } from './store.contract';

runStoreContract('memory', async () => createMemoryStore());
