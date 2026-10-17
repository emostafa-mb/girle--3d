import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedFoundation } from '../src/core/setup/seed-foundation';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedE2eFixtures } from '../tests/e2e/seed-fixtures';

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (see .env.example).');
  const { storeId } = await seedFoundation(db, {
    storeSlug: process.env.STORE_SLUG ?? 'default',
    owner: { name: process.env.SEED_ADMIN_NAME ?? 'Store Owner', email, password },
  });
  if (process.env.SEED_E2E_FIXTURES === '1') await seedE2eFixtures(db, storeId);
  console.log(`Seed complete for store "${process.env.STORE_SLUG ?? 'default'}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
