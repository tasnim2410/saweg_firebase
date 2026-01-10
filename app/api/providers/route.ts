// app/api/providers/route.ts

import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isAdminIdentifier } from '@/lib/admin';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';
import { normalizePhoneNumber } from '@/lib/phone';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const uploadDir = path.join(process.cwd(), 'public/images/providers');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function GET() {
  try {
    const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.provider.updateMany({
      where: {
        active: true,
        lastLocationUpdateAt: { lt: staleCutoff },
      },
      data: {
        active: false,
      },
    });

    const providers = await prisma.provider.findMany({
      include: {
        user: {
          select: { fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const normalized = providers.map((p: any) => ({
      ...p,
      destination: p.destination ?? p.placeOfBusiness ?? null,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('GET /api/providers error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
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
    if (!adminOk && sessionType !== 'SHIPPER' && sessionType !== 'ADMIN') {
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

    const nameFromForm =
      typeof formData.get('name') === 'string' ? String(formData.get('name')).trim() : '';
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
    let imageAttachment:
      | {
          filename: string;
          content: Buffer;
          contentType: string;
        }
      | null = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      imageAttachment = {
        filename: file.name || 'provider-image',
        content: buffer,
        contentType: file.type || 'application/octet-stream',
      };

      if (cloudinaryEnabled()) {
        const uploaded = await uploadImageBuffer({
          buffer,
          folder: 'saweg/providers',
          publicId: `provider-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          contentType: file.type,
        });
        imagePath = uploaded.url;
      } else {
        await ensureUploadDir();

        const ext = path.extname(file.name) || '.jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}${ext}`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, buffer);

        imagePath = `/images/providers/${filename}`;
      }
    }

    const createData: any = {
      name: isAdmin && nameFromForm ? nameFromForm : user.fullName,
      location: location.trim(),
      phone: normalizedPhone.e164,
      destination: destination?.trim() || null,
      description: description?.trim() || null,
      image: imagePath,
      active: activeStr === 'true' || activeStr === 'on',
      userId,
      lastLocationUpdateAt: new Date(),
    };

    const provider = await prisma.provider.create({ data: createData });

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const detailsText = [
        `Name: ${provider.name}`,
        `Phone: ${provider.phone}`,
        `Location: ${provider.location}`,
        `Destination: ${(provider as any).destination ?? (provider as any).placeOfBusiness ?? '-'}`,
        `Description: ${provider.description ?? '-'}`,
        `Active: ${provider.active ? 'true' : 'false'}`,
        `CreatedAt: ${(provider as any).createdAt ? new Date((provider as any).createdAt).toISOString() : '-'}`,
        `Id: ${provider.id}`,
      ].join('\n');

      await transporter.sendMail({
        from: `"Saweg Website" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_TO_EMAIL,
        subject: `New carousel post added: ${provider.name}`,
        text: `A new provider post was added to the carousel.\n\n${detailsText}`,
        html: `
<p>A new provider post was added to the carousel.</p>
<pre style="white-space:pre-wrap">${detailsText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
${imageAttachment ? '<p><strong>Image:</strong></p><img src="cid:provider-image" alt="Provider image" style="max-width:600px;width:100%;height:auto" />' : ''}
        `,
        attachments: imageAttachment
          ? [
              {
                filename: imageAttachment.filename,
                content: imageAttachment.content,
                contentType: imageAttachment.contentType,
                cid: 'provider-image',
              },
            ]
          : undefined,
      });
    } catch (error) {
      console.error('POST /api/providers notify email error:', error);
    }

    return NextResponse.json(
      {
        ...provider,
        destination: (provider as any).destination ?? (provider as any).placeOfBusiness ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/providers error:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
