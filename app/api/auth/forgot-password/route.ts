import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, generateResetCode, getPasswordResetEmailTemplate } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const locale = body?.locale === 'en' ? 'en' : 'ar';

    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'EMAIL_REQUIRED' },
        { status: 400 }
      );
    }

    // Check if user exists with this email
    const user = await (prisma as any).user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'EMAIL_NOT_REGISTERED' },
        { status: 404 }
      );
    }

    // Generate a 6-digit code
    const code = generateResetCode();

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save the reset code
    await (prisma as any).passwordResetCode.create({
      data: {
        email,
        code,
        used: false,
        expiresAt,
      },
    });

    // Send email with the code
    const { subject, html } = getPasswordResetEmailTemplate(code, locale as 'ar' | 'en');
    const emailResult = await sendEmail({
      to: email,
      subject,
      html,
    });

    if (!emailResult.ok) {
      console.error('Failed to send password reset email:', emailResult.error);
      // In development, return the code so testing is easier
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          ok: true,
          devCode: code,
          message: 'Email service not available, code logged to console',
        });
      }
      return NextResponse.json(
        { ok: false, error: 'EMAIL_SEND_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
