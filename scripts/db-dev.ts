import path from 'node:path';
import { startPostgres } from './lib/postgres';

async function main() {
  const { pg, url } = await startPostgres({
    dir: path.resolve('.pg/dev'),
    port: 54329,
    database: 'shop_dev',
  });
  console.log(`Postgres running: ${url}\nPress Ctrl+C to stop.`);
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  setInterval(() => {}, 1 << 30); // keep process alive
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
