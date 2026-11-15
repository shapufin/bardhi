import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { HeroSettings } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const heroPatch = raw as Partial<HeroSettings>;
    const updated = await saveCmsState({
      ...current,
      hero: {
        ...current.hero,
        ...heroPatch,
        headline: heroPatch.headline?.trim() || current.hero.headline,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së ballinës:', error);
    return NextResponse.json({ error: 'Nuk u ruajt seksioni kryesor.' }, { status: 500 });
  }
}
