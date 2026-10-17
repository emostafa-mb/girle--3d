import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { TestProject } from 'vitest/node';
import { startPostgres, waitForPortFree } from '../../scripts/lib/postgres';

const PORT = 54330;

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const dir = mkdtempSync(path.join(tmpdir(), 'shop-int-'));
  const { pg, url } = await startPostgres({ dir, port: PORT, database: 'shop_test', persistent: false });
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: '' }, stdio: 'inherit' });
  project.provide('databaseUrl', url);
  return async () => {
    await pg.stop();
    await waitForPortFree(PORT);
  };
}
