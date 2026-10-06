import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../../tests/helpers/db';
import type { ErrorCode } from '../errors';
import { loginAdmin, loginCustomer, normalizeEmail, RATE_LIMIT, registerCustomer } from './login';
import { hashPassword } from './password';
import { validateSession } from './sessions';

const db = testDb();
afterAll(() => db.$disconnect());

let storeId: string;
beforeEach(async () => {
  await resetDb(db);
  storeId = (await makeStore(db)).id;
});

async function expectCode(p: Promise<unknown>, code: ErrorCode) {
  await expect(p).rejects.toMatchObject({ code });
}

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Sara@Example.COM ')).toBe('sara@example.com');
  });
});

describe('registerCustomer', () => {
  it('creates a customer with normalized email and returns a valid session', async () => {
    const r = await registerCustomer(db, { storeId, name: 'Sara', email: ' Sara@Example.com ', password: 'secret123' });
    const c = await db.customer.findUniqueOrThrow({ where: { id: r.customerId } });
    expect(c.email).toBe('sara@example.com');
    expect(c.passwordHash).not.toBe('secret123');
    expect(await validateSession(db, { token: r.token, realm: 'CUSTOMER' })).not.toBeNull();
  });

  it('rejects a duplicate email differing only by case', async () => {
    await registerCustomer(db, { storeId, name: 'Sara', email: 'sara@example.com', password: 'secret123' });
    await expectCode(
      registerCustomer(db, { storeId, name: 'Sara 2', email: 'SARA@example.com', password: 'secret123' }),
      'EMAIL_TAKEN',
    );
  });

  it('validates input and reports field errors', async () => {
    const p = registerCustomer(db, { storeId, name: '', email: 'not-an-email', password: 'short' });
    await expect(p).rejects.toMatchObject({ code: 'VALIDATION' });
    const err = await p.catch((e) => e);
    expect(Object.keys(err.details.fieldErrors).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('loginCustomer', () => {
  beforeEach(async () => {
    await registerCustomer(db, { storeId, name: 'Sara', email: 'sara@example.com', password: 'secret123' });
  });

  it('signs in regardless of email case/whitespace', async () => {
    const r = await loginCustomer(db, { storeId, email: '  SARA@example.com', password: 'secret123' });
    expect(await validateSession(db, { token: r.token, realm: 'CUSTOMER' })).not.toBeNull();
  });

  it('rejects wrong password and unknown email with the same error', async () => {
    await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'nope-nope' }), 'INVALID_CREDENTIALS');
    await expectCode(loginCustomer(db, { storeId, email: 'who@example.com', password: 'secret123' }), 'INVALID_CREDENTIALS');
  });

  it('rejects a soft-deleted customer', async () => {
    await db.customer.updateMany({ data: { deletedAt: new Date() } });
    await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'secret123' }), 'INVALID_CREDENTIALS');
  });

  it('concurrent wrong-password attempts never get more than the limit verified', async () => {
    const t0 = new Date('2026-03-01T10:00:00Z');
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () =>
        loginCustomer(db, { storeId, email: 'sara@example.com', password: 'wrong-pass', now: t0 }),
      ),
    );
    const codes = results.map((r) => (r.status === 'rejected' ? (r.reason as { code?: string }).code : 'OK'));
    expect(codes.filter((c) => c === 'INVALID_CREDENTIALS').length).toBeLessThanOrEqual(RATE_LIMIT.maxFailures);
    expect(codes.every((c) => c === 'INVALID_CREDENTIALS' || c === 'RATE_LIMITED')).toBe(true);
    const failures = await db.loginAttempt.count({ where: { email: 'sara@example.com', success: false } });
    expect(failures).toBeLessThanOrEqual(RATE_LIMIT.maxFailures);
  });

  it(`rate-limits after ${RATE_LIMIT.maxFailures} failures, even with the right password, until the window passes`, async () => {
    const t0 = new Date('2026-01-01T10:00:00Z');
    for (let i = 0; i < RATE_LIMIT.maxFailures; i++) {
      await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'wrong-pass', now: t0 }), 'INVALID_CREDENTIALS');
    }
    await expectCode(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'secret123', now: t0 }), 'RATE_LIMITED');
    const later = new Date(t0.getTime() + RATE_LIMIT.windowMs + 1000);
    await expect(loginCustomer(db, { storeId, email: 'sara@example.com', password: 'secret123', now: later })).resolves.toHaveProperty('token');
  });
});

describe('loginAdmin', () => {
  let adminId: string;
  beforeEach(async () => {
    const role = await db.role.create({ data: { storeId, name: 'Staff', permissions: [] } });
    adminId = (await db.admin.create({
      data: { storeId, name: 'Omar', email: 'omar@example.com', passwordHash: await hashPassword('adminpass1'), roleId: role.id },
    })).id;
  });

  it('signs in, records lastLoginAt and an audit entry', async () => {
    const now = new Date('2026-02-02T08:00:00Z');
    const r = await loginAdmin(db, { storeId, email: 'Omar@Example.com', password: 'adminpass1', now });
    expect(r.adminId).toBe(adminId);
    expect(await validateSession(db, { token: r.token, realm: 'ADMIN', now })).not.toBeNull();
    const admin = await db.admin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.lastLoginAt?.toISOString()).toBe(now.toISOString());
    const audit = await db.auditLog.findFirstOrThrow();
    expect(audit).toMatchObject({ action: 'auth.login', adminId, entityType: 'Admin', entityId: adminId });
  });

  it('rejects an inactive admin', async () => {
    await db.admin.update({ where: { id: adminId }, data: { isActive: false } });
    await expectCode(loginAdmin(db, { storeId, email: 'omar@example.com', password: 'adminpass1' }), 'INVALID_CREDENTIALS');
  });

  it('admin and customer rate limits are counted separately', async () => {
    const t0 = new Date('2026-01-01T10:00:00Z');
    for (let i = 0; i < RATE_LIMIT.maxFailures; i++) {
      await expectCode(loginCustomer(db, { storeId, email: 'omar@example.com', password: 'x-x-x-x-x', now: t0 }), 'INVALID_CREDENTIALS');
    }
    await expect(loginAdmin(db, { storeId, email: 'omar@example.com', password: 'adminpass1', now: t0 })).resolves.toHaveProperty('token');
  });
});
