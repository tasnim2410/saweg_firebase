import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getLocationLabel } from '@/lib/locations';

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
    const startAr = getLocationLabel(post.startingPoint, 'ar');
    const endAr = getLocationLabel(post.destination, 'ar');
    const route = startAr && endAr
      ? `من ${startAr} إلى ${endAr}`
      : startAr
        ? `من ${startAr}`
        : endAr
          ? `إلى ${endAr}`
          : '';

    const currencyMap: Record<string, string> = { LYD: 'دينار ليبي', TND: 'دينار تونسي', EGP: 'جنيه مصري' };
    const budget = post.budget;
    const currency = post.budgetCurrency ? (currencyMap[post.budgetCurrency] || post.budgetCurrency) : '';
    const budgetText = budget ? `الاجرة: ${budget} ${currency}` : '';

    const weight = post.goodsWeight;
    const weightUnit = post.goodsWeightUnit || 'طن';
    const vehicleType = post.vehicleTypeDesired || '';
    const subtitleParts = [
      vehicleType,
      weight ? `لنقل ${weight} ${weightUnit}` : '',
    ].filter(Boolean).join(' - ');

    const fontPath = join(process.cwd(), 'public', 'fonts', 'IBMPlexSansArabic.ttf');
    const fontData = await readFile(fontPath);
    const fonts = [{ name: 'ArabicFont', data: fontData.buffer, style: 'normal' as const }];

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5', fontFamily: 'ArabicFont, sans-serif' }}>
          {imageUrl ? (
            <div style={{ width: '100%', height: '380px', display: 'flex', overflow: 'hidden', borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}>
              <img src={imageUrl} width={1200} height={380} style={{ width: '100%', height: '380px', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '200px', display: 'flex', backgroundColor: '#d1d5db', borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '24px 40px', gap: '12px', flexGrow: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '34px', fontWeight: 700, color: '#1f2937', display: 'flex', textAlign: 'right', direction: 'rtl', width: '100%' }}>
              {title}
            </div>
            {route ? (
              <div style={{ fontSize: '26px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px', direction: 'rtl', width: '100%' }}>
                <span>📍</span>
                <span>{route}</span>
              </div>
            ) : null}
            {budgetText ? (
              <div style={{ fontSize: '26px', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '8px', direction: 'rtl', width: '100%' }}>
                <span>💰</span>
                <span>{budgetText}</span>
              </div>
            ) : null}
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
