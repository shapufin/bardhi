import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/src/lib/payloadClient';

async function verifyUsersAuth(req: Request): Promise<{ authorized: boolean; status: number }> {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  const payloadSecret = (process.env.PAYLOAD_SECRET || 'sekret-arkivi-dritan-berisha-2026-autorit').trim();
  const validSecrets = [adminSecret, payloadSecret].filter((s): s is string => Boolean(s && s.length > 0));

  const authHeader = req.headers.get('authorization');
  const adminToken = req.headers.get('x-admin-token');

  let token: string | undefined = adminToken?.trim();
  if (!token && authHeader) {
    const trimmedAuth = authHeader.trim();
    if (trimmedAuth.toLowerCase().startsWith('bearer')) {
      token = trimmedAuth.slice(6).trim();
    } else {
      token = trimmedAuth;
    }
  }

  // 1. Direct Secret / Bearer Token Check
  if (token && token.trim().length > 0 && validSecrets.includes(token)) {
    return { authorized: true, status: 200 };
  }

  // 2. Authenticated Payload Session Check (via payload.auth if available)
  try {
    const payload = await getPayloadClient();
    const payloadWithAuth = payload as unknown as {
      auth?: (opts: { headers: Headers }) => Promise<{ user?: unknown }>;
    };
    if (typeof payloadWithAuth.auth === 'function') {
      const authRes = await payloadWithAuth.auth({ headers: req.headers });
      if (authRes?.user) {
        return { authorized: true, status: 200 };
      }
    }
  } catch {
    // If payload auth throws, fall through
  }

  // Return 401 if no credentials were provided (or token is empty) and no cookie, 403 if invalid
  if ((!token || token.trim().length === 0) && !req.headers.get('cookie')) {
    return { authorized: false, status: 401 };
  }

  return { authorized: false, status: 403 };
}

export async function GET(req: Request) {
  const auth = await verifyUsersAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Qasja te përdoruesit kërkon kredenciale administrative.' },
      { status: auth.status }
    );
  }

  try {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: 'users',
      limit: 50,
      overrideAccess: true,
    });

    const sanitizedUsers = result.docs.map((u) => ({
      id: u.id,
      name: u.name || 'Përdorues',
      email: u.email,
      role: u.role || 'author',
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Gabim gjate marrjes se perdoruesve:', error);
    return NextResponse.json(
      { error: 'Nuk u ngarkuan përdoruesit e sistemit.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await verifyUsersAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Qasja te përdoruesit kërkon kredenciale administrative.' },
      { status: auth.status }
    );
  }

  try {
    const payload = await getPayloadClient();
    const body = await req.json();
    const { email, password, name, role } = body as {
      email?: string;
      password?: string;
      name?: string;
      role?: 'author' | 'superuser';
    };

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Ju lutemi vendosni një email të vlefshëm.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Fjalëkalimi duhet të ketë të paktën 8 karaktere.' },
        { status: 400 }
      );
    }

    const created = await payload.create({
      collection: 'users',
      data: {
        email: email.trim().toLowerCase(),
        password,
        name: name?.trim() || 'Përdorues i Ri',
        role: role || 'author',
      },
      overrideAccess: true,
    });

    return NextResponse.json({
      user: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
      },
    });
  } catch (error) {
    console.error('Gabim gjate krijimit te perdoruesit:', error);
    return NextResponse.json(
      { error: 'Nuk u arrit të krijohej përdoruesi. Kontrolloni nëse emaili ekziston tashmë.' },
      { status: 500 }
    );
  }
}
