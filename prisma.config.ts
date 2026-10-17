import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // Not `env()`: that throws when unset, which breaks `prisma generate` on CI/Vercel installs
  // that have no database. Migrate and seed still need DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL },
});
