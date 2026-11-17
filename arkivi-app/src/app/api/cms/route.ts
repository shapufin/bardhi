import { NextResponse } from 'next/server';
import { getCmsState } from '@/src/lib/payloadClient';
import { verifyAdminAuth } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const state = await getCmsState();
    // Drafts are private: only the Studio (session cookie / admin token) receives them.
    const body = verifyAdminAuth(req).authorized
      ? state
      : { ...state, stories: state.stories.filter((s) => s.status === 'published') };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Gabim gjate leximit te arkivit:', error);
    return NextResponse.json(
      { error: 'Nuk u arrit te ngarkohen te dhenat e arkivit.' },
      { status: 500 }
    );
  }
}
