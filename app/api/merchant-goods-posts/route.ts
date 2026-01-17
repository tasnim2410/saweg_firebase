import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isAdminIdentifier } from '@/lib/admin';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';
import { getLocationLabel } from '@/lib/locations';
import { sendPushToSubscription } from '@/lib/webPush';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const uploadDir = path.join(process.cwd(), 'public/images/merchant-goods-posts');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function GET() {
  try {
    const posts = await (prisma as any).merchantGoodsPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json(posts, {
      headers: {
        'cache-control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('GET /api/merchant-goods-posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch merchant goods posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id as string;

  const adminOk = Boolean(
    (session.user.email && isAdminIdentifier(session.user.email)) ||
      (session.user.phone && isAdminIdentifier(session.user.phone))
  );

  const sessionType = (session.user as any).type;
  const isAdmin = Boolean(sessionType === 'ADMIN' || adminOk);

  try {
    if (!adminOk && sessionType !== 'MERCHANT' && sessionType !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();

    const nameFromForm = typeof formData.get('name') === 'string' ? String(formData.get('name')).trim() : '';

    const startingPoint = typeof formData.get('startingPoint') === 'string' ? String(formData.get('startingPoint')).trim() : '';
    const destination = typeof formData.get('destination') === 'string' ? String(formData.get('destination')).trim() : '';
    const goodsType = typeof formData.get('goodsType') === 'string' ? String(formData.get('goodsType')).trim() : '';
    const goodsWeightRaw = typeof formData.get('goodsWeight') === 'string' ? String(formData.get('goodsWeight')).trim() : '';
    const goodsWeightUnit = typeof formData.get('goodsWeightUnit') === 'string' ? String(formData.get('goodsWeightUnit')).trim() : '';
    const loadingDateRaw = typeof formData.get('loadingDate') === 'string' ? String(formData.get('loadingDate')).trim() : '';
    const vehicleTypeDesired = typeof formData.get('vehicleTypeDesired') === 'string' ? String(formData.get('vehicleTypeDesired')).trim() : '';
    const description = typeof formData.get('description') === 'string' ? String(formData.get('description')).trim() : '';

    if (!startingPoint || !destination || !goodsType || !goodsWeightRaw || !loadingDateRaw || !vehicleTypeDesired) {
      return NextResponse.json({ error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    const goodsWeight = Number(goodsWeightRaw);
    if (!Number.isFinite(goodsWeight) || goodsWeight <= 0) {
      return NextResponse.json({ error: 'INVALID_WEIGHT' }, { status: 400 });
    }

    const normalizedUnit = goodsWeightUnit.toLowerCase();
    if (normalizedUnit !== 'kg' && normalizedUnit !== 'ton') {
      return NextResponse.json({ error: 'INVALID_WEIGHT_UNIT' }, { status: 400 });
    }

    const loadingDate = new Date(loadingDateRaw);
    if (Number.isNaN(loadingDate.getTime())) {
      return NextResponse.json({ error: 'INVALID_LOADING_DATE' }, { status: 400 });
    }

    let imagePath: string | null = null;
    const file = formData.get('image') as File | null;

    if (file && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: 'IMAGE_TOO_LARGE', maxBytes: MAX_IMAGE_BYTES, sizeBytes: file.size },
          { status: 413 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (cloudinaryEnabled()) {
        const uploaded = await uploadImageBuffer({
          buffer,
          folder: 'saweg/merchant-goods-posts',
          publicId: `merchant-goods-post-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          contentType: file.type,
        });
        imagePath = uploaded.url;
      } else {
        await ensureUploadDir();

        const ext = path.extname(file.name) || '.jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, buffer);
        imagePath = `/images/merchant-goods-posts/${filename}`;
      }
    }

    const post = await (prisma as any).merchantGoodsPost.create({
      data: {
        name: isAdmin && nameFromForm ? nameFromForm : user.fullName,
        startingPoint,
        destination,
        goodsType,
        goodsWeight,
        goodsWeightUnit: normalizedUnit,
        loadingDate,
        vehicleTypeDesired,
        image: imagePath,
        description: description || null,
        userId,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    try {
      const subs = await (prisma as any).pushSubscription.findMany({
        where: {
          user: {
            type: { in: ['SHIPPER', 'ADMIN'] },
          },
        },
        select: {
          endpoint: true,
          p256dh: true,
          auth: true,
          expirationTime: true,
        },
      });

      const fromAr = getLocationLabel(post.startingPoint, 'ar');
      const fromEn = getLocationLabel(post.startingPoint, 'en');
      const toAr = getLocationLabel(post.destination, 'ar');
      const toEn = getLocationLabel(post.destination, 'en');

      const routeAr = `من ${fromAr} → ${toAr}`;
      const routeEn = `from ${fromEn} → ${toEn}`;

      const body = `تمت إضافة طلب تاجر جديد ${routeAr}.\nNew merchant request added ${routeEn}.`;

      const payload = {
        title: 'Saweg',
        body,
        url: '/ar',
      };

      for (const sub of subs) {
        const result = await sendPushToSubscription(
          {
            endpoint: sub.endpoint,
            expirationTime: sub.expirationTime,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );

        if (!result.ok && result.gone) {
          await (prisma as any).pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => null);
        }
      }
    } catch (error) {
      console.error('POST /api/merchant-goods-posts push notify error:', error);
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('POST /api/merchant-goods-posts error:', error);
    return NextResponse.json({ error: 'Failed to create merchant goods post' }, { status: 500 });
  }
}
