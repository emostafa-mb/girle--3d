import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { assertPermission, hasPermission, type Permission } from '@/core/auth/permissions';
import { type Realm, validateSession } from '@/core/auth/sessions';
import { DomainError } from '@/core/errors';
import { safeLocale } from '@/core/i18n/locales';
import { SESSION_COOKIE } from './cookie-names';
import { db } from './db';

export async function setSessionCookie(realm: Realm, token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE[realm], token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function readSessionToken(realm: Realm): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE[realm])?.value;
}

export async function clearSessionCookie(realm: Realm) {
  (await cookies()).delete(SESSION_COOKIE[realm]);
}

export const getCurrentAdmin = cache(async () => {
  const session = await validateSession(db, { token: await readSessionToken('ADMIN'), realm: 'ADMIN' });
  if (!session) return null;
  return db.admin.findUnique({
    where: { id: session.subjectId },
    select: {
      id: true,
      name: true,
      email: true,
      storeId: true,
      role: { select: { name: true, isSystem: true, permissions: true } },
    },
  });
});

export type CurrentAdmin = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

export const getCurrentCustomer = cache(async () => {
  const session = await validateSession(db, { token: await readSessionToken('CUSTOMER'), realm: 'CUSTOMER' });
  if (!session) return null;
  return db.customer.findUnique({
    where: { id: session.subjectId },
    select: { id: true, name: true, email: true },
  });
});

export async function requireAdmin(locale: string): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/${safeLocale(locale)}/admin/login`);
  return admin;
}

export async function requireCustomer(locale: string) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/${safeLocale(locale)}/auth/signin`);
  return customer;
}

export function can(admin: CurrentAdmin, perm: Permission): boolean {
  return hasPermission(admin.role, perm);
}

/** For server actions: throws FORBIDDEN instead of redirecting. */
export async function requirePermission(perm: Permission): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new DomainError('FORBIDDEN');
  assertPermission(admin.role, perm);
  return admin;
}
