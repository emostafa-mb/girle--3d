import { describe, expect, it } from 'vitest';
import { adminGuardRedirect } from './proxy-guard';

describe('adminGuardRedirect', () => {
  it('ignores storefront paths', () => {
    expect(adminGuardRedirect('/en', false)).toBeNull();
    expect(adminGuardRedirect('/ar/account', false)).toBeNull();
    expect(adminGuardRedirect('/en/administrator', false)).toBeNull();
  });

  it('sends signed-out visitors of admin pages to the login page in their locale', () => {
    expect(adminGuardRedirect('/en/admin', false)).toBe('/en/admin/login');
    expect(adminGuardRedirect('/ar/admin/products', false)).toBe('/ar/admin/login');
  });

  it('never redirects the login page itself', () => {
    expect(adminGuardRedirect('/en/admin/login', false)).toBeNull();
  });

  it('lets requests with an admin cookie through (the layout validates it)', () => {
    expect(adminGuardRedirect('/en/admin', true)).toBeNull();
  });
});
