import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [merchantCount, shipperCount] = await Promise.all([
      prisma.user.count({ where: { type: 'MERCHANT' } }),
      prisma.user.count({ where: { type: 'SHIPPER' } }),
    ]);

    return NextResponse.json(
      { ok: true, merchantCount, shipperCount },
      { headers: { 'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, merchantCount: 0, shipperCount: 0 },
      { headers: { 'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  }
}
