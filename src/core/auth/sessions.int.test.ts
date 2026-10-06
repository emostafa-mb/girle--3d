import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { makeStore, resetDb, testDb } from '../../../tests/helpers/db';
import { createSession, hashToken, revokeAllSessions, revokeSession, SESSION_TTL_MS, validateSession } from './sessions';

const db = testDb();
afterAll(() => db.$disconnect());

let storeId: string;
let adminId: string;
let customerId: string;

beforeEach(async () => {
  await resetDb(db);
  storeId = (await makeStore(db)).id;
  const role = await db.role.create({ data: { storeId, name: 'Staff', permissions: [] } });
  adminId = (await db.admin.create({
    data: { storeId, name: 'A', email: 'a@x.com', passwordHash: 'h', roleId: role.id },
  })).id;
  customerId = (await db.customer.create({
    data: { storeId, name: 'C', email: 'c@x.com', passwordHash: 'h' },
  })).id;
});

describe('sessions', () => {
  it('stores only the token hash and validates the raw token', async () => {
    const { token, expiresAt } = await createSession(db, { storeId, realm: 'CUSTOMER', subjectId: customerId });
    const row = await db.session.findFirstOrThrow();
    expect(row.tokenHash).toBe(hashToken(token));
    expect(row.tokenHash).not.toContain(token);
    const s = await validateSession(db, { token, realm: 'CUSTOMER' });
    expect(s).toMatchObject({ subjectId: customerId, storeId, realm: 'CUSTOMER' });
    expect(s?.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it('rejects a customer token presented in the admin realm', async () => {
    const { token } = await createSession(db, { storeId, realm: 'CUSTOMER', subjectId: customerId });
    expect(await validateSession(db, { token, realm: 'ADMIN' })).toBeNull();
  });

  it('rejects missing and unknown tokens', async () => {
    expect(await validateSession(db, { token: undefined, realm: 'ADMIN' })).toBeNull();
    expect(await validateSession(db, { token: 'nope', realm: 'ADMIN' })).toBeNull();
  });

  it('expires sessions after the realm TTL and deletes them', async () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const { token } = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId, now });
    const justBefore = new Date(now.getTime() + SESSION_TTL_MS.ADMIN - 1);
    expect(await validateSession(db, { token, realm: 'ADMIN', now: justBefore })).not.toBeNull();
    const after = new Date(now.getTime() + SESSION_TTL_MS.ADMIN);
    expect(await validateSession(db, { token, realm: 'ADMIN', now: after })).toBeNull();
    expect(await db.session.count()).toBe(0);
  });

  it('invalidates sessions of a deactivated admin', async () => {
    const { token } = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId });
    await db.admin.update({ where: { id: adminId }, data: { isActive: false } });
    expect(await validateSession(db, { token, realm: 'ADMIN' })).toBeNull();
  });

  it('invalidates sessions of a soft-deleted customer', async () => {
    const { token } = await createSession(db, { storeId, realm: 'CUSTOMER', subjectId: customerId });
    await db.customer.update({ where: { id: customerId }, data: { deletedAt: new Date() } });
    expect(await validateSession(db, { token, realm: 'CUSTOMER' })).toBeNull();
  });

  it('revokes one session or all sessions of a subject', async () => {
    const a = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId });
    const b = await createSession(db, { storeId, realm: 'ADMIN', subjectId: adminId });
    await revokeSession(db, a.token);
    expect(await validateSession(db, { token: a.token, realm: 'ADMIN' })).toBeNull();
    expect(await validateSession(db, { token: b.token, realm: 'ADMIN' })).not.toBeNull();
    await revokeAllSessions(db, 'ADMIN', adminId);
    expect(await validateSession(db, { token: b.token, realm: 'ADMIN' })).toBeNull();
  });
});
