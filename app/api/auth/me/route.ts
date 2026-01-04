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

    const user = (await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        callsReceived: true,
        profileImage: true,
        merchantCity: true,
        shipperCity: true,
        carKind: true,
        maxCharge: true,
        maxChargeUnit: true,
        trucksNeeded: true,
        placeOfBusiness: true,
        truckImage: true,
      } as any,
    })) as any;

    if (!user) return NextResponse.json({ ok: true, user: null });

    const type = (session as any).type ?? null;
    const isAdmin = Boolean(
      type === 'ADMIN' ||
        (user.email && isAdminIdentifier(String(user.email))) ||
        (user.phone && isAdminIdentifier(String(user.phone)))
    );

    return NextResponse.json({ ok: true, user: { ...user, type, isAdmin } });
  } catch {
    return NextResponse.json({ ok: true, user: null });
  }
}
