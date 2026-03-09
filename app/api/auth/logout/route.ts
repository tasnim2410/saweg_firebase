import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });

  // Optionally revoke the Firebase session so it can't be reused
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');
    const anyReq = req as any;
    const sessionCookie = anyReq?.cookies?.get?.(AUTH_COOKIE_NAME)?.value
      ?? req.headers.get('cookie')?.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`))?.[1];
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie);
      await adminAuth.revokeRefreshTokens(decoded.sub);
    }
  } catch {
    // Best-effort revocation — always clear the cookie
  }

  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
