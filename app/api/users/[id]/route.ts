import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = typeof id === 'string' ? id.trim() : '';

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'INVALID_ID' }, { status: 400 });
  }

  const user = (await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      type: true,
      profileImage: true,
      callsReceived: true,
      merchantCity: true,
      shipperCity: true,
      carKind: true,
      maxCharge: true,
      maxChargeUnit: true,
      trucksNeeded: true,
      placeOfBusiness: true,
      truckImage: true,
      createdAt: true,
    },
  })) as any;

  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user });
}
