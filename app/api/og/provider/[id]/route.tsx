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
    const rawDesc = (provider.description || provider.name || 'عرض سوّاق');
    const cleanDesc = rawDesc.split(/\n|\r/).map((l: string) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean).join(' - ');
    const title = cleanDesc.slice(0, 80).split(' ').reverse().join(' ');
    const locationAr = getLocationLabel(provider.location, 'ar');
    const destinationAr = getLocationLabel(provider.destination, 'ar');
    const routeRaw = destinationAr && locationAr
      ? `من ${locationAr} إلى ${destinationAr}`
      : locationAr
        ? `من ${locationAr}`
        : '';
    const route = routeRaw.split(' ').reverse().join(' ');

    const maxCharge = provider.user?.maxCharge;
    const maxChargeUnit = provider.user?.maxChargeUnit || 'طن';
    const chargeText = maxCharge ? `الحمولة: ${maxCharge} ${maxChargeUnit}` : '';

    const fontPath = join(process.cwd(), 'public', 'fonts', 'IBMPlexSansArabic.ttf');
    const fontData = await readFile(fontPath);
    const fonts = [{ name: 'ArabicFont', data: fontData.buffer, style: 'normal' as const }];

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'ArabicFont, sans-serif', backgroundColor: '#111827' }}>
          {imageUrl ? (
            <img src={imageUrl} style={{ width: '1200px', height: '430px', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ display: 'flex', width: '1200px', height: '430px', backgroundColor: '#374151', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '10px', padding: '0 40px', backgroundColor: '#111827' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#ffffff', textAlign: 'center' }}>{title}</span>
            </div>
            {route ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '26px' }}>📍</span>
                <span style={{ fontSize: '26px', color: '#9ca3af' }}>{route}</span>
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
