import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const swPath = path.join(process.cwd(), 'public', 'sw.js');
    const content = await fs.readFile(swPath, 'utf-8');
    return new Response(content, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    return new Response('// Service worker unavailable', {
      status: 404,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }
}
