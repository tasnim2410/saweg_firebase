import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';
import { normalizePhoneNumber } from '@/lib/phone';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const uploadDir = path.join(process.cwd(), 'public/images/users');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

function parseUserType(raw: unknown) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toUpperCase();
  if (v === 'SHIPPER' || v === 'MERCHANT') return v;
  return null;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let fullName = '';
    let email: string | null = null;
    let phone: string | null = null;
    let password = '';
    let typeRaw: unknown = null;

    let merchantCity: string | null = null;
    let shipperCity: string | null = null;
    let carKind: string | null = null;
    let maxCharge: string | null = null;
    let maxChargeUnit: string | null = null;
    let trucksNeeded: string | null = null;
    let placeOfBusiness: string | null = null;
    let truckImage: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      fullName = typeof form.get('fullName') === 'string' ? String(form.get('fullName')).trim() : '';
      email = typeof form.get('email') === 'string' ? String(form.get('email')).trim().toLowerCase() : null;
      phone = typeof form.get('phone') === 'string' ? String(form.get('phone')).trim() : null;
      password = typeof form.get('password') === 'string' ? String(form.get('password')) : '';
      typeRaw = form.get('type');

      merchantCity = typeof form.get('merchantCity') === 'string' ? String(form.get('merchantCity')).trim() : null;
      shipperCity = typeof form.get('shipperCity') === 'string' ? String(form.get('shipperCity')).trim() : null;
      carKind = typeof form.get('carKind') === 'string' ? String(form.get('carKind')).trim() : null;
      maxCharge = typeof form.get('maxCharge') === 'string' ? String(form.get('maxCharge')).trim() : null;
      maxChargeUnit = typeof form.get('maxChargeUnit') === 'string' ? String(form.get('maxChargeUnit')).trim() : null;
      trucksNeeded = typeof form.get('trucksNeeded') === 'string' ? String(form.get('trucksNeeded')).trim() : null;
      placeOfBusiness = typeof form.get('placeOfBusiness') === 'string' ? String(form.get('placeOfBusiness')).trim() : null;

      const file = form.get('truckImage');
      truckImage = file instanceof File ? file : null;
    } else {
      const body = await req.json();
      fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
      email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;
      phone = typeof body?.phone === 'string' ? body.phone.trim() : null;
      password = typeof body?.password === 'string' ? body.password : '';
      typeRaw = body?.type;

      merchantCity = typeof body?.merchantCity === 'string' ? body.merchantCity.trim() : null;
      shipperCity = typeof body?.shipperCity === 'string' ? body.shipperCity.trim() : null;
      carKind = typeof body?.carKind === 'string' ? body.carKind.trim() : null;
      maxCharge = typeof body?.maxCharge === 'string' ? body.maxCharge.trim() : null;
      maxChargeUnit = typeof body?.maxChargeUnit === 'string' ? body.maxChargeUnit.trim() : null;
      trucksNeeded = typeof body?.trucksNeeded === 'string' ? body.trucksNeeded.trim() : null;
      placeOfBusiness = typeof body?.placeOfBusiness === 'string' ? body.placeOfBusiness.trim() : null;
    }

    const type = parseUserType(typeRaw);

    if (!fullName) return NextResponse.json({ ok: false, error: 'FULL_NAME_REQUIRED' }, { status: 400 });
    if (!email && !phone) return NextResponse.json({ ok: false, error: 'EMAIL_OR_PHONE_REQUIRED' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ ok: false, error: 'PASSWORD_TOO_SHORT' }, { status: 400 });
    if (!type) return NextResponse.json({ ok: false, error: 'USER_TYPE_REQUIRED' }, { status: 400 });

    let phoneE164: string | null = null;
    if (phone) {
      const normalizedPhone = normalizePhoneNumber(phone);
      if (!normalizedPhone.ok) {
        return NextResponse.json({ ok: false, error: normalizedPhone.error }, { status: 400 });
      }
      phoneE164 = normalizedPhone.e164;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneE164 ? [{ phone: phoneE164 }] : []),
        ],
      },
      select: { id: true },
    });

    if (existing) return NextResponse.json({ ok: false, error: 'USER_ALREADY_EXISTS' }, { status: 409 });

    const passwordHash = await hashPassword(password);

    let truckImagePath: string | null = null;
    if (truckImage && truckImage.size > 0) {
      const buffer = Buffer.from(await truckImage.arrayBuffer());

      if (cloudinaryEnabled()) {
        const uploaded = await uploadImageBuffer({
          buffer,
          folder: 'saweg/users',
          publicId: `truck-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          contentType: truckImage.type,
        });
        truckImagePath = uploaded.url;
      } else {
        await ensureUploadDir();
        const ext = path.extname(truckImage.name) || '.jpg';
        const filename = `truck-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, buffer);
        truckImagePath = `/images/users/${filename}`;
      }
    }

    const user = await (prisma as any).user.create({
      data: {
        fullName,
        email,
        phone: phoneE164,
        passwordHash,
        type: type as any,
        merchantCity: type === 'MERCHANT' ? (merchantCity || null) : null,
        shipperCity: type === 'SHIPPER' ? (shipperCity || null) : null,
        carKind: type === 'SHIPPER' ? (carKind || null) : null,
        maxCharge: type === 'SHIPPER' ? (maxCharge || null) : null,
        maxChargeUnit: type === 'SHIPPER' ? (maxChargeUnit || null) : null,
        trucksNeeded: type === 'MERCHANT' ? (trucksNeeded || null) : null,
        placeOfBusiness: type === 'MERCHANT' ? (placeOfBusiness || null) : null,
        truckImage: type === 'SHIPPER' ? truckImagePath : null,
      },
      select: { id: true, fullName: true, email: true, phone: true, type: true },
    });

    const token = await signSessionToken({ sub: user.id, email: user.email, phone: user.phone, type: (user as any).type });

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
