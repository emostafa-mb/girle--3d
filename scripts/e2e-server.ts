import { execSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { E2E } from '../tests/e2e/fixtures';
import { killOwnedListeners, killOrphanedWorkers, startPostgres, waitForPortFree } from './lib/postgres';

const PORT = 3100;
const PG_PORT = 54331;

async function main() {
  // Self-heal leftovers from a previously crashed run.
  killOwnedListeners([
    { port: PORT, kind: 'app' },
    { port: PG_PORT, kind: 'postgres' },
  ]);
  killOrphanedWorkers();
  await waitForPortFree(PG_PORT);

  const dir = mkdtempSync(path.join(tmpdir(), 'shop-e2e-'));
  const { pg, url } = await startPostgres({ dir, port: PG_PORT, database: 'shop_e2e', persistent: false });
  const swcCache = path.resolve('.cache', 'swc');
  mkdirSync(swcCache, { recursive: true });
  const env = {
    ...process.env,
    DATABASE_URL: url,
    STORE_SLUG: 'default',
    SEED_ADMIN_NAME: E2E.owner.name,
    SEED_ADMIN_EMAIL: E2E.owner.email,
    SEED_ADMIN_PASSWORD: E2E.owner.password,
    SEED_E2E_FIXTURES: '1',
    SWC_NATIVE_BINDING_CACHE: swcCache,
  };
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npx prisma db seed', { env, stdio: 'inherit' });
  if (!process.env.E2E_SKIP_BUILD) execSync('npx next build', { env, stdio: 'inherit' });

  const app = spawn('npx', ['next', 'start', '-p', String(PORT)], { env, stdio: 'inherit', shell: true });
  let shuttingDown = false;
  const shutdown = async (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (app.pid) {
      try {
        if (process.platform === 'win32') execSync(`taskkill /PID ${app.pid} /T /F`, { stdio: 'ignore' });
        else app.kill();
      } catch {
        // already exited
      }
    }
    await pg.stop();
    if (process.platform === 'win32') {
      killOrphanedWorkers();
      await waitForPortFree(PG_PORT);
    }
    process.exit(code);
  };
  process.on('SIGINT', () => shutdown());
  process.on('SIGTERM', () => shutdown());
  app.on('exit', (code) => shutdown(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
