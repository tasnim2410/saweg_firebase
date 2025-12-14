import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = body?.fullName;
    const email = body?.email;
    const phone = body?.phone;
    const city = body?.city;
    const role = body?.role;
    const userType = body?.userType;
    const carKind = body?.carKind;

    const effectiveRole = role ?? userType;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Saweg Website" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO_EMAIL,
      subject: `New registration: ${fullName}`,
      text: `New pre-launch registration:\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}\nCity: ${city}\nRole: ${effectiveRole}${carKind ? `\nCar kind: ${carKind}` : ''}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
