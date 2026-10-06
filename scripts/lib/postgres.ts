import { existsSync } from 'node:fs';
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
