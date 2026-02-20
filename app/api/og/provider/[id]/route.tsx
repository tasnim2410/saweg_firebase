import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      ? `من ${location} إلى ${destination}`
      : location
        ? `من ${location}`
        : '';

    const maxCharge = provider.user?.maxCharge;
    const maxChargeUnit = provider.user?.maxChargeUnit || 'طن';
    const chargeText = maxCharge ? `الحمولة: ${maxCharge} ${maxChargeUnit}` : '';

    const children: React.ReactNode[] = [];

    if (imageUrl) {
      children.push(
        <div key="img" style={{ width: '100%', height: '300px', display: 'flex', overflow: 'hidden' }}>
          <img src={imageUrl} width={600} height={300} style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
        </div>
      );
    }

    const textRows: React.ReactNode[] = [];
    textRows.push(
      <div key="title" style={{ fontSize: 32, fontWeight: 700, color: '#1f2937', display: 'flex', textAlign: 'center', justifyContent: 'center' }}>
        {'🚚  ' + title}
      </div>
    );
    if (route) {
      textRows.push(
        <div key="route" style={{ fontSize: 24, color: '#6b7280', display: 'flex', textAlign: 'center', justifyContent: 'center' }}>
          {'📍  ' + route}
        </div>
      );
    }
    if (chargeText) {
      textRows.push(
        <div key="charge" style={{ fontSize: 24, color: '#6b7280', display: 'flex', textAlign: 'center', justifyContent: 'center' }}>
          {'💰  ' + chargeText}
        </div>
      );
    }

    children.push(
      <div key="text" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {textRows}
      </div>
    );

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', width: 600, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}>
            {children}
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (error) {
    console.error('Error generating provider OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}
