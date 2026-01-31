import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { sendPushToSubscription } from '@/lib/webPush';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let userType = (session.user as any).type;
  if (!userType) {
    try {
      const u = await (prisma as any).user.findUnique({
        where: { id: session.user.id },
        select: { type: true },
      });
      userType = u?.type;
    } catch {
      userType = null;
    }
  }
  if (userType !== 'SHIPPER' && userType !== 'ADMIN') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  let body: { title?: string; message?: string; url?: string } | null = null;
  try {
    body = (await req.json()) as any;
  } catch {
    body = null;
  }

  const title = typeof body?.title === 'string' ? body.title : 'Saweg';
  const message = typeof body?.message === 'string' ? body.message : 'Test push from Saweg';
  const url = typeof body?.url === 'string' ? body.url : '/ar';

  try {
    const subs = await (prisma as any).pushSubscription.findMany({
      where: { userId: session.user.id },
      select: { endpoint: true, p256dh: true, auth: true, expirationTime: true },
    });

    if (!subs.length) {
      return NextResponse.json({ ok: false, error: 'NO_SUBSCRIPTIONS' }, { status: 400 });
    }

    const results: Array<{ endpoint: string; ok: boolean; gone?: boolean; statusCode?: number }> = [];

    for (const sub of subs) {
      const r = await sendPushToSubscription(
        {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        { title, body: message, url }
      );

      results.push({
        endpoint: sub.endpoint,
        ok: r.ok,
        gone: !r.ok ? r.gone : undefined,
        statusCode: !r.ok ? r.statusCode : undefined,
      });

      if (!r.ok && r.gone) {
        await (prisma as any).pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => null);
      }
    }

    return NextResponse.json({ ok: true, count: subs.length, results });
  } catch (error) {
    console.error('POST /api/push/test error:', error);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
