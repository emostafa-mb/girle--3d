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

export type ListenerKind = 'postgres' | 'app';

type Proc = { image: string; cmd: string };

function describeProcess(pid: string): Proc | null {
  try {
    const out = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${Number(pid)}"; if ($p) { $p.Name + [char]9 + $p.CommandLine }`,
      ],
      { encoding: 'utf8' },
    ).trim();
    if (!out) return null;
    const [image = '', ...rest] = out.split('\t');
    return { image, cmd: rest.join('\t') };
  } catch {
    return null;
  }
}

const norm = (v: string) => v.split(String.fromCharCode(92)).join('/').toLowerCase();

export function isOwnedCommandLine(kind: ListenerKind, image: string, cmdline: string, repoRoot: string): boolean {
  const cmd = norm(cmdline);
  if (kind === 'postgres') return image.toLowerCase() === 'postgres.exe' && cmd.includes('embedded-postgres');
  return cmd.includes(`${norm(repoRoot).replace(/\/+$/, '')}/`) && cmd.includes('node_modules/next');
}

function isOwned(kind: ListenerKind, proc: Proc): boolean {
  return isOwnedCommandLine(kind, proc.image, proc.cmd, process.cwd());
}

/**
 * Windows only. Kills listeners on the given e2e ports, but only processes this project demonstrably
 * owns (embedded postgres, or a `next` process started from this repo). Any other listener causes a
 * thrown error and is never killed. Failures to inspect the system are logged and skipped.
 */
export function killOwnedListeners(ports: { port: number; kind: ListenerKind }[]): void {
  if (process.platform !== 'win32') return;
  let out: string;
  try {
    out = execSync('netstat -ano', { encoding: 'utf8' });
  } catch (err) {
    console.warn('[e2e] could not run netstat; skipping port cleanup:', err);
    return;
  }
  const errors: string[] = [];
  for (const line of out.split(String.fromCharCode(10))) {
    const m = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/);
    if (!m) continue;
    const target = ports.find((p) => p.port === Number(m[1]));
    const pid = m[2];
    if (!target || pid === '0' || pid === '4') continue;
    const proc = describeProcess(pid);
    if (!proc) {
      console.warn(`[e2e] could not inspect PID ${pid} on port ${target.port}; leaving it alone`);
      continue;
    }
    if (!isOwned(target.kind, proc)) {
      errors.push(
        `Port ${target.port} is in use by PID ${pid} (${proc.image}), which this project did not start. Stop it and retry.`,
      );
      continue;
    }
    try {
      execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore' });
    } catch {
      // already gone
    }
  }
  if (errors.length) throw new Error(errors.join(String.fromCharCode(10)));
}
