import 'server-only';
import { cache } from 'react';
import { getSettings } from '@/core/settings/settings';
import { db } from './db';

let cachedStoreId: string | undefined;

export async function getStoreId(): Promise<string> {
  if (cachedStoreId) return cachedStoreId;
  const slug = process.env.STORE_SLUG ?? 'default';
  const store = await db.store.findUnique({ where: { slug } });
  if (!store) throw new Error(`Store "${slug}" not found. Run "npm run setup" first.`);
  cachedStoreId = store.id;
  return store.id;
}

export const getStoreSettings = cache(async () => getSettings(db, await getStoreId()));
