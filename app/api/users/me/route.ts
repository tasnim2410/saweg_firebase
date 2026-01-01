import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, getSession, signSessionToken } from '@/lib/session';
import { Prisma } from '@prisma/client';

export async function PATCH(req: Request) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
  }

  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
  const emailRaw = typeof body?.email === 'string' ? body.email.trim() : '';
  const phoneRaw = typeof body?.phone === 'string' ? body.phone.trim() : '';

  if (!fullName) {
    return NextResponse.json({ ok: false, error: 'FULL_NAME_REQUIRED' }, { status: 400 });
  }

  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const phone = phoneRaw ? phoneRaw : null;

  if (!email && !phone) {
    return NextResponse.json({ ok: false, error: 'EMAIL_OR_PHONE_REQUIRED' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName,
        email,
        phone,
      },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    const token = await signSessionToken({
      sub: updated.id,
      email: updated.email,
      phone: updated.phone,
      type: (session.user as any).type,
    });

    const res = NextResponse.json({ ok: true, user: updated });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta as any)?.target;
      const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
      if (fields.includes('email')) {
        return NextResponse.json({ ok: false, error: 'DUPLICATE_EMAIL' }, { status: 409 });
      }
      if (fields.includes('phone')) {
        return NextResponse.json({ ok: false, error: 'DUPLICATE_PHONE' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: 'DUPLICATE_IDENTIFIER' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
