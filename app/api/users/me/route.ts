import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, getSession, signSessionToken } from '@/lib/session';
import { Prisma } from '@prisma/client';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const uploadDir = path.join(process.cwd(), 'public/images/profiles');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
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

  const fullNameRaw = formData ? formData.get('fullName') : body?.fullName;
  const emailInput = formData ? formData.get('email') : body?.email;
  const phoneInput = formData ? formData.get('phone') : body?.phone;

  const fullName = typeof fullNameRaw === 'string' ? fullNameRaw.trim() : '';
  const emailRaw = typeof emailInput === 'string' ? emailInput.trim() : '';
  const phoneRaw = typeof phoneInput === 'string' ? phoneInput.trim() : '';

  if (!fullName) {
    return NextResponse.json({ ok: false, error: 'FULL_NAME_REQUIRED' }, { status: 400 });
  }

  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const phone = phoneRaw ? phoneRaw : null;

  if (!email && !phone) {
    return NextResponse.json({ ok: false, error: 'EMAIL_OR_PHONE_REQUIRED' }, { status: 400 });
  }

  try {
    let profileImage: string | null | undefined = undefined;

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
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        fullName,
        email,
        phone,
        ...(profileImage !== undefined ? ({ profileImage } as any) : {}),
      } as any,
      select: { id: true, fullName: true, email: true, phone: true, profileImage: true } as any,
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
