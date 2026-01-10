import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isAdminIdentifier } from '@/lib/admin';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';
import { normalizePhoneNumber } from '@/lib/phone';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const uploadDir = path.join(process.cwd(), 'public/images/merchant-posts');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const postId = Number(id);
    if (!Number.isFinite(postId)) {
      return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
    }

    const post = await (prisma as any).merchantPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        name: true,
        location: true,
        phone: true,
        destination: true,
        description: true,
        image: true,
        active: true,
        lastLocationUpdateAt: true,
        createdAt: true,
        userId: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch merchant post' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminByIdentifier = Boolean(
    (session.user.email && isAdminIdentifier(session.user.email)) ||
      (session.user.phone && isAdminIdentifier(session.user.phone))
  );

  const isAdmin = Boolean((session.user as any).type === 'ADMIN' || adminByIdentifier);

  const { id } = await context.params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const existing = await (prisma as any).merchantPost.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (!isAdmin && existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contentType = req.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');

  let body: any = null;
  let formData: FormData | null = null;

  if (isMultipart) {
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form body' }, { status: 400 });
    }
  } else {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
  }

  const data: Record<string, any> = {};
  let updatesLocation = false;

  const getStr = (key: string): string | null => {
    if (formData) {
      const v = formData.get(key);
      return typeof v === 'string' ? v : null;
    }
    const v = body?.[key];
    return typeof v === 'string' ? v : null;
  };

  const getBool = (key: string): boolean | undefined => {
    if (formData) {
      const v = formData.get(key);
      if (typeof v !== 'string') return undefined;
      if (v === 'true' || v === 'on' || v === '1') return true;
      if (v === 'false' || v === '0') return false;
      return undefined;
    }
    return typeof body?.[key] === 'boolean' ? body[key] : undefined;
  };

  const getNullableStr = (key: string): string | null | undefined => {
    if (formData) {
      if (!formData.has(key)) return undefined;
      const v = formData.get(key);
      if (typeof v !== 'string') return undefined;
      const trimmed = v.trim();
      return trimmed ? trimmed : null;
    }
    if (body?.[key] === undefined) return undefined;
    if (body?.[key] === null) return null;
    if (typeof body?.[key] === 'string') {
      const trimmed = body[key].trim();
      return trimmed ? trimmed : null;
    }
    return undefined;
  };

  if (isAdmin) {
    const nameRaw = getStr('name');
    if (typeof nameRaw === 'string') {
      const name = nameRaw.trim();
      if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
      data.name = name;
    }
  }

  const locationRaw = getStr('location');
  if (typeof locationRaw === 'string') {
    const location = locationRaw.trim();
    if (!location) return NextResponse.json({ error: 'Missing location' }, { status: 400 });
    data.location = location;
    data.lastLocationUpdateAt = new Date();
    data.active = true;
    updatesLocation = true;
  }

  const phoneRaw = getStr('phone');
  if (typeof phoneRaw === 'string') {
    const phone = phoneRaw.trim();
    if (!phone) {
      return NextResponse.json({ error: 'PHONE_REQUIRED' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone.ok) {
      return NextResponse.json({ error: normalizedPhone.error }, { status: 400 });
    }

    data.phone = normalizedPhone.e164;
  }

  const destValue =
    formData && formData.has('destination')
      ? getNullableStr('destination')
      : formData && formData.has('placeOfBusiness')
        ? getNullableStr('placeOfBusiness')
        : body?.destination === undefined
          ? getNullableStr('placeOfBusiness')
          : getNullableStr('destination');

  if (destValue !== undefined) {
    data.destination = destValue;
  }

  const descValue = getNullableStr('description');
  if (descValue !== undefined) {
    data.description = descValue;
  }

  const activeValue = getBool('active');
  if (!updatesLocation && typeof activeValue === 'boolean') {
    data.active = activeValue;
  }

  const removeImageValue = getBool('removeImage');
  if (removeImageValue === true) {
    data.image = null;
  }

  if (formData) {
    const file = formData.get('image');
    if (file && typeof file !== 'string') {
      const f = file as File;
      if (f.size > 0) {
        if (f.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: 'IMAGE_TOO_LARGE', maxBytes: MAX_IMAGE_BYTES, sizeBytes: f.size },
            { status: 413 }
          );
        }

        const buffer = Buffer.from(await f.arrayBuffer());

        let imagePath: string | null = null;
        if (cloudinaryEnabled()) {
          const uploaded = await uploadImageBuffer({
            buffer,
            folder: 'saweg/merchant-posts',
            publicId: `merchant-post-${postId}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            contentType: f.type,
          });
          imagePath = uploaded.url;
        } else {
          await ensureUploadDir();
          const ext = path.extname(f.name) || '.jpg';
          const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
          const filepath = path.join(uploadDir, filename);
          await fs.writeFile(filepath, buffer);
          imagePath = `/images/merchant-posts/${filename}`;
        }

        data.image = imagePath;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updated = await (prisma as any).merchantPost.update({
    where: { id: postId },
    data: data as any,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(_req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminByIdentifier = Boolean(
    (session.user.email && isAdminIdentifier(session.user.email)) ||
      (session.user.phone && isAdminIdentifier(session.user.phone))
  );

  const isAdmin = Boolean((session.user as any).type === 'ADMIN' || adminByIdentifier);

  const { id } = await context.params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  const existing = await (prisma as any).merchantPost.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (!isAdmin && existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await (prisma as any).merchantPost.delete({ where: { id: postId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
}
