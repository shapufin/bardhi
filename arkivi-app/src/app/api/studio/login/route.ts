import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/src/lib/payloadClient';
import {
  createSessionToken,
  sessionCookieHeader,
  verifyStudioPasswordHash,
  SESSION_TTL_MS,
} from '@/src/lib/studioAuth';

export const dynamic = 'force-dynamic';

// Throttling i thjeshtët në memorie: 5 tentime / 10 minuta për IP.
// Mjafton për një kontejner unik; zëvendësohet me Redis nëse skalohet.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.reset < now) {
    attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Shumë tentime. Provo sërish pas 10 minutash.' },
      { status: 429 }
    );
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'Kërkesa e pavlefshme.' }, { status: 400 });
  }
  if (!password || password.length > 200) {
    return NextResponse.json({ error: 'Fjalëkalimi mungon.' }, { status: 400 });
  }

  // 1) Fjalëkalimi i menaxhuar nga admini teknik në /admin (global "studio-settings")
  let storedHash: string | null = null;
  try {
    const payload = await getPayloadClient();
    const global = (await payload.findGlobal({
      slug: 'studio-settings',
      overrideAccess: true,
      depth: 0,
    })) as unknown as { password?: string | null };
    storedHash = global?.password?.startsWith('scrypt$') ? global.password : null;
  } catch {
    storedHash = null;
  }

  let ok = false;
  if (storedHash) {
    ok = verifyStudioPasswordHash(password, storedHash);
  } else {
    // 2) Radhëzimi (bootstrap): STUDIO_PASSWORD nga .env, vetëm nëse nuk është
    //    caktuar ende fjalëkalim në Panelin e Payload.
    const envPassword = process.env.STUDIO_PASSWORD?.trim();
    ok = Boolean(envPassword && password === envPassword);
  }

  if (!ok) {
    return NextResponse.json({ error: 'Fjalëkalimi i pasaktë.' }, { status: 401 });
  }

  const token = createSessionToken();
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': sessionCookieHeader(token, Math.floor(SESSION_TTL_MS / 1000)),
      },
    }
  );
}
