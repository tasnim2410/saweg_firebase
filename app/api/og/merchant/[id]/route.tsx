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
    const title = cleanDesc.slice(0, 80);
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

    const Words = ({ text, fontSize, fontWeight, color }: { text: string; fontSize: string; fontWeight?: number; color: string }) => (
      <div style={{ display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
        {text.split(' ').map((w, i) => (
          <span key={i} style={{ fontSize, fontWeight: fontWeight || 400, color }}>{w}</span>
        ))}
      </div>
    );

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', fontFamily: 'ArabicFont, sans-serif', padding: '40px 60px', gap: '24px' }}>
          {imageUrl ? (
            <div style={{ display: 'flex', borderRadius: '28px', overflow: 'hidden', border: '6px solid #e5e7eb', width: '900px', height: '320px', flexShrink: 0 }}>
              <img src={imageUrl} width={900} height={320} style={{ width: '900px', height: '320px', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', borderRadius: '28px', width: '900px', height: '200px', backgroundColor: '#e5e7eb', border: '6px solid #d1d5db', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
            <Words text={title} fontSize='36px' fontWeight={700} color='#1f2937' />
            {route ? (
              <div style={{ display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                {route.split(' ').map((w, i) => (
                  <span key={i} style={{ fontSize: '26px', color: '#4b5563' }}>{w}</span>
                ))}
                <span style={{ fontSize: '26px' }}>📍</span>
              </div>
            ) : null}
            {budgetText ? (
              <div style={{ display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                {budgetText.split(' ').map((w, i) => (
                  <span key={i} style={{ fontSize: '26px', color: '#4b5563' }}>{w}</span>
                ))}
                <span style={{ fontSize: '26px' }}>💰</span>
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
