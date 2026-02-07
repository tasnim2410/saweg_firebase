import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/session';
import { reverseGeocode } from '@/lib/geocoding';

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const {
      latitude,
      longitude,
      accuracy,
      speed,
      timestamp,
      tripId,
      providerId,
    } = body;

    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_COORDINATES' },
        { status: 400 }
      );
    }

    // Get address from coordinates (reverse geocoding)
    let address: string | null = null;
    try {
      const geocodingResult = await reverseGeocode(latitude, longitude);
      address = geocodingResult.address;
    } catch (geocodingError) {
      console.warn('Reverse geocoding failed:', geocodingError);
      // Continue without address - it's optional
    }

    // Upsert location record
    const location = await prisma.location.upsert({
      where: {
        userId: session.userId,
      },
      update: {
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        speed: speed ?? null,
        timestamp: new Date(timestamp),
        tripId: tripId ?? null,
        providerId: providerId ?? null,
        address,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: session.userId,
        latitude,
        longitude,
        accuracy: accuracy ?? null,
        speed: speed ?? null,
        timestamp: new Date(timestamp),
        tripId: tripId ?? null,
        providerId: providerId ?? null,
        address,
        isActive: true,
      },
    });

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    console.error('Location update error:', error);
    return NextResponse.json(
      { ok: false, error: 'UPDATE_FAILED' },
      { status: 500 }
    );
  }
}

// Get current location for a user or provider
export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const providerId = searchParams.get('providerId');

    // Only allow fetching own location or if merchant fetching shipper location
    const targetUserId = userId || session.userId;

    const location = await prisma.location.findFirst({
      where: {
        OR: [
          { userId: targetUserId },
          { providerId: providerId || undefined },
        ],
        isActive: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!location) {
      return NextResponse.json(
        { ok: false, error: 'LOCATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, location });
  } catch (error) {
    console.error('Location fetch error:', error);
    return NextResponse.json(
      { ok: false, error: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}
