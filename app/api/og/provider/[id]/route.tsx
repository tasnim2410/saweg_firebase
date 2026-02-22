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
    const titleWords = cleanDesc.slice(0, 80).split(' ').reverse().join(' ');
    const title = titleWords;
    const locationAr = getLocationLabel(provider.location, 'ar');
    const destinationAr = getLocationLabel(provider.destination, 'ar');
    const routeText = destinationAr && locationAr
      ? `من ${locationAr} إلى ${destinationAr}`
      : locationAr
        ? `من ${locationAr}`
        : '';
    const route = routeText.split(' ').reverse().join(' ');

    const maxCharge = provider.user?.maxCharge;
    const maxChargeUnit = provider.user?.maxChargeUnit || 'طن';
    const chargeText = maxCharge ? `الحمولة: ${maxCharge} ${maxChargeUnit}` : '';

    const fontPath = join(process.cwd(), 'public', 'fonts', 'IBMPlexSansArabic.ttf');
    const fontData = await readFile(fontPath);
    const fonts = [{ name: 'ArabicFont', data: fontData.buffer, style: 'normal' as const }];

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', fontFamily: 'ArabicFont, sans-serif', padding: '32px 48px', gap: '20px' }}>
          {imageUrl ? (
            <div style={{ display: 'flex', borderRadius: '24px', overflow: 'hidden', border: '5px solid #e5e7eb', width: '1080px', height: '340px', flexShrink: 0 }}>
              <img src={imageUrl} style={{ width: '1080px', height: '340px', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', borderRadius: '24px', width: '1080px', height: '200px', backgroundColor: '#e5e7eb', border: '5px solid #d1d5db', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '1080px' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
              <div style={{ display: 'flex', fontSize: '36px', fontWeight: 700, color: '#1f2937' }}>{title}</div>
            </div>
            {route ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '26px' }}>📍</span>
                <div style={{ display: 'flex', fontSize: '26px', color: '#4b5563' }}>{route}</div>
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
