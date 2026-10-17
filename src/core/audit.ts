import type { Prisma } from '@/generated/prisma/client';
import type { DbClient } from './db';

export async function recordAudit(
  db: DbClient,
  entry: {
    storeId: string;
    adminId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    diff?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.auditLog.create({
    data: {
      storeId: entry.storeId,
      adminId: entry.adminId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      diff: entry.diff,
    },
  });
}
