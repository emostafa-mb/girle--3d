import { killOrphanedWorkers, killOwnedListeners } from './lib/postgres';

// Playwright force-kills the e2e server on Windows; sweep up anything it left behind.
try {
  killOwnedListeners([
    { port: 3100, kind: 'app' },
    { port: 54331, kind: 'postgres' },
  ]);
  killOrphanedWorkers();
} catch (err) {
  console.warn('[e2e-cleanup]', err instanceof Error ? err.message : err);
}
