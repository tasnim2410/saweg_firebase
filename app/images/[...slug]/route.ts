import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
};

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const filePath = path.join(process.cwd(), 'public', 'images', ...slug);
    const buffer = await fs.readFile(filePath);
    const ext = slug[slug.length - 1].split('.').pop()?.toLowerCase() ?? '';
    const contentType = MIME[ext] ?? 'application/octet-stream';
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
