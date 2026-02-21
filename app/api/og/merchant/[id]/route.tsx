import { NextRequest } from 'next/server';

// OG image generation — work in progress, re-enable when ready
/*
import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';

async function loadArabicFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CBFQLaig.woff',
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

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
        goodsWeight: true,
        goodsWeightUnit: true,
        budget: true,
        budgetCurrency: true,
        vehicleTypeDesired: true,
        user: { select: { fullName: true } },
      },
    });

    if (!post) {
      return new Response('Post not found', { status: 404 });
    }

    const imageUrl = post.image || '';
    const title = (post.description || post.name || 'طلب تاجر').slice(0, 60);
    const startPoint = post.startingPoint || '';
    const endPoint = post.destination || '';
    const route = endPoint && startPoint
      ? `من ${startPoint} إلى ${endPoint}`
      : startPoint
        ? `من ${startPoint}`
        : endPoint
          ? `إلى ${endPoint}`
          : '';

    const currencyMap: Record<string, string> = { LYD: 'دينار ليبي', TND: 'دينار تونسي', EGP: 'جنيه مصري' };
    const budget = post.budget;
    const currency = post.budgetCurrency ? (currencyMap[post.budgetCurrency] || post.budgetCurrency) : '';
    const budgetText = budget ? `الأجرة: ${budget} ${currency}` : '';

    const weight = post.goodsWeight;
    const weightUnit = post.goodsWeightUnit || 'طن';
    const vehicleType = post.vehicleTypeDesired || '';
    const subtitleParts = [
      vehicleType ? vehicleType : '',
      weight ? `لنقل ${weight} ${weightUnit}` : '',
    ].filter(Boolean).join(' - ');

    const fontData = await loadArabicFont();
    const fonts = fontData
      ? [{ name: 'NotoArabic', data: fontData, style: 'normal' as const }]
      : [];

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '40px', fontFamily: 'NotoArabic, sans-serif' }}>
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', width: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}>
            {imageUrl ? (
              <div style={{ width: '100%', height: '300px', display: 'flex', overflow: 'hidden' }}>
                <img src={imageUrl} width={600} height={300} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: '100%', height: '120px', display: 'flex', backgroundColor: '#e5e7eb' }} />
            )}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '14px', direction: 'rtl' }}>
              {subtitleParts ? (
                <div style={{ fontSize: '22px', color: '#6b7280', display: 'flex' }}>
                  {subtitleParts}
                </div>
              ) : null}
              <div style={{ fontSize: '30px', fontWeight: 700, color: '#1f2937', display: 'flex' }}>
                {title}
              </div>
              {route ? (
                <div style={{ fontSize: '22px', color: '#6b7280', display: 'flex' }}>
                  {route}
                </div>
              ) : null}
              {budgetText ? (
                <div style={{ fontSize: '22px', color: '#6b7280', display: 'flex' }}>
                  {budgetText}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  } catch (error) {
    console.error('Error generating merchant OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
*/

export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  return new Response('Not found', { status: 404 });
}
