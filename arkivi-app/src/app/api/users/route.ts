import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/src/lib/payloadClient';

export async function GET() {
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
