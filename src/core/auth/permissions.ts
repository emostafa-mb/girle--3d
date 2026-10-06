import { DomainError } from '../errors';

export const PERMISSIONS = [
  'dashboard.read',
  'analytics.read',
  'products.read',
  'products.write',
  'products.delete',
  'categories.read',
  'categories.write',
  'orders.read',
  'orders.update_status',
  'orders.refund',
  'customers.read',
  'customers.write',
  'customers.delete',
  'admins.read',
  'admins.write',
  'roles.write',
  'coupons.write',
  'campaigns.write',
  'messages.read',
  'settings.read',
  'settings.write',
  'ai.use',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const OWNER_ROLE_NAME = 'Owner';

export type RoleLike = { name: string; isSystem: boolean; permissions: string[] };

export function hasPermission(role: RoleLike, perm: Permission): boolean {
  if (role.isSystem && role.name === OWNER_ROLE_NAME) return true;
  return role.permissions.includes(perm);
}

export function assertPermission(role: RoleLike, perm: Permission): void {
  if (!hasPermission(role, perm)) throw new DomainError('FORBIDDEN', `Missing permission ${perm}`);
}
