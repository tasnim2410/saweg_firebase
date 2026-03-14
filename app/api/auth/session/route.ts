import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME } from '@/lib/session';

export const runtime = 'nodejs';

// 14-day session cookie
const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 14 * 1000;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export function GET() {
  return NextResponse.json({ ok: true, method: 'GET' });
}

export async function POST(req: Request) {
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');

    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'ID_TOKEN_REQUIRED' }, { status: 400 });
    }

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Ensure a corresponding User row exists in our DB
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, type: true },
    });

    // Auto-link: if no user found by firebaseUid, try matching by email
    if (!user && decoded.email) {
      const emailUser = await prisma.user.findUnique({
        where: { email: decoded.email.toLowerCase() },
        select: { id: true, type: true, firebaseUid: true },
      });
      if (emailUser && !emailUser.firebaseUid) {
        await prisma.user.update({
          where: { id: emailUser.id },
          data: { firebaseUid: decoded.uid },
        });
        user = { id: emailUser.id, type: emailUser.type };
      }
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    // Create a long-lived session cookie from the short-lived ID token
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err: any) {
    console.error('Session creation error:', err);
    if (err?.code === 'auth/id-token-expired' || err?.code === 'auth/argument-error') {
      return NextResponse.json({ ok: false, error: 'INVALID_ID_TOKEN' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
