import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

import { getSession } from '@/lib/session';

import { isAdminIdentifier } from '@/lib/admin';

import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/storage';

import { normalizePhoneNumber } from '@/lib/phone';

import { sendPushToSubscription } from '@/lib/webPush';

import { isValidVehicleType, normalizeVehicleType } from '@/lib/vehicleTypes';

import { getLocationLabel } from '@/lib/locations';

import { getNotificationClickCounts } from '@/lib/notificationClicks';

import fs from 'fs/promises';

import path from 'path';



export const runtime = 'nodejs';



const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;



const getIdempotencyStore = (): Map<string, { ts: number; promise: Promise<any> }> => {

  const g = globalThis as any;

  if (!g.__sawegIdempotencyStore) g.__sawegIdempotencyStore = new Map();

  return g.__sawegIdempotencyStore as Map<string, { ts: number; promise: Promise<any> }>;

};



const MAX_IMAGE_BYTES = 10 * 1024 * 1024;



const uploadDir = path.join(process.cwd(), 'public/images/merchant-goods-posts');



async function ensureUploadDir() {

  await fs.mkdir(uploadDir, { recursive: true });

}



export async function GET() {

  try {

    const posts = await (prisma as any).merchantGoodsPost.findMany({

      orderBy: { createdAt: 'desc' },

      select: {

        id: true,

        name: true,

        phone: true,

        startingPoint: true,

        destination: true,

        destinations: true,

        goodsType: true,

        goodsWeight: true,

        goodsWeightUnit: true,

        loadingDate: true,

        vehicleTypeDesired: true,

        budget: true,

        budgetCurrency: true,

        image: true,

        description: true,

        userId: true,

        callCount: true,

        viewCount: true,

        createdAt: true,

        updatedAt: true,

        user: {

          select: {

            fullName: true,

            phone: true,

            email: true,

            callsReceived: true,

          },

        },

      },

    });

    // Get notification click counts for all posts
    const postIds = posts.map((p: any) => p.id);
    const notificationClickCounts = await getNotificationClickCounts('merchant-goods-post', postIds);

    const normalized = (posts as any[]).map((p) => {

      const publishedByAdmin = Boolean(

        (p?.user?.email && isAdminIdentifier(String(p.user.email))) ||

          (p?.user?.phone && isAdminIdentifier(String(p.user.phone)))

      );



      return {

        ...p,

        publishedByAdmin,

        notificationClickCount: notificationClickCounts[p.id] || 0,

        user: p.user

          ? {

              fullName: p.user.fullName,

              phone: p.user.phone ?? null,

              callsReceived: p.user.callsReceived,

            }

          : null,

      };

    });



    return NextResponse.json(normalized);

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



  const rawIdem = req.headers.get('x-idempotency-key');

  const idempotencyKey = rawIdem && typeof rawIdem === 'string' ? rawIdem.trim() : '';

  const store = getIdempotencyStore();

  const storeKey = idempotencyKey ? `merchant-goods-posts:${userId}:${idempotencyKey}` : '';

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



  try {

    if (!adminOk && sessionType !== 'MERCHANT' && sessionType !== 'ADMIN') {

      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    }



    const isAdmin = Boolean(sessionType === 'ADMIN' || adminOk);



    const user = await prisma.user.findUnique({

      where: { id: userId },

      select: { fullName: true },

    });



    if (!user) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    }



    const formData = await req.formData();



    const nameFromForm = typeof formData.get('name') === 'string' ? String(formData.get('name')).trim() : '';



    const phoneFromForm = typeof formData.get('phone') === 'string' ? String(formData.get('phone')).trim() : '';

    if (!phoneFromForm) {

      return NextResponse.json({ error: 'PHONE_REQUIRED' }, { status: 400 });

    }



    const normalizedPhone = normalizePhoneNumber(phoneFromForm);

    if (!normalizedPhone.ok) {

      return NextResponse.json({ error: normalizedPhone.error }, { status: 400 });

    }



    const startingPoint = typeof formData.get('startingPoint') === 'string' ? String(formData.get('startingPoint')).trim() : '';

    const destination = typeof formData.get('destination') === 'string' ? String(formData.get('destination')).trim() : '';

    const destinationsRaw = typeof formData.get('destinations') === 'string' ? String(formData.get('destinations')).trim() : '';

    const goodsType = typeof formData.get('goodsType') === 'string' ? String(formData.get('goodsType')).trim() : '';

    const goodsWeightRaw = typeof formData.get('goodsWeight') === 'string' ? String(formData.get('goodsWeight')).trim() : '';

    const goodsWeightUnit = typeof formData.get('goodsWeightUnit') === 'string' ? String(formData.get('goodsWeightUnit')).trim() : '';

    const loadingDateRaw = typeof formData.get('loadingDate') === 'string' ? String(formData.get('loadingDate')).trim() : '';

    const vehicleTypesDesiredRaw = typeof formData.get('vehicleTypesDesired') === 'string' ? String(formData.get('vehicleTypesDesired')).trim() : '';

    const description = typeof formData.get('description') === 'string' ? String(formData.get('description')).trim() : '';

    const budgetRaw = typeof formData.get('budget') === 'string' ? String(formData.get('budget')).trim() : '';

    const budgetCurrencyRaw = typeof formData.get('budgetCurrency') === 'string' ? String(formData.get('budgetCurrency')).trim() : '';



    let destinations: string[] = [];

    if (destinationsRaw) {

      try {

        const parsed = JSON.parse(destinationsRaw);

        if (Array.isArray(parsed)) {

          destinations = parsed.filter(d => typeof d === 'string' && d.trim()).map(d => String(d).trim());

        }

      } catch {

        // ignore invalid JSON

      }

    }



    // Parse vehicle types array

    let vehicleTypesDesired: string[] = [];

    if (vehicleTypesDesiredRaw) {

      try {

        const parsed = JSON.parse(vehicleTypesDesiredRaw);

        if (Array.isArray(parsed)) {

          vehicleTypesDesired = parsed.filter(vt => typeof vt === 'string' && vt.trim()).map(vt => {

            const vtStr = String(vt).trim();

            // Normalize known vehicle types

            if (isValidVehicleType(vtStr)) {

              return normalizeVehicleType(vtStr) || vtStr;

            }

            return vtStr;

          });

        }

      } catch {

        // ignore invalid JSON

      }

    }



    if (!description) {

      return NextResponse.json({ error: 'MISSING_REQUIRED_FIELDS' }, { status: 400 });

    }



    // Validate weight only if provided

    let goodsWeight: number | null = null;

    let normalizedUnit: string | null = null;

    if (goodsWeightRaw) {

      const parsedWeight = Number(goodsWeightRaw);

      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {

        return NextResponse.json({ error: 'INVALID_WEIGHT' }, { status: 400 });

      }

      goodsWeight = parsedWeight;



      const unitLower = goodsWeightUnit.toLowerCase();

      if (unitLower !== 'kg' && unitLower !== 'ton') {

        return NextResponse.json({ error: 'INVALID_WEIGHT_UNIT' }, { status: 400 });

      }

      normalizedUnit = unitLower;

    }



    // Validate loading date only if provided

    let loadingDate: Date | null = null;

    if (loadingDateRaw) {

      const parsedDate = new Date(loadingDateRaw);

      if (Number.isNaN(parsedDate.getTime())) {

        return NextResponse.json({ error: 'INVALID_LOADING_DATE' }, { status: 400 });

      }

      loadingDate = parsedDate;

    }



    let budget: number | null = null;

    let budgetCurrency: 'TND' | 'LYD' | 'EGP' | null = null;

    if (budgetRaw) {

      const parsedBudget = Number(budgetRaw);

      if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {

        return NextResponse.json({ error: 'INVALID_BUDGET' }, { status: 400 });

      }

      budget = parsedBudget;



      const currency = budgetCurrencyRaw.toUpperCase();

      if (currency !== 'TND' && currency !== 'LYD' && currency !== 'EGP') {

        return NextResponse.json({ error: 'INVALID_BUDGET_CURRENCY' }, { status: 400 });

      }

      budgetCurrency = currency as any;

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



    const createPromise = (async () => {

      const post = await (prisma as any).merchantGoodsPost.create({

        data: {

          name: isAdmin && nameFromForm ? nameFromForm : user.fullName,

          phone: normalizedPhone.e164,

          startingPoint: startingPoint || null,

          destination: destination || null,

          destinations: destinations.length > 0 ? destinations : null,

          goodsType: goodsType || null,

          goodsWeight: goodsWeight,

          goodsWeightUnit: normalizedUnit,

          loadingDate: loadingDate,

          vehicleTypeDesired: vehicleTypesDesired.length > 0 ? vehicleTypesDesired : null,

          budget,

          budgetCurrency,

          image: imagePath,

          description: description || null,

          userId,

        },

        include: {

          user: {

            select: {

              fullName: true,

              phone: true,

            },

          },

        },

      });

      return post;

    })();



    if (storeKey) {

      store.set(storeKey, { ts: Date.now(), promise: createPromise });

      createPromise.catch(() => store.delete(storeKey));

    }



    const created = await createPromise;

    // Fire push notifications after responding — don't block the user
    (async () => {
      try {
        const subs = await (prisma as any).pushSubscription.findMany({
          where: { user: { type: 'SHIPPER' } },
          select: { endpoint: true, p256dh: true, auth: true, expirationTime: true },
        });

        const title = 'Saweg';
        const startingPointAr = created.startingPoint ? getLocationLabel(created.startingPoint, 'ar') : '';
        const destinationAr = created.destination ? getLocationLabel(created.destination, 'ar') : '';
        const routeLine = startingPointAr && destinationAr
          ? `من ${startingPointAr} → ${destinationAr}`
          : startingPointAr ? `من ${startingPointAr}` : destinationAr ? `إلى ${destinationAr}` : '';
        const descriptionTruncated = created.description
          ? (created.description.length > 80 ? created.description.slice(0, 77) + '...' : created.description)
          : '';
        let body: string;
        if (routeLine && descriptionTruncated) body = `${routeLine}\n${descriptionTruncated}`;
        else if (routeLine) body = routeLine;
        else if (descriptionTruncated) body = `طلب جديد من تاجر\n${descriptionTruncated}`;
        else body = 'طلب جديد من تاجر';

        const url = `/ar/merchant-goods-posts/${created.id}`;

        await Promise.allSettled(
          subs.map(async (sub: any) => {
            const r = await sendPushToSubscription(
              { endpoint: sub.endpoint, expirationTime: sub.expirationTime, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              { title, body, url }
            );
            if (!r.ok && r.gone) {
              await (prisma as any).pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => null);
            }
          })
        );
      } catch (error) {
        console.error('POST /api/merchant-goods-posts push notify error:', error);
      }
    })();

    return NextResponse.json(created, { status: 201 });

  } catch (error) {

    console.error('POST /api/merchant-goods-posts error:', error);

    return NextResponse.json({ error: 'Failed to create merchant goods post' }, { status: 500 });

  }

}

