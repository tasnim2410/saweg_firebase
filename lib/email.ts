import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      // In development, just log the email
      if (process.env.NODE_ENV === 'development') {
        console.log('=== EMAIL (DEV MODE) ===');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Text:', text);
        console.log('======================');
        return { ok: true };
      }
      return { ok: false, error: 'Email service not configured' };
    }

    const from = process.env.RESEND_FROM_EMAIL || 'noreply@saweg.com';

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      console.error('Email send error:', error);
      return { ok: false, error: error.message };
    }

    console.log('Email sent successfully:', data?.id);
    return { ok: true };
  } catch (err) {
    console.error('Email send exception:', err);
    return { ok: false, error: 'Failed to send email' };
  }
}

export function generateResetCode(): string {
  // Generate 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getPasswordResetEmailTemplate(code: string, locale: 'ar' | 'en' = 'ar'): { subject: string; html: string } {
  const isAr = locale === 'ar';

  const subject = isAr
    ? 'رمز إعادة تعيين كلمة المرور - Saweg'
    : 'Password Reset Code - Saweg';

  const html = isAr
    ? `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إعادة تعيين كلمة المرور</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; direction: rtl;">
  <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #152233; font-size: 24px; margin-bottom: 20px;">إعادة تعيين كلمة المرور</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.6;">لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. استخدم الرمز التالي:</p>
    <div style="background-color: #f0f0f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #152233; letter-spacing: 8px;">${code}</span>
    </div>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">هذا الرمز صالح لمدة 10 دقائق فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.</p>
    <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
      فريق Saweg
    </p>
  </div>
</body>
</html>`
    : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <h1 style="color: #152233; font-size: 24px; margin-bottom: 20px;">Password Reset</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.6;">You have requested to reset your password. Use the following code:</p>
    <div style="background-color: #f0f0f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 32px; font-weight: bold; color: #152233; letter-spacing: 8px;">${code}</span>
    </div>
    <p style="color: #666; font-size: 14px; line-height: 1.6;">This code is valid for 10 minutes only. If you did not request a password reset, you can ignore this email.</p>
    <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
      The Saweg Team
    </p>
  </div>
</body>
</html>`;

  return { subject, html };
}
