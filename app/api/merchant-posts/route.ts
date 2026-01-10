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

export async function GET() {
  try {
    const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await (prisma as any).merchantPost.updateMany({
      where: {
        active: true,
        lastLocationUpdateAt: { lt: staleCutoff },
      },
      data: { active: false },
    });

    const posts = await (prisma as any).merchantPost.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('GET /api/merchant-posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch merchant posts' }, { status: 500 });
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
    const location = formData.get('location') as string | null;
    const phone = formData.get('phone') as string | null;
    const destination = (formData.get('destination') ?? formData.get('placeOfBusiness')) as string | null;
    const description = formData.get('description') as string | null;
    const activeStr = formData.get('active') as string | null;

    if (!location || !phone) {
      return NextResponse.json({ error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone.ok) {
      return NextResponse.json({ error: normalizedPhone.error }, { status: 400 });
    }

    if (!isAdmin && nameFromForm && nameFromForm !== user.fullName) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
          folder: 'saweg/merchant-posts',
          publicId: `merchant-post-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          contentType: file.type,
        });
        imagePath = uploaded.url;
      } else {
        await ensureUploadDir();

        const ext = path.extname(file.name) || '.jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, buffer);
        imagePath = `/images/merchant-posts/${filename}`;
      }
    }

    const post = await (prisma as any).merchantPost.create({
      data: {
        name: isAdmin && nameFromForm ? nameFromForm : user.fullName,
        location: location.trim(),
        phone: normalizedPhone.e164,
        destination: destination?.trim() || null,
        description: description?.trim() || null,
        image: imagePath,
        active: activeStr === 'true' || activeStr === 'on',
        userId,
        lastLocationUpdateAt: new Date(),
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('POST /api/merchant-posts error:', error);
    return NextResponse.json({ error: 'Failed to create merchant post' }, { status: 500 });
  }
}
