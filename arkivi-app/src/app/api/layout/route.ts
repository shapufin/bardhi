import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { CmsState, PageSectionConfig } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const body = raw as {
      sections?: PageSectionConfig[];
      quoteBand?: CmsState['quoteBand'];
    };

    const updated = await saveCmsState({
      ...current,
      sections: Array.isArray(body.sections) ? body.sections : current.sections,
      quoteBand: body.quoteBand ? body.quoteBand : current.quoteBand,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së renditjes:', error);
    return NextResponse.json({ error: 'Nuk u ruajt renditja e faqes.' }, { status: 500 });
  }
}
