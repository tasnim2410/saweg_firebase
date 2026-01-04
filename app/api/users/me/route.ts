import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, getSession, signSessionToken } from '@/lib/session';
import { Prisma } from '@prisma/client';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';
import { normalizePhoneNumber } from '@/lib/phone';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const uploadDir = path.join(process.cwd(), 'public/images/profiles');
const uploadDirTruck = path.join(process.cwd(), 'public/images/users');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

async function ensureTruckUploadDir() {
  await fs.mkdir(uploadDirTruck, { recursive: true });
}

export async function PATCH(req: Request) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');

  let body: any = null;
  let formData: FormData | null = null;

  if (isMultipart) {
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
    }
  } else {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'INVALID_BODY' }, { status: 400 });
    }
  }

  const hasFullNameField = formData
    ? formData.has('fullName')
    : Object.prototype.hasOwnProperty.call(body ?? {}, 'fullName');
  const hasEmailField = formData
    ? formData.has('email')
    : Object.prototype.hasOwnProperty.call(body ?? {}, 'email');
  const hasPhoneField = formData
    ? formData.has('phone')
    : Object.prototype.hasOwnProperty.call(body ?? {}, 'phone');

  const fullNameRaw = hasFullNameField ? (formData ? formData.get('fullName') : body?.fullName) : '';
  const emailInput = hasEmailField ? (formData ? formData.get('email') : body?.email) : undefined;
  const phoneInput = hasPhoneField ? (formData ? formData.get('phone') : body?.phone) : undefined;

  const fullName = typeof fullNameRaw === 'string' ? fullNameRaw.trim() : '';
  const emailRaw = typeof emailInput === 'string' ? emailInput.trim() : '';
  const phoneRaw = typeof phoneInput === 'string' ? phoneInput.trim() : '';

  if (hasFullNameField && !fullName) {
    return NextResponse.json({ ok: false, error: 'FULL_NAME_REQUIRED' }, { status: 400 });
  }

  const emailUpdate = hasEmailField ? (emailRaw ? emailRaw.toLowerCase() : null) : undefined;
  const phoneUpdate = hasPhoneField ? (phoneRaw ? phoneRaw : null) : undefined;

  const phoneUpdateNormalized =
    phoneUpdate === undefined
      ? undefined
      : phoneUpdate === null
        ? null
        : (() => {
            const normalized = normalizePhoneNumber(phoneUpdate);
            if (!normalized.ok) {
              return normalized;
            }
            return normalized.e164;
          })();

  if (phoneUpdateNormalized && typeof phoneUpdateNormalized === 'object') {
    return NextResponse.json({ ok: false, error: phoneUpdateNormalized.error }, { status: 400 });
  }

  try {
    const existingUser = (await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, fullName: true, email: true, phone: true, type: true } as any,
    })) as any;

    if (!existingUser) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const fullNameUpdate = hasFullNameField ? fullName : undefined;

    const nextEmail = emailUpdate !== undefined ? emailUpdate : (existingUser.email ?? null);
    const nextPhone = phoneUpdateNormalized !== undefined ? phoneUpdateNormalized : (existingUser.phone ?? null);

    const nextFullName = fullNameUpdate !== undefined ? fullNameUpdate : (existingUser.fullName ?? null);

    if (!nextFullName) {
      return NextResponse.json({ ok: false, error: 'FULL_NAME_REQUIRED' }, { status: 400 });
    }

    if (!nextEmail && !nextPhone) {
      return NextResponse.json({ ok: false, error: 'EMAIL_OR_PHONE_REQUIRED' }, { status: 400 });
    }

    let profileImage: string | null | undefined = undefined;
    let truckImage: string | null | undefined = undefined;

    const userType = (session.user as any).type ?? existingUser.type ?? null;

    const parseStringField = (key: string) => {
      const hasField = formData
        ? formData.has(key)
        : Object.prototype.hasOwnProperty.call(body ?? {}, key);
      if (!hasField) return undefined;
      const raw = formData ? formData.get(key) : body?.[key];
      const v = typeof raw === 'string' ? raw.trim() : '';
      return v ? v : null;
    };

    const merchantCity = parseStringField('merchantCity');
    const shipperCity = parseStringField('shipperCity');
    const carKind = parseStringField('carKind');
    const maxCharge = parseStringField('maxCharge');
    const maxChargeUnit = parseStringField('maxChargeUnit');
    const trucksNeeded = parseStringField('trucksNeeded');
    const placeOfBusiness = parseStringField('placeOfBusiness');

    if (formData) {
      const file = formData.get('profileImage');
      if (file && typeof file !== 'string') {
        const f = file as File;
        if (f.size > 0) {
          const buffer = Buffer.from(await f.arrayBuffer());
          if (cloudinaryEnabled()) {
            const uploaded = await uploadImageBuffer({
              buffer,
              folder: 'saweg/profiles',
              publicId: `profile-${session.user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
              contentType: f.type,
            });
            profileImage = uploaded.url;
          } else {
            await ensureUploadDir();
            const ext = path.extname(f.name) || '.jpg';
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
            const filepath = path.join(uploadDir, filename);
            await fs.writeFile(filepath, buffer);
            profileImage = `/images/profiles/${filename}`;
          }
        }
      }

      if (userType === 'SHIPPER') {
        const file2 = formData.get('truckImage');
        if (file2 && typeof file2 !== 'string') {
          const f2 = file2 as File;
          if (f2.size > 0) {
            const buffer = Buffer.from(await f2.arrayBuffer());
            if (cloudinaryEnabled()) {
              const uploaded = await uploadImageBuffer({
                buffer,
                folder: 'saweg/users',
                publicId: `truck-${session.user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
                contentType: f2.type,
              });
              truckImage = uploaded.url;
            } else {
              await ensureTruckUploadDir();
              const ext = path.extname(f2.name) || '.jpg';
              const filename = `truck-${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
              const filepath = path.join(uploadDirTruck, filename);
              await fs.writeFile(filepath, buffer);
              truckImage = `/images/users/${filename}`;
            }
          }
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(fullNameUpdate !== undefined ? ({ fullName: fullNameUpdate } as any) : {}),
        ...(emailUpdate !== undefined ? ({ email: emailUpdate } as any) : {}),
        ...(phoneUpdateNormalized !== undefined ? ({ phone: phoneUpdateNormalized } as any) : {}),
        ...(merchantCity !== undefined ? ({ merchantCity } as any) : {}),
        ...(shipperCity !== undefined ? ({ shipperCity } as any) : {}),
        ...(carKind !== undefined ? ({ carKind } as any) : {}),
        ...(maxCharge !== undefined ? ({ maxCharge } as any) : {}),
        ...(maxChargeUnit !== undefined ? ({ maxChargeUnit } as any) : {}),
        ...(trucksNeeded !== undefined ? ({ trucksNeeded } as any) : {}),
        ...(placeOfBusiness !== undefined ? ({ placeOfBusiness } as any) : {}),
        ...(profileImage !== undefined ? ({ profileImage } as any) : {}),
        ...(truckImage !== undefined ? ({ truckImage } as any) : {}),
      } as any,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        profileImage: true,
        merchantCity: true,
        shipperCity: true,
        carKind: true,
        maxCharge: true,
        maxChargeUnit: true,
        trucksNeeded: true,
        placeOfBusiness: true,
        truckImage: true,
      } as any,
    });

    const token = await signSessionToken({
      sub: (updated as any).id,
      email: (updated as any).email,
      phone: (updated as any).phone,
      type: (session.user as any).type,
    });

    const res = NextResponse.json({ ok: true, user: updated });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta as any)?.target;
      const fields = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
      if (fields.includes('email')) {
        return NextResponse.json({ ok: false, error: 'DUPLICATE_EMAIL' }, { status: 409 });
      }
      if (fields.includes('phone')) {
        return NextResponse.json({ ok: false, error: 'DUPLICATE_PHONE' }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: 'DUPLICATE_IDENTIFIER' }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
