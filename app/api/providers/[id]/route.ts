import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isAdminIdentifier } from '@/lib/admin';

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminByIdentifier = Boolean(
    (session.user.email && isAdminIdentifier(session.user.email)) ||
      (session.user.phone && isAdminIdentifier(session.user.phone))
  );

  const isAdmin = Boolean((session.user as any).type === 'ADMIN' || adminByIdentifier);

  const { id } = await Promise.resolve((context as any).params);
  const providerId = Number(id);
  if (!Number.isFinite(providerId)) {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isAdmin && body && typeof body === 'object' && 'name' in body) {
    return NextResponse.json({ error: 'Name cannot be updated' }, { status: 400 });
  }

  const existing = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }

  if (!isAdmin && existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const data: Record<string, any> = {};
  let updatesLocation = false;

  if (isAdmin && typeof body?.name === 'string') {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    data.name = name;
  }

  if (typeof body?.location === 'string') {
    const location = body.location.trim();
    if (!location) {
      return NextResponse.json({ error: 'Missing location' }, { status: 400 });
    }
    data.location = location;
    data.lastLocationUpdateAt = new Date();
    data.active = true;
    updatesLocation = true;
  }

  if (typeof body?.phone === 'string') {
    const phone = body.phone.trim();
    if (!phone) {
      return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
    }
    data.phone = phone;
  }

  const incomingDestination =
    body?.destination === undefined ? body?.placeOfBusiness : body?.destination;

  if (incomingDestination === null) {
    data.destination = null;
  } else if (typeof incomingDestination === 'string') {
    data.destination = incomingDestination.trim() || null;
  }

  if (body?.description === null) {
    data.description = null;
  } else if (typeof body?.description === 'string') {
    data.description = body.description.trim() || null;
  }

  if (!updatesLocation && typeof body?.active === 'boolean') {
    data.active = body.active;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updated = await prisma.provider.update({
    where: { id: providerId },
    data: data as any,
  });

  return NextResponse.json({
    ...updated,
    destination: (updated as any).destination ?? (updated as any).placeOfBusiness ?? null,
  });
}

export async function DELETE(_req: NextRequest, context: { params: { id: string } }) {
  const session = await getSession(_req);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminByIdentifier = Boolean(
    (session.user.email && isAdminIdentifier(session.user.email)) ||
      (session.user.phone && isAdminIdentifier(session.user.phone))
  );

  const isAdmin = Boolean((session.user as any).type === 'ADMIN' || adminByIdentifier);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await Promise.resolve((context as any).params);
  const providerId = Number(id);
  if (!Number.isFinite(providerId)) {
    return NextResponse.json({ error: 'Invalid provider id' }, { status: 400 });
  }

  try {
    await prisma.provider.delete({ where: { id: providerId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }
}
