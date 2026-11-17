import { NextResponse } from 'next/server';
import { saveCmsState, serialized } from '@/src/lib/payloadClient';
import { DEFAULT_CMS_STATE } from '@/src/lib/defaultData';
import { extractBearerToken, getAdminTokens } from '@/src/lib/adminAuth';

function verifyResetAuth(req: Request): { authorized: boolean; status: number } {
  const validSecrets = getAdminTokens();

  if (validSecrets.length === 0) {
    return { authorized: false, status: 403 };
  }

  const token = extractBearerToken(req);
  const adminToken = req.headers.get('x-admin-token');
  const confirmHeader = req.headers.get('x-confirm-reset');

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

async function postHandler(req: Request) {
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

export const POST = serialized(postHandler);
