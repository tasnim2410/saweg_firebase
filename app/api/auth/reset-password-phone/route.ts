import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { idToken, newPassword } = body ?? {};

    if (!idToken || !newPassword) {
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
    }

    // Validate password strength
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return NextResponse.json({ error: 'WEAK_PASSWORD' }, { status: 400 });
    }

    const { adminAuth } = await import('@/lib/firebase-admin');

    // Verify the phone auth idToken issued by Firebase
    const decoded = await adminAuth.verifyIdToken(idToken);

    // The phone number must be present in the token
    const phoneNumber = decoded.phone_number;
    if (!phoneNumber) {
      return NextResponse.json({ error: 'NO_PHONE' }, { status: 400 });
    }

    // Find the user in our DB by their phone number
    const user = await prisma.user.findFirst({
      where: { phone: phoneNumber },
      select: { id: true, firebaseUid: true },
    });

    if (!user?.firebaseUid) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    // Update the password for the user's email/password Firebase account
    await adminAuth.updateUser(user.firebaseUid, { password: newPassword });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('reset-password-phone error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
