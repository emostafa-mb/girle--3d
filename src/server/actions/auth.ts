'use server';

import { redirect } from 'next/navigation';
import { loginAdmin, loginCustomer, registerCustomer } from '@/core/auth/login';
import { revokeSession } from '@/core/auth/sessions';
import { type Locale, safeLocale } from '@/core/i18n/locales';
import { type ActionState, toActionState } from '../action-result';
import { db } from '../db';
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../session';
import { getStoreId } from '../store';

function field(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === 'string' ? v : '';
}

function readLocale(fd: FormData): Locale {
  return safeLocale(field(fd, 'locale'));
}

export async function customerSignInAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const locale = readLocale(fd);
  try {
    const r = await loginCustomer(db, {
      storeId: await getStoreId(),
      email: field(fd, 'email'),
      password: field(fd, 'password'),
    });
    await setSessionCookie('CUSTOMER', r.token, r.expiresAt);
  } catch (err) {
    return toActionState(err);
  }
  redirect(`/${locale}/account`);
}

export async function customerSignUpAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const locale = readLocale(fd);
  try {
    const r = await registerCustomer(db, {
      storeId: await getStoreId(),
      name: field(fd, 'name'),
      email: field(fd, 'email'),
      password: field(fd, 'password'),
      phone: field(fd, 'phone') || undefined,
    });
    await setSessionCookie('CUSTOMER', r.token, r.expiresAt);
  } catch (err) {
    return toActionState(err);
  }
  redirect(`/${locale}/account`);
}

export async function customerSignOutAction(fd: FormData): Promise<void> {
  const token = await readSessionToken('CUSTOMER');
  if (token) await revokeSession(db, token);
  await clearSessionCookie('CUSTOMER');
  redirect(`/${readLocale(fd)}`);
}

export async function adminLoginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const locale = readLocale(fd);
  try {
    const r = await loginAdmin(db, {
      storeId: await getStoreId(),
      email: field(fd, 'email'),
      password: field(fd, 'password'),
    });
    await setSessionCookie('ADMIN', r.token, r.expiresAt);
  } catch (err) {
    return toActionState(err);
  }
  redirect(`/${locale}/admin`);
}

export async function adminLogoutAction(fd: FormData): Promise<void> {
  const token = await readSessionToken('ADMIN');
  if (token) await revokeSession(db, token);
  await clearSessionCookie('ADMIN');
  redirect(`/${readLocale(fd)}/admin/login`);
}
