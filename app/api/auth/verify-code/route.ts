import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    if (!email || !code) {
      return NextResponse.json(
        { ok: false, error: 'EMAIL_AND_CODE_REQUIRED' },
        { status: 400 }
      );
    }

    // Find the most recent unused reset code for this email
    const resetCode = await (prisma as any).passwordResetCode.findFirst({
      where: {
        email,
        code,
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
        { ok: false, error: 'INVALID_CODE' },
        { status: 400 }
      );
    }

    // Mark the code as verified (we'll use a temporary token for the reset step)
    // Generate a temporary token that expires in 10 minutes
    const resetToken = Buffer.from(`${email}:${Date.now()}:${Math.random()}`).toString('base64');

    // Update the reset code with the token
    await (prisma as any).passwordResetCode.update({
      where: { id: resetCode.id },
      data: {
        used: true,
        // Store the token in a separate field or use a different approach
        // For simplicity, we'll mark it used but keep it valid for a short period
      },
    });

    // Create a new verification record with the token
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await (prisma as any).passwordResetCode.create({
      data: {
        email,
        code: resetToken,
        used: false,
        expiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      token: resetToken,
    });
  } catch (err) {
    console.error('Verify code error:', err);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
