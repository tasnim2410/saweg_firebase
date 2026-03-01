import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DAYS_TO_DELETE = 4;

export async function GET() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_DELETE);

    // Delete old providers
    const providersResult = await prisma.provider.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    // Delete old merchant goods posts
    const merchantPostsResult = await prisma.merchantGoodsPost.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      deleted: {
        providers: providersResult.count,
        merchantPosts: merchantPostsResult.count,
      },
    });
  } catch (err) {
    console.error('Auto-delete error:', err);
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
