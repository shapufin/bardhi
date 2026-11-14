import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { HeroSettings } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const current = await getCmsState();
    const heroPatch = (await req.json()) as Partial<HeroSettings>;
    const updated = await saveCmsState({
      ...current,
      hero: { ...current.hero, ...heroPatch },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate ruajtjes se ballines:', error);
    return NextResponse.json({ error: 'Nuk u ruajt seksioni kryesor.' }, { status: 500 });
  }
}
