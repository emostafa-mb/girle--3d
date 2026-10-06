import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';
import { SESSION_COOKIE } from '@/server/cookie-names';
import { adminGuardRedirect } from '@/server/proxy-guard';

const intl = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const target = adminGuardRedirect(request.nextUrl.pathname, request.cookies.has(SESSION_COOKIE.ADMIN));
  if (target) return NextResponse.redirect(new URL(target, request.url));
  return intl(request);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
