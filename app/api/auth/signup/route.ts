import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME } from '@/lib/session';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/storage';
import { normalizePhoneNumber } from '@/lib/phone';
import { normalizeVehicleType } from '@/lib/vehicleTypes';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const MAX_TRUCK_IMAGE_BYTES = 10 * 1024 * 1024;
const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 14 * 1000;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

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

    let idToken = '';
    let fullName = '';
    let email: string | null = null;
    let phone: string | null = null;
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
      idToken = typeof form.get('idToken') === 'string' ? String(form.get('idToken')) : '';
      fullName = typeof form.get('fullName') === 'string' ? String(form.get('fullName')).trim() : '';
      const emailRaw = typeof form.get('email') === 'string' ? String(form.get('email')).trim().toLowerCase() : '';
      email = emailRaw || null;
      phone = typeof form.get('phone') === 'string' ? String(form.get('phone')).trim() : null;
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
      idToken = typeof body?.idToken === 'string' ? body.idToken : '';
      fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
      email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;
      phone = typeof body?.phone === 'string' ? body.phone.trim() : null;
      typeRaw = body?.type;

      merchantCity = typeof body?.merchantCity === 'string' ? body.merchantCity.trim() : null;
      shipperCity = typeof body?.shipperCity === 'string' ? body.shipperCity.trim() : null;
      carKind = typeof body?.carKind === 'string' ? body.carKind.trim() : null;
      maxCharge = typeof body?.maxCharge === 'string' ? body.maxCharge.trim() : null;
      maxChargeUnit = typeof body?.maxChargeUnit === 'string' ? body.maxChargeUnit.trim() : null;
      trucksNeeded = typeof body?.trucksNeeded === 'string' ? body.trucksNeeded.trim() : null;
      placeOfBusiness = typeof body?.placeOfBusiness === 'string' ? body.placeOfBusiness.trim() : null;
    }

    if (!idToken) return NextResponse.json({ ok: false, error: 'ID_TOKEN_REQUIRED' }, { status: 400 });
    if (!fullName) return NextResponse.json({ ok: false, error: 'FULL_NAME_REQUIRED' }, { status: 400 });

    const type = parseUserType(typeRaw);
    if (!type) return NextResponse.json({ ok: false, error: 'USER_TYPE_REQUIRED' }, { status: 400 });

    // Verify the Firebase ID token
    const { adminAuth } = await import('@/lib/firebase-admin');
    const decoded = await adminAuth.verifyIdToken(idToken);
    const firebaseUid = decoded.uid;

    // Normalize phone
    let phoneE164: string | null = null;
    if (phone) {
      const normalizedPhone = normalizePhoneNumber(phone);
      if (!normalizedPhone.ok) {
        return NextResponse.json({ ok: false, error: normalizedPhone.error }, { status: 400 });
      }
      phoneE164 = normalizedPhone.e164;
    }

    // Check if a DB user already exists for this Firebase UID
    const existing = await prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ ok: false, error: 'USER_ALREADY_EXISTS' }, { status: 409 });

    // Normalize vehicle types
    const normalizedCarKind = carKind ? normalizeVehicleType(carKind) || carKind : null;
    const normalizedTrucksNeeded = trucksNeeded ? normalizeVehicleType(trucksNeeded) || trucksNeeded : null;

    // Handle truck image upload
    let truckImagePath: string | null = null;
    if (truckImage && truckImage.size > 0) {
      if (truckImage.size > MAX_TRUCK_IMAGE_BYTES) {
        return NextResponse.json(
          { ok: false, error: 'IMAGE_TOO_LARGE', maxBytes: MAX_TRUCK_IMAGE_BYTES, sizeBytes: truckImage.size },
          { status: 413 }
        );
      }

      const buffer = Buffer.from(await truckImage.arrayBuffer());

      if (cloudinaryEnabled()) {
        const uploaded = await uploadImageBuffer({
          buffer,
          folder: 'saweg/users',
          publicId: `truck-${firebaseUid}-${Date.now()}`,
          contentType: truckImage.type,
        });
        truckImagePath = uploaded.url;
      } else {
        await ensureUploadDir();
        const ext = path.extname(truckImage.name) || '.jpg';
        const filename = `truck-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
        await fs.writeFile(path.join(uploadDir, filename), buffer);
        truckImagePath = `/images/users/${filename}`;
      }
    }

    // Create the user in our DB, linked to Firebase UID
    const user = await prisma.user.create({
      data: {
        firebaseUid,
        fullName,
        email: email || decoded.email || null,
        phone: phoneE164,
        type: type as any,
        merchantCity: type === 'MERCHANT' ? (merchantCity || null) : null,
        shipperCity: type === 'SHIPPER' ? (shipperCity || null) : null,
        carKind: type === 'SHIPPER' ? normalizedCarKind : null,
        maxCharge: type === 'SHIPPER' ? (maxCharge || null) : null,
        maxChargeUnit: type === 'SHIPPER' ? (maxChargeUnit || null) : null,
        trucksNeeded: type === 'MERCHANT' ? normalizedTrucksNeeded : null,
        placeOfBusiness: type === 'MERCHANT' ? (placeOfBusiness || null) : null,
        truckImage: type === 'SHIPPER' ? truckImagePath : null,
      },
      select: { id: true, fullName: true, email: true, phone: true, type: true },
    });

    // Set custom claims on the Firebase user (for admin detection in middleware)
    await adminAuth.setCustomUserClaims(firebaseUid, {
      userType: type,
      internalId: user.id,
    });

    // Mint a long-lived session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(AUTH_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err: any) {
    console.error('Signup error:', err);

    if (err?.code === 'P2002') {
      const field = err?.meta?.target?.[0] || 'email/phone';
      return NextResponse.json({ ok: false, error: 'USER_ALREADY_EXISTS', field }, { status: 409 });
    }
    if (err?.code?.startsWith('P1') || err?.code?.startsWith('P2') || err?.code?.startsWith('P3')) {
      return NextResponse.json({ ok: false, error: 'DATABASE_ERROR' }, { status: 500 });
    }
    if (err?.code === 'auth/id-token-expired' || err?.code === 'auth/argument-error') {
      return NextResponse.json({ ok: false, error: 'INVALID_ID_TOKEN' }, { status: 401 });
    }
    if (err?.message?.includes('upload') || err?.message?.includes('storage')) {
      return NextResponse.json({ ok: false, error: 'IMAGE_UPLOAD_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
