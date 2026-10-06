import type { PrismaClient } from '@/generated/prisma/client';
import { normalizeEmail } from '../auth/login';
import { hashPassword } from '../auth/password';
import { OWNER_ROLE_NAME, PERMISSIONS } from '../auth/permissions';
import { defaultSettings } from '../settings/schema';

export type SeedFoundationInput = {
  storeSlug: string;
  owner: { name: string; email: string; password: string };
};

export async function seedFoundation(db: PrismaClient, input: SeedFoundationInput) {
  const store = await db.store.upsert({
    where: { slug: input.storeSlug },
    create: { slug: input.storeSlug },
    update: {},
  });
  await db.settings.upsert({
    where: { storeId: store.id },
    create: { storeId: store.id, data: defaultSettings },
    update: {},
  });
  const ownerRole = await db.role.upsert({
    where: { storeId_name: { storeId: store.id, name: OWNER_ROLE_NAME } },
    create: { storeId: store.id, name: OWNER_ROLE_NAME, isSystem: true, permissions: [...PERMISSIONS] },
    update: { isSystem: true, permissions: [...PERMISSIONS] },
  });
  const email = normalizeEmail(input.owner.email);
  const existing = await db.admin.findUnique({ where: { storeId_email: { storeId: store.id, email } } });
  if (!existing) {
    await db.admin.create({
      data: {
        storeId: store.id,
        name: input.owner.name,
        email,
        passwordHash: await hashPassword(input.owner.password),
        roleId: ownerRole.id,
      },
    });
  }
  return { storeId: store.id, ownerRoleId: ownerRole.id };
}
