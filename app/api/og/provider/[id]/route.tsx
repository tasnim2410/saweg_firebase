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
    const providerId = Number(id);

    if (!Number.isFinite(providerId)) {
      return new Response('Invalid ID', { status: 400 });
    }

    const provider = await (prisma as any).provider.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        location: true,
        destination: true,
        description: true,
        image: true,
        user: {
          select: {
            truckImage: true,
            maxCharge: true,
            maxChargeUnit: true,
          },
        },
      },
    });

    if (!provider) {
      return new Response('Provider not found', { status: 404 });
    }

    const imageUrl = provider.image || provider.user?.truckImage || '';
    const title = (provider.description || provider.name || 'عرض سوّاق').slice(0, 60);
    const locationAr = getLocationLabel(provider.location, 'ar');
    const destinationAr = getLocationLabel(provider.destination, 'ar');
    const route = destinationAr && locationAr
      ? `من ${locationAr} إلى ${destinationAr}`
      : locationAr
        ? `من ${locationAr}`
        : '';

    const maxCharge = provider.user?.maxCharge;
    const maxChargeUnit = provider.user?.maxChargeUnit || 'طن';
    const chargeText = maxCharge ? `الحمولة: ${maxCharge} ${maxChargeUnit}` : '';

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
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', fontFamily: 'ArabicFont, sans-serif', padding: '40px 60px', gap: '28px' }}>
          {imageUrl ? (
            <div style={{ display: 'flex', borderRadius: '28px', overflow: 'hidden', border: '6px solid #e5e7eb', width: '900px', height: '340px', flexShrink: 0 }}>
              <img src={imageUrl} width={900} height={340} style={{ width: '900px', height: '340px', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', borderRadius: '28px', width: '900px', height: '200px', backgroundColor: '#e5e7eb', border: '6px solid #d1d5db', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
            <Words text={title} fontSize='38px' fontWeight={700} color='#1f2937' />
            {route ? (
              <div style={{ display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                {route.split(' ').map((w, i) => (
                  <span key={i} style={{ fontSize: '28px', color: '#4b5563' }}>{w}</span>
                ))}
                <span style={{ fontSize: '28px' }}>📍</span>
              </div>
            ) : null}
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  } catch (error) {
    console.error('Error generating provider OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
