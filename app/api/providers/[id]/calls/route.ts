import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const providerId = Number(id);
    if (!Number.isFinite(providerId)) {
      return NextResponse.json({ ok: false, error: 'INVALID_PROVIDER_ID' }, { status: 400 });
    }

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { userId: true },
    });

    if (!provider) {
      return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
    }

    const updated = await (prisma as any).user.update({
      where: { id: provider.userId },
      data: { callsReceived: { increment: 1 } },
      select: { callsReceived: true },
    });

    return NextResponse.json({ ok: true, callsReceived: updated.callsReceived });
  } catch (err) {
    console.error('POST /api/providers/[id]/calls error:', err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
