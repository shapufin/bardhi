import { NextResponse } from 'next/server';
import { saveCmsState } from '@/src/lib/payloadClient';
import { DEFAULT_CMS_STATE } from '@/src/lib/defaultData';

function verifyResetAuth(req: Request): { authorized: boolean; status: number } {
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  const payloadSecret = (process.env.PAYLOAD_SECRET || 'sekret-arkivi-dritan-berisha-2026-autorit').trim();
  const validSecrets = [adminSecret, payloadSecret].filter((s): s is string => Boolean(s && s.length > 0));

  if (validSecrets.length === 0) {
    return { authorized: false, status: 403 };
  }

  const authHeader = req.headers.get('authorization');
  const adminToken = req.headers.get('x-admin-token');
  const confirmHeader = req.headers.get('x-confirm-reset');

  let token: string | undefined = adminToken?.trim();
  if (!token && authHeader) {
    const trimmedAuth = authHeader.trim();
    if (trimmedAuth.toLowerCase().startsWith('bearer')) {
      token = trimmedAuth.slice(6).trim();
    } else {
      token = trimmedAuth;
    }
  }

  if (!token || token.trim().length === 0) {
    return { authorized: false, status: 401 };
  }

  if (!validSecrets.includes(token)) {
    return { authorized: false, status: 403 };
  }

  // In production, require strict confirmation header or explicit admin confirmation token
  if (process.env.NODE_ENV === 'production') {
    const isConfirmed =
      Boolean(adminToken?.trim()) ||
      confirmHeader === 'true' ||
      confirmHeader === 'confirm' ||
      (confirmHeader && validSecrets.includes(confirmHeader.trim()));

    if (!isConfirmed) {
      return { authorized: false, status: 403 };
    }
  }

  return { authorized: true, status: 200 };
}

export async function POST(req: Request) {
  const auth = verifyResetAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Rivendosja e bazës së të dhënave kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const updated = await saveCmsState(DEFAULT_CMS_STATE);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate rivendosjes:', error);
    return NextResponse.json({ error: 'Nuk u rivendos arkivi.' }, { status: 500 });
  }
}
