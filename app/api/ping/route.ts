import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AUTH_COOKIE_NAME } from '@/lib/session';

export const runtime = 'nodejs';

// Test GET — visit /api/ping in browser
export async function GET() {
  let prismaOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaOk = true;
  } catch {}

  let adminOk = false;
  let adminError = '';
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');
    adminOk = !!adminAuth;
  } catch (e: any) {
    adminError = e.message;
  }

  return NextResponse.json({
    pong: true,
    runtime: 'nodejs',
    cookie: AUTH_COOKIE_NAME,
    prismaOk,
    adminOk,
    adminError: adminError || undefined,
    time: new Date().toISOString(),
  });
}

// Test POST — same as what login calls
export async function POST() {
  return NextResponse.json({ pong: true, method: 'POST' });
}
