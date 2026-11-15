import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { CmsState } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const body = raw as { timeline: CmsState['timeline'] };
    const updated = await saveCmsState({
      ...current,
      timeline: Array.isArray(body.timeline) ? body.timeline : current.timeline,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së kronologjisë:', error);
    return NextResponse.json({ error: 'Nuk u ruajt kronologjia.' }, { status: 500 });
  }
}
