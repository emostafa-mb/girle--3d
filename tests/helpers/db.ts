import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { PrismaClient } from '@/generated/prisma/client';

let client: PrismaClient | undefined;

export function testDb(): PrismaClient {
  client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('databaseUrl') }) });
  return client;
}

export async function resetDb(db: PrismaClient): Promise<void> {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export async function makeStore(db: PrismaClient, slug = 'default') {
  return db.store.create({ data: { slug } });
}
