import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { isAdminIdentifier } from '@/lib/admin';

export async function GET() {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ ok: true, user: null });

    const session = await verifySessionToken(token);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    if (!user) return NextResponse.json({ ok: true, user: null });

    const isAdmin = Boolean(
      (user.email && isAdminIdentifier(user.email)) || (user.phone && isAdminIdentifier(user.phone))
    );

    return NextResponse.json({ ok: true, user: { ...user, isAdmin } });
  } catch {
    return NextResponse.json({ ok: true, user: null });
  }
}
