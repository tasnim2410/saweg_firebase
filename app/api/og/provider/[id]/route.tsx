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
