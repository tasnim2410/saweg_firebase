import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
      return new Response('Invalid ID', { status: 400 });
    }

    const post = await (prisma as any).merchantGoodsPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        name: true,
        startingPoint: true,
        destination: true,
        goodsType: true,
        image: true,
        description: true,
        weight: true,
        weightUnit: true,
        user: { select: { fullName: true } },
      },
    });

    if (!post) {
      return new Response('Post not found', { status: 404 });
    }

    const imageUrl = post.image || '';
    const title = post.description || post.name || 'طلب تاجر';
    const startPoint = post.startingPoint || '';
    const endPoint = post.destination || '';
    const route = endPoint ? `من ${startPoint} إلى ${endPoint}` : `من ${startPoint}`;
    
    const weight = post.weight;
    const weightUnit = post.weightUnit || 'طن';
    const weightText = weight ? `الوزن: ${weight} ${weightUnit}` : '';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              borderRadius: '24px',
              overflow: 'hidden',
              width: '600px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            {imageUrl && (
              <div
                style={{
                  width: '100%',
                  height: '300px',
                  display: 'flex',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={imageUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}
            <div
              style={{
                padding: '32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                ⭐ {title.slice(0, 60)}
              </div>
              {route && (
                <div
                  style={{
                    fontSize: '24px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  📍 {route}
                </div>
              )}
              {weightText && (
                <div
                  style={{
                    fontSize: '24px',
                    color: '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  💰 {weightText}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
