import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({ ok: true, path: '/api/auth/test' });
}

export function POST() {
  return NextResponse.json({ ok: true, path: '/api/auth/test', method: 'POST' });
}
