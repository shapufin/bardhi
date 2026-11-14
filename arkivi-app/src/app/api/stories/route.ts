import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { Story } from '@/src/types/cms';

export async function POST(req: Request) {
  try {
    const current = await getCmsState();
    const incoming = (await req.json()) as Story;
    const existingIndex = current.stories.findIndex((s) => s.id === incoming.id);
    let nextStories = [...current.stories];
    if (existingIndex >= 0) {
      nextStories[existingIndex] = incoming;
    } else {
      nextStories = [incoming, ...nextStories];
    }

    if (incoming.featured) {
      nextStories = nextStories.map((s) => ({
        ...s,
        featured: s.id === incoming.id,
      }));
    }

    const updated = await saveCmsState({
      ...current,
      stories: nextStories,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate ruajtjes se rrefimit:', error);
    return NextResponse.json({ error: 'Nuk u ruajt rrefimi.' }, { status: 500 });
  }
}
