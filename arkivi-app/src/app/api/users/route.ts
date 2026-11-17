import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/src/lib/payloadClient';
import { extractBearerToken, verifyAdminAuthAsync } from '@/src/lib/adminAuth';
import { isSuperuser } from '@/src/lib/roles';

type UsersAuth = { authorized: boolean; status: number; canManageSuperusers: boolean };

/**
 * - Admin token header or Payload superuser session: full rights (may create superusers).
 * - Studio author cookie: may list users and create `author` accounts only
 *   (the cookie is not bound to a user, so it must never grant superuser creation).
 * - Any other logged-in Payload user (role author): denied.
 */
async function verifyUsersAuth(req: Request): Promise<UsersAuth> {
  const direct = await verifyAdminAuthAsync(req);
  if (direct.authorized) {
    return { authorized: true, status: 200, canManageSuperusers: direct.via !== 'studio-cookie' };
  }

  const token = extractBearerToken(req);

  try {
    const payload = await getPayloadClient();
    const authRes = await payload.auth({ headers: req.headers });
    if (authRes?.user) {
      return isSuperuser(authRes.user as { role?: string })
        ? { authorized: true, status: 200, canManageSuperusers: true }
        : { authorized: false, status: 403, canManageSuperusers: false };
    }
  } catch {
    // If payload auth throws, fall through
  }

  if ((!token || token.trim().length === 0) && !req.headers.get('cookie')) {
    return { authorized: false, status: 401, canManageSuperusers: false };
  }

  return { authorized: false, status: 403, canManageSuperusers: false };
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

    return NextResponse.json({
      ...result,
      docs: sanitizedUsers,
      users: sanitizedUsers,
    });
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
    const contentType = req.headers.get('content-type') || '';

    let email: string | undefined;
    let password: string | undefined;
    let confirmPassword: string | undefined;
    let name: string | undefined;
    let role: 'author' | 'superuser' | undefined;

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      const payloadField = formData.get('_payload');
      if (typeof payloadField === 'string') {
        try {
          const parsed = JSON.parse(payloadField);
          email = parsed.email;
          password = parsed.password;
          confirmPassword = parsed.confirmPassword;
          name = parsed.name;
          role = parsed.role;
        } catch {}
      }
      if (!email && formData.get('email')) email = String(formData.get('email'));
      if (!password && formData.get('password')) password = String(formData.get('password'));
      if (!confirmPassword && formData.get('confirmPassword')) confirmPassword = String(formData.get('confirmPassword'));
      if (!name && formData.get('name')) name = String(formData.get('name'));
      if (!role && formData.get('role')) role = formData.get('role') as any;
    } else {
      const body = await req.json();
      email = body?.email;
      password = body?.password;
      confirmPassword = body?.confirmPassword;
      name = body?.name;
      role = body?.role;
    }

    if (confirmPassword && password && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Fjalëkalimet nuk përputhen.' },
        { status: 400 }
      );
    }

    if (role !== undefined && role !== 'author' && role !== 'superuser') {
      return NextResponse.json(
        { error: 'Roli i vendosur nuk është i vlefshëm.' },
        { status: 400 }
      );
    }

    if (role === 'superuser' && !auth.canManageSuperusers) {
      return NextResponse.json(
        { error: 'Vetëm administratori teknik mund të krijojë administratorë.' },
        { status: 403 }
      );
    }

    if (!email || !email.includes('@') || email.length > 320) {
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
        name: (name?.trim() || 'Përdorues i Ri').slice(0, 200),
        role: role || 'author',
      },
      overrideAccess: true,
    });

    const sanitized = {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    return NextResponse.json({
      message: 'Përdoruesi u krijua me sukses.',
      doc: sanitized,
      user: sanitized,
    });
  } catch (error: any) {
    console.error('Gabim gjate krijimit te perdoruesit:', error);
    const msg = error?.message || '';
    const isDuplicate =
      msg.includes('already registered') ||
      msg.includes('UNIQUE constraint') ||
      error?.name === 'ValidationError';

    return NextResponse.json(
      {
        error: isDuplicate
          ? 'Nuk u arrit të krijohej përdoruesi. Kontrolloni nëse emaili ekziston tashmë.'
          : 'Gabim i brendshëm gjatë krijimit të përdoruesit.',
      },
      { status: isDuplicate ? 400 : 500 }
    );
  }
}
