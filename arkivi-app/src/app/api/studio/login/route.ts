import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/src/lib/payloadClient';
import {
  createSessionToken,
  sessionCookieHeader,
  verifyStudioPasswordHash,
  verifyUserPasswordHash,
  SESSION_TTL_MS,
  STUDIO_COOKIE,
} from '@/src/lib/studioAuth';

import { getClientKey, loginRateLimited } from '@/src/lib/loginRateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (loginRateLimited(getClientKey(req))) {
    return NextResponse.json(
      { error: 'Shumë tentime. Provo sërish pas 10 minutash.' },
      { status: 429 }
    );
  }

  let password = '';
  let identifier = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
    identifier =
      typeof body?.identifier === 'string'
        ? body.identifier.trim()
        : typeof body?.email === 'string'
          ? body.email.trim()
          : '';
  } catch {
    return NextResponse.json({ error: 'Kërkesa e pavlefshme.' }, { status: 400 });
  }
  if (!password || password.length > 200) {
    return NextResponse.json({ error: 'Fjalëkalimi mungon.' }, { status: 400 });
  }

  const payload = await getPayloadClient();
  let ok = false;
  let matchedUser: { id: string | number; email?: string; role?: string; name?: string } | null = null;

  // 1) Nëse është dhënë email ose emri i autorit në hyrje
  if (identifier) {
    try {
      const userRes = await payload.find({
        collection: 'users',
        where: {
          or: [
            { email: { equals: identifier.toLowerCase() } },
            { name: { equals: identifier } },
          ],
        },
        showHiddenFields: true,
        limit: 1,
      });
      const user = userRes.docs[0] as any;
      if (user && verifyUserPasswordHash(password, user.hash, user.salt)) {
        ok = true;
        matchedUser = { id: user.id, email: user.email, role: user.role, name: user.name };
      }
    } catch {
      // vazhdo me verifikimet e tjera
    }
  }

  // 2) Fjalëkalimi i menaxhuar nga admini teknik në /admin (global "studio-settings")
  let storedHash: string | null = null;
  if (!ok) {
    try {
      const global = (await payload.findGlobal({
        slug: 'studio-settings',
        overrideAccess: true,
        depth: 0,
      })) as unknown as { password?: string | null };
      storedHash = global?.password?.startsWith('scrypt$') ? global.password : null;
      if (storedHash && verifyStudioPasswordHash(password, storedHash)) {
        ok = true;
      }
    } catch {
      // injoro
    }
  }

  // 3) Kontroll i përdoruesve në koleksionin 'users' (nëse nuk u dha email/identifikues)
  if (!ok) {
    try {
      const usersRes = await payload.find({
        collection: 'users',
        showHiddenFields: true,
        limit: 50,
      });
      for (const u of usersRes.docs as any[]) {
        if (verifyUserPasswordHash(password, u.hash, u.salt)) {
          ok = true;
          matchedUser = { id: u.id, email: u.email, role: u.role, name: u.name };
          break;
        }
      }
    } catch {
      // injoro
    }
  }

  // 4) Radhëzimi (bootstrap): STUDIO_PASSWORD nga .env, VETËM nëse nuk është caktuar
  // fjalëkalim në studio-settings te Payload Admin UI (global password takes precedence).
  if (!ok && !storedHash) {
    const envPassword = process.env.STUDIO_PASSWORD?.trim();
    if (envPassword && password === envPassword) {
      ok = true;
    }
  }

  if (!ok) {
    return NextResponse.json({ error: 'Fjalëkalimi i pasaktë.' }, { status: 401 });
  }

  // Nëse u gjet përdorues në Payload, marrim edhe payload-token për sinkronizim me /admin
  let payloadToken: string | undefined;
  if (matchedUser?.email) {
    try {
      const loginRes = await payload.login({
        collection: 'users',
        data: { email: matchedUser.email, password },
      });
      if (loginRes?.token) {
        payloadToken = loginRes.token;
      }
    } catch {
      // injoro
    }
  }

  const token = createSessionToken();
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  const isSecure = process.env.NODE_ENV === 'production';

  const res = NextResponse.json({
    ok: true,
    user: matchedUser,
  });

  res.cookies.set(STUDIO_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: maxAgeSec,
    secure: isSecure,
  });

  if (payloadToken) {
    res.cookies.set('payload-token', payloadToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: maxAgeSec,
      secure: isSecure,
    });
  }

  return res;
}
