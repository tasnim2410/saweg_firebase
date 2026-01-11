import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/webPush';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ publicKey: getVapidPublicKey() });
  } catch (error: any) {
    return NextResponse.json(
      { error: typeof error?.message === 'string' ? error.message : 'Missing VAPID_PUBLIC_KEY' },
      { status: 500 }
    );
  }
}
