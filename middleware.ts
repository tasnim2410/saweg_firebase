// middleware.ts

import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './i18n/request';
import { AUTH_COOKIE_NAME, verifySessionToken } from './lib/session';
import { isAdminIdentifier } from './lib/admin';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'ar',
  localePrefix: 'always',
});

export default async function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const hostname = host.split(':')[0];
  if (hostname === 'sawe.app' || hostname === 'www.sawe.app') {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
    url.hostname = 'www.saweg.app';
    url.protocol = 'https:';
    url.port = '';
    url.pathname = normalizedPathname === '/' ? '/ar' : `/ar${normalizedPathname}`;
    return NextResponse.redirect(url, 308);
  }

  if (hostname === 'saweg.app') {
    const url = req.nextUrl.clone();
    url.hostname = 'www.saweg.app';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  const pathname = req.nextUrl.pathname;

  // Extract locale (first segment after leading slash)
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] && locales.includes(segments[0] as any) ? segments[0] : 'ar';

  // Define protected sections
  const protectedSections = ['admin', 'dashboard'];
  const section = segments.length >= 2 ? segments[1] : null;

  // Check if current path is under a protected section (admin or dashboard)
  const isProtectedPath = section && protectedSections.includes(section);

  if (isProtectedPath) {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    // No token → redirect to login with callbackUrl
    if (!token) {
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', pathname); // e.g., /ar/dashboard/add-provider
      return NextResponse.redirect(loginUrl);
    }

    // Token exists → verify it
    try {
      const session = await verifySessionToken(token);

      if (!session) {
        // Invalid token
        const loginUrl = new URL(`/${locale}/login`, req.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Special admin check only for /admin routes
      if (section === 'admin') {
        const adminOk = Boolean(
          (session as any).type === 'ADMIN' ||
          (session.email && isAdminIdentifier(session.email)) ||
          (session.phone && isAdminIdentifier(session.phone))
        );

        if (!adminOk) {
          // Not an admin → send to home
          const homeUrl = new URL(`/${locale}`, req.url);
          return NextResponse.redirect(homeUrl);
        }
      }

      // For /dashboard: any authenticated user is allowed → continue
      // For /admin: only admins → already checked above

    } catch (error) {
      // Verification failed
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // All other routes: just run next-intl middleware (locale handling, redirection, etc.)
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - API routes
     * - _next (Next.js internals)
     * - _vercel (Vercel internals)
     * - Static files (favicon, images, etc.)
     */
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};