import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ ok: false, error: 'GONE' }, { status: 410 });
}
