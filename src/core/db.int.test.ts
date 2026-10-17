import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../tests/helpers/db';

const db = testDb();
beforeEach(() => resetDb(db));
afterAll(() => db.$disconnect());

describe('database harness', () => {
  it('creates and reads a store', async () => {
    const store = await makeStore(db, 'acme');
    const found = await db.store.findUnique({ where: { slug: 'acme' } });
    expect(found?.id).toBe(store.id);
  });

  it('resetDb empties tables between tests', async () => {
    expect(await db.store.count()).toBe(0);
  });
});
