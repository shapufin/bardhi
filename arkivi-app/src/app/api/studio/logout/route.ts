import { NextResponse } from 'next/server';
import { clearSessionCookieHeader } from '@/src/lib/studioAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { ok: true },
    { headers: { 'Set-Cookie': clearSessionCookieHeader() } }
  );
}
