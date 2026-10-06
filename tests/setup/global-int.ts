import { execFileSync, execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { TestProject } from 'vitest/node';
import { startPostgres } from '../../scripts/lib/postgres';

const PORT = 54330;

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const dir = mkdtempSync(path.join(tmpdir(), 'shop-int-'));
  const { pg, url } = await startPostgres({ dir, port: PORT, database: 'shop_test', persistent: false });
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit' });
  project.provide('databaseUrl', url);
  return async () => {
    await pg.stop();
    await waitForPortFree(PORT);
  };
}

/**
 * On Windows `pg.stop()` kills the postmaster but can leave orphaned `--forkchild` workers that
 * inherited the listen socket, so the next run fails with "could not create any TCP/IP sockets".
 * Kill only embedded-postgres workers whose parent process no longer exists.
 */
function killOrphanedWorkers(): void {
  if (process.platform !== 'win32') return;
  const script = [
    "$all = Get-CimInstance Win32_Process;",
    "$ids = $all | ForEach-Object { $_.ProcessId };",
    "$all | Where-Object { $_.Name -eq 'postgres.exe' -and $_.CommandLine -like '*embedded-postgres*--forkchild*' -and ($ids -notcontains $_.ParentProcessId) } |",
    "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
  ].join(' ');
  try {
    execFileSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' });
  } catch {
    // best effort
  }
}

/**
 * On Windows `pg.stop()` returns before the killed postmaster has released its listen socket,
 * so an immediately following run would fail with "could not create any TCP/IP sockets".
 */
async function waitForPortFree(port: number, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const inUse = await new Promise<boolean>((resolve) => {
      const socket = connect({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });
    if (!inUse) return;
    killOrphanedWorkers();
    await new Promise((r) => setTimeout(r, 500));
  }
}
