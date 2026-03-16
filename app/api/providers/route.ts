// app/api/providers/route.ts



import { NextRequest, NextResponse } from 'next/server';

import { Resend } from 'resend';

import { prisma } from '@/lib/prisma';

import { getSession } from '@/lib/session';

import { isAdminIdentifier } from '@/lib/admin';

import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/storage';

import { normalizePhoneNumber } from '@/lib/phone';

import fs from 'fs/promises';

import path from 'path';



export const runtime = 'nodejs';



const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;



const getIdempotencyStore = (): Map<string, { ts: number; promise: Promise<any> }> => {

  const g = globalThis as any;

  if (!g.__sawegIdempotencyStore) g.__sawegIdempotencyStore = new Map();

  return g.__sawegIdempotencyStore as Map<string, { ts: number; promise: Promise<any> }>;

};



const MAX_PROVIDER_IMAGE_BYTES = 10 * 1024 * 1024;



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

      select: {

        id: true,

        name: true,

        location: true,

        phone: true,

        destination: true,

        description: true,

        image: true,

        active: true,

        callCount: true,

        viewCount: true,

        lastLocationUpdateAt: true,

        createdAt: true,

        updatedAt: true,

        userId: true,

        user: {

          select: { fullName: true, email: true, phone: true, carKind: true, maxCharge: true, maxChargeUnit: true, callsReceived: true },

        },

      },

      orderBy: { createdAt: 'desc' },

    });



    const normalized = providers.map((p: any) => {

      const publishedByAdmin = Boolean(

        (p?.user?.email && isAdminIdentifier(String(p.user.email))) ||

          (p?.user?.phone && isAdminIdentifier(String(p.user.phone)))

      );



      return {

        ...p,

        destination: p.destination ?? p.placeOfBusiness ?? null,

        publishedByAdmin,

        user: p.user ? { fullName: p.user.fullName, carKind: p.user.carKind, maxCharge: p.user.maxCharge, maxChargeUnit: p.user.maxChargeUnit, callsReceived: p.user.callsReceived } : null,

      };

    });



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



  const rawIdem = req.headers.get('x-idempotency-key');

  const idempotencyKey = rawIdem && typeof rawIdem === 'string' ? rawIdem.trim() : '';

  const store = getIdempotencyStore();

  const storeKey = idempotencyKey ? `providers:${userId}:${idempotencyKey}` : '';

  if (storeKey) {

    const existing = store.get(storeKey);

    if (existing && Date.now() - existing.ts < IDEMPOTENCY_TTL_MS) {

      try {

        const data = await existing.promise;

        return NextResponse.json(data, { status: 201 });

      } catch {

        store.delete(storeKey);

      }

    } else if (existing) {

      store.delete(storeKey);

    }

  }



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



    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json({ error: 'INVALID_CONTENT_TYPE' }, { status: 400 });
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

          contentBase64: string;

        }

      | null = null;



    if (file && file.size > 0) {

      if (file.size > MAX_PROVIDER_IMAGE_BYTES) {

        return NextResponse.json(

          {

            error: 'IMAGE_TOO_LARGE',

            maxBytes: MAX_PROVIDER_IMAGE_BYTES,

            sizeBytes: file.size,

          },

          { status: 413 }

        );

      }



      const buffer = Buffer.from(await file.arrayBuffer());

      imageAttachment = {

        filename: file.name || 'provider-image',

        contentBase64: buffer.toString('base64'),

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



    const createPromise = (async () => {

      const provider = await prisma.provider.create({ data: createData });

      return {

        ...provider,

        destination: (provider as any).destination ?? (provider as any).placeOfBusiness ?? null,

      };

    })();



    if (storeKey) {

      store.set(storeKey, { ts: Date.now(), promise: createPromise });

      createPromise.catch(() => store.delete(storeKey));

    }



    const created = await createPromise;

    // Fire email notification after responding — don't block the user
    (async () => {
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        const resendFrom = process.env.RESEND_FROM_EMAIL;
        const to = process.env.CONTACT_TO_EMAIL;
        if (!resendApiKey || !resendFrom || !to) return;

        const resend = new Resend(resendApiKey);
        const detailsText = [
          `Name: ${created.name}`,
          `Phone: ${created.phone}`,
          `Location: ${created.location}`,
          `Destination: ${created.destination ?? '-'}`,
          `Description: ${created.description ?? '-'}`,
          `Active: ${created.active ? 'true' : 'false'}`,
          `CreatedAt: ${(created as any).createdAt ? new Date((created as any).createdAt).toISOString() : '-'}`,
          `Id: ${created.id}`,
        ].join('\n');
        const safeDetailsHtml = detailsText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        await resend.emails.send({
          from: resendFrom,
          to,
          subject: `New carousel post added: ${created.name}`,
          text: `A new provider post was added to the carousel.\n\n${detailsText}`,
          html: `<p>A new provider post was added to the carousel.</p><pre style="white-space:pre-wrap">${safeDetailsHtml}</pre>${imageAttachment ? '<p><strong>Image attached.</strong></p>' : ''}`,
          attachments: imageAttachment ? [{ filename: imageAttachment.filename, content: imageAttachment.contentBase64 }] : undefined,
        });
      } catch (error) {
        console.error('POST /api/providers notify email error:', error);
      }
    })();

    return NextResponse.json(created, { status: 201 });

  } catch (error) {

    console.error('POST /api/providers error:', error);

    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });

  }

}

