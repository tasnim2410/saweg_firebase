import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

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
    const location = provider.location || '';
    const destination = provider.destination || '';
    const route = destination
      ? `من ${location} الى ${destination}`
      : location
        ? `من ${location}`
        : '';

    const maxCharge = provider.user?.maxCharge;
    const maxChargeUnit = provider.user?.maxChargeUnit || 'طن';
    const chargeText = maxCharge ? `الحمولة: ${maxCharge} ${maxChargeUnit}` : '';

    const fontPath = join(process.cwd(), 'public', 'fonts', 'IBMPlexSansArabic.ttf');
    const fontData = await readFile(fontPath);
    const fonts = [{ name: 'ArabicFont', data: fontData.buffer, style: 'normal' as const }];

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '40px', fontFamily: 'ArabicFont, sans-serif' }}>
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', width: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}>
            {imageUrl ? (
              <div style={{ width: '100%', height: '300px', display: 'flex', overflow: 'hidden' }}>
                <img src={imageUrl} width={600} height={300} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ width: '100%', height: '120px', display: 'flex', backgroundColor: '#e5e7eb' }} />
            )}
            <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '14px', direction: 'rtl' }}>
              <div style={{ fontSize: '30px', fontWeight: 700, color: '#1f2937', display: 'flex' }}>
                {title}
              </div>
              {route ? (
                <div style={{ fontSize: '22px', color: '#6b7280', display: 'flex' }}>
                  {route}
                </div>
              ) : null}
              {chargeText ? (
                <div style={{ fontSize: '22px', color: '#6b7280', display: 'flex' }}>
                  {chargeText}
                </div>
              ) : null}
            </div>
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
