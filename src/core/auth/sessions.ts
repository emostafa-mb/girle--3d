import { createHash, randomBytes } from 'node:crypto';
import type { DbClient } from '../db';

export type Realm = 'ADMIN' | 'CUSTOMER';

const HOUR = 60 * 60 * 1000;
export const SESSION_TTL_MS: Record<Realm, number> = {
  ADMIN: 12 * HOUR,
  CUSTOMER: 30 * 24 * HOUR,
};

export type ValidSession = {
  sessionId: string;
  storeId: string;
  realm: Realm;
  subjectId: string;
  expiresAt: Date;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  db: DbClient,
  input: { storeId: string; realm: Realm; subjectId: string; now?: Date },
): Promise<{ token: string; expiresAt: Date }> {
  const now = input.now ?? new Date();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS[input.realm]);
  await db.session.create({
    data: {
      storeId: input.storeId,
      realm: input.realm,
      subjectId: input.subjectId,
      tokenHash: hashToken(token),
      expiresAt,
      createdAt: now,
    },
  });
  return { token, expiresAt };
}

export async function validateSession(
  db: DbClient,
  input: { token: string | undefined; realm: Realm; now?: Date },
): Promise<ValidSession | null> {
  if (!input.token) return null;
  const now = input.now ?? new Date();
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(input.token) } });
  if (!session || session.realm !== input.realm) return null;
  if (session.expiresAt <= now) {
    await db.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  const subjectActive =
    input.realm === 'ADMIN'
      ? await db.admin.count({ where: { id: session.subjectId, isActive: true } })
      : await db.customer.count({ where: { id: session.subjectId, deletedAt: null } });
  if (!subjectActive) return null;
  return {
    sessionId: session.id,
    storeId: session.storeId,
    realm: input.realm,
    subjectId: session.subjectId,
    expiresAt: session.expiresAt,
  };
}

export async function revokeSession(db: DbClient, token: string): Promise<void> {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function revokeAllSessions(db: DbClient, realm: Realm, subjectId: string): Promise<void> {
  await db.session.deleteMany({ where: { realm, subjectId } });
}
