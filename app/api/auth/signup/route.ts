import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : null;
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!fullName) return NextResponse.json({ ok: false, error: 'FULL_NAME_REQUIRED' }, { status: 400 });
    if (!email && !phone) return NextResponse.json({ ok: false, error: 'EMAIL_OR_PHONE_REQUIRED' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ ok: false, error: 'PASSWORD_TOO_SHORT' }, { status: 400 });

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) return NextResponse.json({ ok: false, error: 'USER_ALREADY_EXISTS' }, { status: 409 });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
      },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    const token = await signSessionToken({ sub: user.id, email: user.email, phone: user.phone });

    const res = NextResponse.json({ ok: true, user });
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
