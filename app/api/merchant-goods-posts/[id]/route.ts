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

const uploadDir = path.join(process.cwd(), 'public/images/merchant-goods-posts');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
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

  if (!isAdmin) {
    const hasName = (body && typeof body === 'object' && 'name' in body) || (formData && formData.has('name'));
    if (hasName) {
      return NextResponse.json({ error: 'Name cannot be updated' }, { status: 400 });
    }
  }

  const existing = await (prisma as any).merchantGoodsPost.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (!isAdmin && existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const getStr = (key: string): string | null => {
    if (formData) {
      const v = formData.get(key);
      return typeof v === 'string' ? v : null;
    }
    const v = body?.[key];
    return typeof v === 'string' ? v : null;
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

  const getNum = (key: string): number | undefined => {
    if (formData) {
      if (!formData.has(key)) return undefined;
      const v = formData.get(key);
      if (typeof v !== 'string') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    if (body?.[key] === undefined) return undefined;
    const n = Number(body?.[key]);
    return Number.isFinite(n) ? n : undefined;
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

  const data: Record<string, any> = {};

  if (isAdmin) {
    const nameRaw = getStr('name');
    if (typeof nameRaw === 'string') {
      const name = nameRaw.trim();
      if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
      data.name = name;
    }
  }

  const phoneRaw = getStr('phone');
  if (typeof phoneRaw === 'string') {
    const phone = phoneRaw.trim();
    if (!phone) return NextResponse.json({ error: 'PHONE_REQUIRED' }, { status: 400 });

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone.ok) {
      return NextResponse.json({ error: normalizedPhone.error }, { status: 400 });
    }
    data.phone = normalizedPhone.e164;
  }

  const startingPointRaw = getStr('startingPoint');
  if (typeof startingPointRaw === 'string') {
    const startingPoint = startingPointRaw.trim();
    if (!startingPoint) return NextResponse.json({ error: 'Missing startingPoint' }, { status: 400 });
    data.startingPoint = startingPoint;
  }

  const destinationRaw = getStr('destination');
  if (typeof destinationRaw === 'string') {
    const destination = destinationRaw.trim();
    if (!destination) return NextResponse.json({ error: 'Missing destination' }, { status: 400 });
    data.destination = destination;
  }

  const goodsTypeRaw = getStr('goodsType');
  if (typeof goodsTypeRaw === 'string') {
    const goodsType = goodsTypeRaw.trim();
    if (!goodsType) return NextResponse.json({ error: 'Missing goodsType' }, { status: 400 });
    data.goodsType = goodsType;
  }

  const goodsWeight = getNum('goodsWeight');
  if (goodsWeight !== undefined) {
    if (!Number.isFinite(goodsWeight) || goodsWeight <= 0) {
      return NextResponse.json({ error: 'INVALID_WEIGHT' }, { status: 400 });
    }
    data.goodsWeight = goodsWeight;
  }

  const goodsWeightUnitRaw = getStr('goodsWeightUnit');
  if (typeof goodsWeightUnitRaw === 'string') {
    const normalizedUnit = goodsWeightUnitRaw.trim().toLowerCase();
    if (normalizedUnit !== 'kg' && normalizedUnit !== 'ton') {
      return NextResponse.json({ error: 'INVALID_WEIGHT_UNIT' }, { status: 400 });
    }
    data.goodsWeightUnit = normalizedUnit;
  }

  const loadingDateRaw = getStr('loadingDate');
  if (typeof loadingDateRaw === 'string') {
    const loadingDate = new Date(loadingDateRaw);
    if (Number.isNaN(loadingDate.getTime())) {
      return NextResponse.json({ error: 'INVALID_LOADING_DATE' }, { status: 400 });
    }
    data.loadingDate = loadingDate;
  }

  const vehicleTypeDesiredRaw = getStr('vehicleTypeDesired');
  if (typeof vehicleTypeDesiredRaw === 'string') {
    const vehicleTypeDesired = vehicleTypeDesiredRaw.trim();
    if (!vehicleTypeDesired) {
      return NextResponse.json({ error: 'Missing vehicleTypeDesired' }, { status: 400 });
    }
    data.vehicleTypeDesired = vehicleTypeDesired;
  }

  const descValue = getNullableStr('description');
  if (descValue !== undefined) {
    data.description = descValue;
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
            folder: 'saweg/merchant-goods-posts',
            publicId: `merchant-goods-post-${postId}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            contentType: f.type,
          });
          imagePath = uploaded.url;
        } else {
          await ensureUploadDir();
          const ext = path.extname(f.name) || '.jpg';
          const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
          const filepath = path.join(uploadDir, filename);
          await fs.writeFile(filepath, buffer);
          imagePath = `/images/merchant-goods-posts/${filename}`;
        }

        data.image = imagePath;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updated = await (prisma as any).merchantGoodsPost.update({
    where: { id: postId },
    data: data as any,
    include: {
      user: {
        select: { fullName: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

  const existing = await (prisma as any).merchantGoodsPost.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (!isAdmin && existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await (prisma as any).merchantGoodsPost.delete({ where: { id: postId } });
  return NextResponse.json({ ok: true });
}
