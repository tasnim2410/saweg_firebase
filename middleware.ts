// middleware.ts
export const runtime = 'nodejs';

import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './i18n/request';
import { AUTH_COOKIE_NAME } from './lib/session';
import { isAdminIdentifier } from './lib/admin';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'ar',
  localePrefix: 'always',
});

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Extract locale from current pathname
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] && locales.includes(segments[0] as any) ? segments[0] : 'ar';

  // Ensure locale prefix is present
  if (!locales.some(loc =>
    pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  )) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === '/' ? '/ar' : `/ar${pathname}`;
    return NextResponse.redirect(url, 308);
  }

  // Define protected sections
  const protectedSections = ['admin', 'dashboard'];
  const section = segments.length >= 2 ? segments[1] : null;
  const isProtectedPath = section && protectedSections.includes(section);

  if (isProtectedPath) {
    const sessionCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { adminAuth } = await import('./lib/firebase-admin');
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

      if (section === 'admin') {
        const isAdmin = Boolean(
          decoded.admin === true ||
          (decoded.email && isAdminIdentifier(decoded.email)) ||
          (decoded.phone_number && isAdminIdentifier(decoded.phone_number))
        );
        if (!isAdmin) {
          return NextResponse.redirect(new URL(`/${locale}`, req.url));
        }
      }
    } catch {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
