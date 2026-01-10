import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const { name, email, phone, subject, message } = await req.json();

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const to = process.env.CONTACT_TO_EMAIL;
    if (!resendApiKey || !resendFrom || !to) throw new Error('Missing RESEND_API_KEY, RESEND_FROM_EMAIL, or CONTACT_TO_EMAIL');

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: resendFrom,
      to,
      subject: `New contact: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}