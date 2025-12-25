import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './i18n/request';
import { AUTH_COOKIE_NAME, verifySessionToken } from './lib/session';
import { isAdminIdentifier } from './lib/admin';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
});

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0];

  const isLocalePath = Boolean(locale && locales.includes(locale as (typeof locales)[number]));
  const section = isLocalePath ? segments[1] : undefined;

  if (isLocalePath && section === 'admin') {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    try {
      const session = await verifySessionToken(token);
      const adminOk = Boolean(
        (session.email && isAdminIdentifier(session.email)) ||
          (session.phone && isAdminIdentifier(session.phone))
      );

      if (!adminOk) {
        const url = req.nextUrl.clone();
        url.pathname = `/${locale}`;
        url.search = '';
        return NextResponse.redirect(url);
      }
    } catch {
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
