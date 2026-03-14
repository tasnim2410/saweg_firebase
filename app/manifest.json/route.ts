import { NextResponse } from 'next/server';

const manifest = {
  id: '/',
  name: 'Saweg',
  short_name: 'Saweg',
  description: 'Bilingual shipping marketplace for shippers and merchants',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#FFB81C',
  orientation: 'portrait',
  prefer_related_applications: false,
  icons: [
    { src: '/icons/icon-192x192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-192x192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-512x512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512x512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  dir: 'auto',
  lang: 'ar',
};

export function GET() {
  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
