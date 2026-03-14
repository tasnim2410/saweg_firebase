import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.provider.updateMany({
      where: {
        userId: session.user.id,
        active: true,
        lastLocationUpdateAt: { lt: staleCutoff },
      },
      data: { active: false },
    });

    const providers = await prisma.provider.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const normalized = providers.map((p: any) => ({
      ...p,
      destination: p.destination ?? p.placeOfBusiness ?? null,
    }));

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('GET /api/providers/mine error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}
