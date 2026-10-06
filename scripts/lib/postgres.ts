import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export const PG_USER = 'postgres';
export const PG_PASSWORD = 'postgres';

export async function startPostgres(opts: {
  dir: string;
  port: number;
  database: string;
  persistent?: boolean;
}): Promise<{ pg: EmbeddedPostgres; url: string }> {
  const pg = new EmbeddedPostgres({
    databaseDir: opts.dir,
    user: PG_USER,
    password: PG_PASSWORD,
    port: opts.port,
    persistent: opts.persistent ?? true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });
  if (!existsSync(path.join(opts.dir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(opts.database);
  } catch (err) {
    if (!String(err).includes('already exists')) throw err;
  }
  return {
    pg,
    url: `postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${opts.port}/${opts.database}`,
  };
}

/**
 * On Windows `pg.stop()` kills the postmaster but can leave orphaned `--forkchild` workers that
 * inherited the listen socket, so the next run fails with "could not create any TCP/IP sockets".
 * Kill only embedded-postgres workers whose parent process no longer exists.
 */
export function killOrphanedWorkers(): void {
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
export async function waitForPortFree(port: number, timeoutMs = 20_000): Promise<void> {
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

/**
 * Playwright force-kills this process on Windows, so shutdown handlers may never run and the e2e
 * postmaster can outlive us. These ports are dedicated to e2e, so free them before starting.
 */
export function killListeners(ports: number[]): void {
  if (process.platform !== 'win32') return;
  const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
  const pids = new Set<string>();
  for (const line of out.split(/\r?\n/)) {
    const m = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/);
    if (m && ports.includes(Number(m[1]))) pids.add(m[2]);
  }
  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // already gone
    }
  }
}
