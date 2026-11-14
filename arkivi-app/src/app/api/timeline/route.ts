import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { CmsState } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const current = await getCmsState();
    const body = (await req.json()) as { timeline: CmsState['timeline'] };
    const updated = await saveCmsState({
      ...current,
      timeline: Array.isArray(body.timeline) ? body.timeline : current.timeline,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate ruajtjes se kronologjise:', error);
    return NextResponse.json({ error: 'Nuk u ruajt kronologjia.' }, { status: 500 });
  }
}
