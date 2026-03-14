import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ pong: true, time: new Date().toISOString() });
}

export function POST() {
  return NextResponse.json({ pong: true, method: 'POST', time: new Date().toISOString() });
}
