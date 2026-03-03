import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationTag, url, userId } = body;

    let postType: string | null = null;
    let postId: number | null = null;

    if (url) {
      try {
        const urlObj = new URL(url, process.env.NEXT_PUBLIC_APP_URL || 'https://saweg.app');
        const pathname = urlObj.pathname;

        const providerMatch = pathname.match(/\/providers\/(\d+)/);
        const merchantPostMatch = pathname.match(/\/merchant-posts\/(\d+)/);
        const merchantGoodsPostMatch = pathname.match(/\/merchant-goods-posts\/(\d+)/);

        if (providerMatch) {
          postType = 'provider';
          postId = parseInt(providerMatch[1], 10);
        } else if (merchantGoodsPostMatch) {
          postType = 'merchant-goods-post';
          postId = parseInt(merchantGoodsPostMatch[1], 10);
        } else if (merchantPostMatch) {
          postType = 'merchant-post';
          postId = parseInt(merchantPostMatch[1], 10);
        }
      } catch {
        // Invalid URL, ignore
      }
    }

    const userAgent = req.headers.get('user-agent') || undefined;

    await (prisma as any).notificationClick.create({
      data: {
        notificationTag: notificationTag || null,
        url: url || null,
        postType,
        postId,
        userId: userId || null,
        userAgent,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking notification click:', error);
    return NextResponse.json(
      { error: 'Failed to track notification click' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postType = searchParams.get('postType');
    const postId = searchParams.get('postId');

    if (postType && postId) {
      const count = await (prisma as any).notificationClick.count({
        where: {
          postType,
          postId: parseInt(postId, 10),
        },
      });

      return NextResponse.json({ count });
    }

    const totalClicks = await (prisma as any).notificationClick.count();
    
    const clicksByType = await (prisma as any).notificationClick.groupBy({
      by: ['postType'],
      _count: {
        id: true,
      },
    });

    return NextResponse.json({
      totalClicks,
      clicksByType,
    });
  } catch (error) {
    console.error('Error fetching notification click stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
