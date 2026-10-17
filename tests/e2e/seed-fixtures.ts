import type { PrismaClient } from '../../src/generated/prisma/client';
import { hashPassword } from '../../src/core/auth/password';
import { E2E } from './fixtures';

export async function seedE2eFixtures(db: PrismaClient, storeId: string): Promise<void> {
  const role = await db.role.upsert({
    where: { storeId_name: { storeId, name: 'Viewer' } },
    create: { storeId, name: 'Viewer', permissions: [] },
    update: {},
  });
  const existing = await db.admin.findUnique({ where: { storeId_email: { storeId, email: E2E.viewer.email } } });
  if (!existing) {
    await db.admin.create({
      data: {
        storeId,
        name: E2E.viewer.name,
        email: E2E.viewer.email,
        passwordHash: await hashPassword(E2E.viewer.password),
        roleId: role.id,
      },
    });
  }
}
