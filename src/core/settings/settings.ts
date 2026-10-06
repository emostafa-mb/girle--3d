import type { DbClient } from '../db';
import { readSettings, type Settings } from './schema';

export async function getSettings(db: DbClient, storeId: string): Promise<Settings> {
  const row = await db.settings.findUnique({ where: { storeId } });
  return readSettings(row?.data);
}
