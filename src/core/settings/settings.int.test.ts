import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../../tests/helpers/db';
import { defaultSettings } from './schema';
import { getSettings } from './settings';

const db = testDb();
afterAll(() => db.$disconnect());
let storeId: string;
beforeEach(async () => {
  await resetDb(db);
  storeId = (await makeStore(db)).id;
});

describe('getSettings', () => {
  it('returns defaults when the store has no settings row', async () => {
    expect(await getSettings(db, storeId)).toEqual(defaultSettings);
  });

  it('merges stored values over defaults', async () => {
    await db.settings.create({ data: { storeId, data: { storeName: { en: 'Nile Wear' }, primaryColor: '#0b7285' } } });
    const s = await getSettings(db, storeId);
    expect(s.storeName).toEqual({ en: 'Nile Wear' });
    expect(s.primaryColor).toBe('#0b7285');
    expect(s.currency).toBe(defaultSettings.currency);
  });
});
