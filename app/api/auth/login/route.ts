import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';

function looksLikeEmail(value: string) {
  return value.includes('@');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!identifier) return NextResponse.json({ ok: false, error: 'IDENTIFIER_REQUIRED' }, { status: 400 });
    if (!password) return NextResponse.json({ ok: false, error: 'PASSWORD_REQUIRED' }, { status: 400 });

    const user = await (prisma as any).user.findFirst({
      where: looksLikeEmail(identifier)
        ? { email: identifier.toLowerCase() }
        : { phone: identifier },
      select: { id: true, fullName: true, email: true, phone: true, passwordHash: true, type: true },
    });

    if (!user) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });

    const token = await signSessionToken({ sub: user.id, email: user.email, phone: user.phone, type: (user as any).type });

    const res = NextResponse.json({ ok: true, user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone } });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
