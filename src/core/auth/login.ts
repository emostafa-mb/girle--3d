import { z } from 'zod';
import { recordAudit } from '../audit';
import type { DbClient } from '../db';
import { DomainError } from '../errors';
import { hashPassword, verifyPassword } from './password';
import { signInSchema, signUpSchema } from './schemas';
import { createSession, type Realm } from './sessions';

export const RATE_LIMIT = { maxFailures: 5, windowMs: 15 * 60 * 1000 };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validationError(error: z.ZodError): DomainError {
  return new DomainError('VALIDATION', 'Invalid input', {
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  });
}

async function assertNotRateLimited(db: DbClient, storeId: string, realm: Realm, email: string, now: Date) {
  const since = new Date(now.getTime() - RATE_LIMIT.windowMs);
  const failures = await db.loginAttempt.count({
    where: { storeId, realm, email, success: false, createdAt: { gt: since } },
  });
  if (failures >= RATE_LIMIT.maxFailures) throw new DomainError('RATE_LIMITED');
}

let dummyHash: Promise<string> | undefined;
/** Spend comparable time when the account does not exist, so response time does not reveal it. */
async function burnVerifyTime(password: string): Promise<false> {
  dummyHash ??= hashPassword('dummy-password-for-timing');
  await verifyPassword(await dummyHash, password);
  return false;
}

async function recordAttempt(db: DbClient, storeId: string, realm: Realm, email: string, success: boolean, now: Date) {
  await db.loginAttempt.create({ data: { storeId, realm, email, success, createdAt: now } });
}

type LoginInput = { storeId: string; email: string; password: string; now?: Date };

export async function loginAdmin(db: DbClient, input: LoginInput) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  const now = input.now ?? new Date();
  const email = normalizeEmail(parsed.data.email);
  await assertNotRateLimited(db, input.storeId, 'ADMIN', email, now);

  const admin = await db.admin.findUnique({ where: { storeId_email: { storeId: input.storeId, email } } });
  const ok =
    admin && admin.isActive
      ? await verifyPassword(admin.passwordHash, parsed.data.password)
      : await burnVerifyTime(parsed.data.password);
  await recordAttempt(db, input.storeId, 'ADMIN', email, ok, now);
  if (!ok || !admin) throw new DomainError('INVALID_CREDENTIALS');

  await db.admin.update({ where: { id: admin.id }, data: { lastLoginAt: now } });
  await recordAudit(db, {
    storeId: input.storeId,
    adminId: admin.id,
    action: 'auth.login',
    entityType: 'Admin',
    entityId: admin.id,
  });
  const session = await createSession(db, { storeId: input.storeId, realm: 'ADMIN', subjectId: admin.id, now });
  return { ...session, adminId: admin.id };
}

export async function loginCustomer(db: DbClient, input: LoginInput) {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error);
  const now = input.now ?? new Date();
  const email = normalizeEmail(parsed.data.email);
  await assertNotRateLimited(db, input.storeId, 'CUSTOMER', email, now);

  const customer = await db.customer.findUnique({ where: { storeId_email: { storeId: input.storeId, email } } });
  const ok =
    customer && !customer.deletedAt
      ? await verifyPassword(customer.passwordHash, parsed.data.password)
      : await burnVerifyTime(parsed.data.password);
  await recordAttempt(db, input.storeId, 'CUSTOMER', email, ok, now);
  if (!ok || !customer) throw new DomainError('INVALID_CREDENTIALS');

  const session = await createSession(db, { storeId: input.storeId, realm: 'CUSTOMER', subjectId: customer.id, now });
  return { ...session, customerId: customer.id };
}

export async function registerCustomer(
  db: DbClient,
  input: { storeId: string; name: string; email: string; password: string; phone?: string; now?: Date },
) {
  const parsed = signUpSchema.safeParse({ ...input, email: normalizeEmail(input.email) });
  if (!parsed.success) throw validationError(parsed.error);
  const { name, email, password, phone } = parsed.data;

  const existing = await db.customer.findUnique({ where: { storeId_email: { storeId: input.storeId, email } } });
  if (existing) throw new DomainError('EMAIL_TAKEN');

  let customerId: string;
  try {
    const created = await db.customer.create({
      data: { storeId: input.storeId, name, email, phone: phone || null, passwordHash: await hashPassword(password) },
    });
    customerId = created.id;
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') throw new DomainError('EMAIL_TAKEN');
    throw err;
  }
  const session = await createSession(db, { storeId: input.storeId, realm: 'CUSTOMER', subjectId: customerId, now: input.now });
  return { ...session, customerId };
}
