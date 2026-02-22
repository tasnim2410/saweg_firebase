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
    const titleWords = cleanDesc.slice(0, 80).split(' ').reverse().join(' ');
    const title = titleWords;
    const startAr = getLocationLabel(post.startingPoint, 'ar');
    const endAr = getLocationLabel(post.destination, 'ar');
    const routeText = startAr && endAr
      ? `من ${startAr} إلى ${endAr}`
      : startAr
        ? `من ${startAr}`
        : endAr
          ? `إلى ${endAr}`
          : '';
    const route = routeText.split(' ').reverse().join(' ');

    const currencyMap: Record<string, string> = { LYD: 'دينار ليبي', TND: 'دينار تونسي', EGP: 'جنيه مصري' };
    const budget = post.budget;
    const currency = post.budgetCurrency ? (currencyMap[post.budgetCurrency] || post.budgetCurrency) : '';
    const budgetRaw = budget ? `الاجرة: ${budget} ${currency}` : '';
    const budgetText = budgetRaw ? budgetRaw.split(' ').reverse().join(' ') : '';

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
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', fontFamily: 'ArabicFont, sans-serif', padding: '32px 48px', gap: '20px' }}>
          {imageUrl ? (
            <div style={{ display: 'flex', borderRadius: '24px', overflow: 'hidden', border: '5px solid #e5e7eb', width: '1080px', height: '310px', flexShrink: 0 }}>
              <img src={imageUrl} style={{ width: '1080px', height: '310px', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', borderRadius: '24px', width: '1080px', height: '200px', backgroundColor: '#e5e7eb', border: '5px solid #d1d5db', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '1080px' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
              <div style={{ display: 'flex', fontSize: '34px', fontWeight: 700, color: '#1f2937' }}>{title}</div>
            </div>
            {route ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📍</span>
                <div style={{ display: 'flex', fontSize: '24px', color: '#4b5563' }}>{route}</div>
              </div>
            ) : null}
            {budgetText ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>💰</span>
                <div style={{ display: 'flex', fontSize: '24px', color: '#4b5563' }}>{budgetText}</div>
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
