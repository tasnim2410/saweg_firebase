import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function looksLikeEmail(value: string) {
  return value.includes('@');
}

// Resolves an identifier (email or phone) to the user's email address.
// The actual authentication is handled client-side by Firebase Auth.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : '';

    if (!identifier) return NextResponse.json({ ok: false, error: 'IDENTIFIER_REQUIRED' }, { status: 400 });

    // If it's already an email, return it directly
    if (looksLikeEmail(identifier)) {
      return NextResponse.json({ ok: true, email: identifier.toLowerCase() });
    }

    // Phone number → look up the associated email
    const user = await prisma.user.findFirst({
      where: { phone: identifier },
      select: { email: true },
    });

    if (!user?.email) return NextResponse.json({ ok: false, error: 'INVALID_CREDENTIALS' }, { status: 401 });

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
