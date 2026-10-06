import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDb, testDb } from '../../../tests/helpers/db';
import { OWNER_ROLE_NAME, PERMISSIONS } from '../auth/permissions';
import { verifyPassword } from '../auth/password';
import { getSettings } from '../settings/settings';
import { defaultSettings } from '../settings/schema';
import { seedFoundation } from './seed-foundation';

const db = testDb();
afterAll(() => db.$disconnect());
beforeEach(() => resetDb(db));

const input = { storeSlug: 'default', owner: { name: 'Owner', email: ' Owner@Example.com ', password: 'owner-pass-1' } };

describe('seedFoundation', () => {
  it('creates store, default settings, system Owner role and owner admin', async () => {
    const { storeId, ownerRoleId } = await seedFoundation(db, input);
    expect(await getSettings(db, storeId)).toEqual(defaultSettings);
    const role = await db.role.findUniqueOrThrow({ where: { id: ownerRoleId } });
    expect(role).toMatchObject({ name: OWNER_ROLE_NAME, isSystem: true });
    expect(role.permissions).toEqual([...PERMISSIONS]);
    const admin = await db.admin.findFirstOrThrow({ where: { storeId } });
    expect(admin.email).toBe('owner@example.com');
    expect(admin.roleId).toBe(ownerRoleId);
    expect(await verifyPassword(admin.passwordHash, 'owner-pass-1')).toBe(true);
  });

  it('is idempotent and does not overwrite an existing owner password', async () => {
    await seedFoundation(db, input);
    await seedFoundation(db, { ...input, owner: { ...input.owner, password: 'different-pass' } });
    expect(await db.store.count()).toBe(1);
    expect(await db.role.count()).toBe(1);
    expect(await db.admin.count()).toBe(1);
    const admin = await db.admin.findFirstOrThrow();
    expect(await verifyPassword(admin.passwordHash, 'owner-pass-1')).toBe(true);
  });
});
