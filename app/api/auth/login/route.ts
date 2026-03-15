import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Resolves an identifier (email or phone) to the user's email address.
// The actual authentication is handled client-side by Firebase Auth.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';

    if (!identifier) return NextResponse.json({ ok: false, error: 'IDENTIFIER_REQUIRED' }, { status: 400 });

    // If it's already an email, return it directly
    if (identifier.includes('@')) {
      return NextResponse.json({ ok: true, email: identifier.toLowerCase() });
    }

    // Phone number → normalize to E.164, then look up the associated email
    const normalized = normalizePhoneNumber(identifier);
    if (!normalized.ok) {
      return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { phone: normalized.e164 },
      select: { email: true },
    });

    if (!user?.email) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
