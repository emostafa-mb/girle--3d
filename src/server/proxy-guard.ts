import { LOCALES } from '@/core/i18n/locales';

const ADMIN_PATH = new RegExp(`^/(${LOCALES.join('|')})/admin(/.*)?$`);

export function adminGuardRedirect(pathname: string, hasAdminCookie: boolean): string | null {
  const match = ADMIN_PATH.exec(pathname);
  if (!match) return null;
  const rest = match[2] ?? '';
  if (rest === '/login' || rest.startsWith('/login/')) return null;
  return hasAdminCookie ? null : `/${match[1]}/admin/login`;
}
