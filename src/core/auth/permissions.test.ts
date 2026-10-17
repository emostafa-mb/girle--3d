import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors';
import { assertPermission, hasPermission, OWNER_ROLE_NAME, PERMISSIONS } from './permissions';

const owner = { name: OWNER_ROLE_NAME, isSystem: true, permissions: [] };
const editor = { name: 'Editor', isSystem: false, permissions: ['products.read', 'products.write'] };
const fakeOwner = { name: OWNER_ROLE_NAME, isSystem: false, permissions: [] };

describe('permissions', () => {
  it('includes the spec permission set', () => {
    expect(PERMISSIONS).toContain('dashboard.read');
    expect(PERMISSIONS).toContain('orders.update_status');
    expect(PERMISSIONS).toContain('ai.use');
  });

  it('system Owner role has every permission regardless of its list', () => {
    for (const p of PERMISSIONS) expect(hasPermission(owner, p)).toBe(true);
  });

  it('a non-system role named Owner gets no special treatment', () => {
    expect(hasPermission(fakeOwner, 'settings.write')).toBe(false);
  });

  it('regular roles have only listed permissions', () => {
    expect(hasPermission(editor, 'products.write')).toBe(true);
    expect(hasPermission(editor, 'products.delete')).toBe(false);
  });

  it('assertPermission throws FORBIDDEN when missing', () => {
    expect(() => assertPermission(editor, 'settings.write')).toThrow(DomainError);
    try {
      assertPermission(editor, 'settings.write');
    } catch (e) {
      expect((e as DomainError).code).toBe('FORBIDDEN');
    }
    expect(() => assertPermission(editor, 'products.read')).not.toThrow();
  });
});
