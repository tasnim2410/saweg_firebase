import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME } from '@/lib/session';
import { normalizePhoneNumber } from '@/lib/phone';

export const runtime = 'nodejs';

// 14-day session cookie
const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 14 * 1000;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export function GET() {
  return NextResponse.json({ ok: true, route: '/api/create-session' });
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

    // Auto-link helper: update the DB user's firebaseUid if it's missing or stale
    const tryLink = async (
      dbUser: { id: string; type: any; firebaseUid: string | null } | null,
    ): Promise<{ id: string; type: any } | null> => {
      if (!dbUser) return null;
      // Already correctly linked
      if (dbUser.firebaseUid === decoded.uid) return { id: dbUser.id, type: dbUser.type };
      // UID missing or stale — re-link (safe because decoded.uid isn't claimed by any DB user)
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { firebaseUid: decoded.uid },
      });
      console.log(`Auto-linked DB user ${dbUser.id} to Firebase UID ${decoded.uid} (was: ${dbUser.firebaseUid ?? 'null'})`);
      return { id: dbUser.id, type: dbUser.type };
    };

    // Auto-link: try matching by email from the token
    if (!user && decoded.email) {
      const emailUser = await prisma.user.findUnique({
        where: { email: decoded.email.toLowerCase() },
        select: { id: true, type: true, firebaseUid: true },
      });
      user = await tryLink(emailUser);
    }

    // Auto-link: try matching by phone number from the token
    if (!user && decoded.phone_number) {
      const normalized = normalizePhoneNumber(decoded.phone_number);
      const phoneToSearch = normalized.ok ? normalized.e164 : decoded.phone_number;
      const phoneUser = await prisma.user.findFirst({
        where: { phone: phoneToSearch },
        select: { id: true, type: true, firebaseUid: true },
      });
      user = await tryLink(phoneUser);
    }

    // Last resort: fetch full Firebase user record and try email + phone
    if (!user) {
      try {
        const firebaseUser = await adminAuth.getUser(decoded.uid);
        const fbEmail = firebaseUser.email?.toLowerCase();
        const fbPhone = firebaseUser.phoneNumber;

        if (fbEmail) {
          const dbUser = await prisma.user.findUnique({
            where: { email: fbEmail },
            select: { id: true, type: true, firebaseUid: true },
          });
          user = await tryLink(dbUser);
        }

        if (!user && fbPhone) {
          const normalized = normalizePhoneNumber(fbPhone);
          const phoneToSearch = normalized.ok ? normalized.e164 : fbPhone;
          const dbUser = await prisma.user.findFirst({
            where: { phone: phoneToSearch },
            select: { id: true, type: true, firebaseUid: true },
          });
          user = await tryLink(dbUser);
        }
      } catch (_) {
        // Ignore errors from getUser — fall through to USER_NOT_FOUND
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
