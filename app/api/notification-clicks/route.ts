import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationTag, url, userId } = body;

    // Parse URL to extract post type and ID if it's a post URL
    let postType: string | null = null;
    let postId: number | null = null;

    if (url) {
      try {
        const urlObj = new URL(url, process.env.NEXT_PUBLIC_APP_URL || 'https://saweg.app');
        const pathname = urlObj.pathname;

        // Match patterns like /ar/providers/123, /en/merchant-goods-posts/456
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

    // Get user agent from headers
    const userAgent = req.headers.get('user-agent') || undefined;

    // Create notification click record
    await prisma.notificationClick.create({
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

// GET endpoint to retrieve notification click stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postType = searchParams.get('postType');
    const postId = searchParams.get('postId');

    if (postType && postId) {
      // Get clicks for a specific post
      const count = await prisma.notificationClick.count({
        where: {
          postType,
          postId: parseInt(postId, 10),
        },
      });

      return NextResponse.json({ count });
    }

    // Get overall stats
    const totalClicks = await prisma.notificationClick.count();
    
    const clicksByType = await prisma.notificationClick.groupBy({
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
