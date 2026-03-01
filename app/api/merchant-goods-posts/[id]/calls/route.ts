import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const postId = Number(id);
    if (!Number.isFinite(postId)) {
      return NextResponse.json({ ok: false, error: 'INVALID_POST_ID' }, { status: 400 });
    }

    const post = await prisma.merchantGoodsPost.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const updated = await (prisma as any).user.update({
      where: { id: post.userId },
      data: { callsReceived: { increment: 1 } },
      select: { callsReceived: true },
    });

    return NextResponse.json({ ok: true, callsReceived: updated.callsReceived });
  } catch (err) {
    console.error('POST /api/merchant-goods-posts/[id]/calls error:', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
