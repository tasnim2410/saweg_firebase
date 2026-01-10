import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await (prisma as any).merchantPost.updateMany({
      where: {
        userId: session.user.id,
        active: true,
        lastLocationUpdateAt: { lt: staleCutoff },
      },
      data: { active: false },
    });

    const posts = await (prisma as any).merchantPost.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('GET /api/merchant-posts/mine error:', error);
    return NextResponse.json({ error: 'Failed to fetch merchant posts' }, { status: 500 });
  }
}
