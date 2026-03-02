import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    
    if (!Number.isInteger(postId) || postId <= 0) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Increment the view count for this specific post
    await (prisma as any).merchantGoodsPost.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking merchant goods post view:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}
