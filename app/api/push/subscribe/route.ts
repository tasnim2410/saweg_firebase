import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

type SubscriptionBody = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export async function POST(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userType = (session.user as any).type;
  if (userType !== 'SHIPPER' && userType !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: SubscriptionBody | null = null;
  try {
    body = (await req.json()) as SubscriptionBody;
  } catch {
    body = null;
  }

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'INVALID_SUBSCRIPTION' }, { status: 400 });
  }

  try {
    await (prisma as any).pushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        expirationTime: body.expirationTime ?? null,
        userId: session.user.id,
      },
      update: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        expirationTime: body.expirationTime ?? null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/push/subscribe error:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { endpoint?: string } | null = null;
  try {
    body = (await req.json()) as { endpoint?: string };
  } catch {
    body = null;
  }

  if (!body?.endpoint) {
    return NextResponse.json({ error: 'ENDPOINT_REQUIRED' }, { status: 400 });
  }

  try {
    await (prisma as any).pushSubscription.delete({ where: { endpoint: body.endpoint } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ ok: true });
    }
    console.error('DELETE /api/push/subscribe error:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}
