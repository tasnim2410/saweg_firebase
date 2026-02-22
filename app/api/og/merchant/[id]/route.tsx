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
    const rawDesc = (post.description || post.name || 'طلب تاجر');
    const cleanDesc = rawDesc.split(/\n|\r/).map((l: string) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean).join(' - ');
    const title = cleanDesc.slice(0, 80).split(' ').reverse().join(' ');
    const startAr = getLocationLabel(post.startingPoint, 'ar');
    const endAr = getLocationLabel(post.destination, 'ar');
    const routeRaw = startAr && endAr
      ? `من ${startAr} إلى ${endAr}`
      : startAr
        ? `من ${startAr}`
        : endAr
          ? `إلى ${endAr}`
          : '';
    const route = routeRaw.split(' ').reverse().join(' ');

    const currencyMap: Record<string, string> = { LYD: 'دينار ليبي', TND: 'دينار تونسي', EGP: 'جنيه مصري' };
    const budget = post.budget;
    const currency = post.budgetCurrency ? (currencyMap[post.budgetCurrency] || post.budgetCurrency) : '';
    const budgetText = budget ? `الاجرة: ${budget} ${currency}`.split(' ').reverse().join(' ') : '';

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
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'ArabicFont, sans-serif', backgroundColor: '#ffffff' }}>
          {imageUrl ? (
            <img src={imageUrl} style={{ width: '1200px', height: '420px', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ display: 'flex', width: '1200px', height: '420px', backgroundColor: '#e5e7eb', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px', padding: '0 80px', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: '34px', fontWeight: 700, color: '#1f2937', textAlign: 'center' }}>{title}</span>
            </div>
            {route ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <span style={{ fontSize: '24px', color: '#6b7280' }}>{route}</span>
              </div>
            ) : null}
            {budgetText ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '24px' }}>💰</span>
                <span style={{ fontSize: '24px', color: '#6b7280' }}>{budgetText}</span>
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
