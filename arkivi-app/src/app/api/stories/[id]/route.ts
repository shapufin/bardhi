import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const current = await getCmsState();
    const nextStories = current.stories.filter((s) => s.id !== id);
    const nextHero =
      current.hero.featuredStoryId === id
        ? {
            ...current.hero,
            featuredStoryId: nextStories[0]?.id ?? '',
          }
        : current.hero;

    const updated = await saveCmsState({
      ...current,
      stories: nextStories,
      hero: nextHero,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate fshirjes se rrefimit:', error);
    return NextResponse.json({ error: 'Nuk u fshi rrefimi.' }, { status: 500 });
  }
}
