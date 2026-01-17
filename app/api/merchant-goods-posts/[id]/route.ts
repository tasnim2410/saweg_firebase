import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isAdminIdentifier } from '@/lib/admin';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminByIdentifier = Boolean(
    (session.user.email && isAdminIdentifier(session.user.email)) ||
      (session.user.phone && isAdminIdentifier(session.user.phone))
  );

  const isAdmin = Boolean((session.user as any).type === 'ADMIN' || adminByIdentifier);

  const { id } = await context.params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isAdmin) {
    const hasName = body && typeof body === 'object' && 'name' in body;
    if (hasName) {
      return NextResponse.json({ error: 'Name cannot be updated' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nameRaw = typeof body?.name === 'string' ? body.name : null;
  if (nameRaw === null) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  const name = nameRaw.trim();
  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }

  const existing = await (prisma as any).merchantGoodsPost.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const updated = await (prisma as any).merchantGoodsPost.update({
    where: { id: postId },
    data: { name },
    include: {
      user: {
        select: {
          fullName: true,
        },
      },
    },
  });

  return NextResponse.json(updated);
}
