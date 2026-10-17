import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  // Not `env()`: that throws when unset, which breaks `prisma generate` on CI/Vercel installs
  // that have no database. Migrations need a session connection, so hosted databases with a
  // transaction pooler (e.g. Supabase on port 6543) set DIRECT_URL to the session/direct URL.
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
});
