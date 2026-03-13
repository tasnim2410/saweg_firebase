import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { ok: false, error: 'EMAIL_TOKEN_AND_PASSWORD_REQUIRED' },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'PASSWORD_TOO_SHORT' },
        { status: 400 }
      );
    }

    // Find the valid token
    const resetCode = await (prisma as any).passwordResetCode.findFirst({
      where: {
        email,
        code: token,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!resetCode) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_OR_EXPIRED_TOKEN' },
        { status: 400 }
      );
    }

    // Check if user exists and get their Firebase UID
    const user = await (prisma as any).user.findUnique({
      where: { email },
      select: { id: true, firebaseUid: true },
    });

    if (!user || !user.firebaseUid) {
      return NextResponse.json(
        { ok: false, error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Update password in Firebase Auth
    const { adminAuth } = await import('@/lib/firebase-admin');
    await adminAuth.updateUser(user.firebaseUid, { password: newPassword });

    // Mark the token as used
    await (prisma as any).passwordResetCode.update({
      where: { id: resetCode.id },
      data: { used: true },
    });

    // Delete all old reset codes for this email
    await (prisma as any).passwordResetCode.deleteMany({
      where: { email },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
