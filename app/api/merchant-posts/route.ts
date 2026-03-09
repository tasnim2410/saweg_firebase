import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { isAdminIdentifier } from '@/lib/admin';
import { cloudinaryEnabled, uploadImageBuffer } from '@/lib/storage';
import { getLocationLabel } from '@/lib/locations';
import { normalizePhoneNumber } from '@/lib/phone';
import { sendPushToSubscription } from '@/lib/webPush';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const uploadDir = path.join(process.cwd(), 'public/images/merchant-posts');

async function ensureUploadDir() {
  await fs.mkdir(uploadDir, { recursive: true });
}

export async function GET() {
  return NextResponse.json({ error: 'GONE' }, { status: 410 });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'GONE' }, { status: 410 });
}
