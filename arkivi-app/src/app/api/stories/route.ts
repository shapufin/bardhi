import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { Story } from '@/src/types/cms';

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhënat e dërguara janë të pavlefshme.' }, { status: 400 });
    }

    const incoming = raw as Partial<Story>;
    if (!incoming.title || typeof incoming.title !== 'string' || !incoming.title.trim()) {
      return NextResponse.json({ error: 'Titulli i rrëfimit është i detyrueshëm.' }, { status: 400 });
    }

    const current = await getCmsState();
    const sanitizedId = incoming.id?.trim() || `story-${Date.now()}`;
    const sanitizedStory: Story = {
      id: sanitizedId,
      title: incoming.title.trim(),
      subtitle: incoming.subtitle?.trim() || '',
      eraLabel: incoming.eraLabel?.trim() || 'Kujtime',
      publishedDate: incoming.publishedDate?.trim() || 'Nëntor 2024',
      readingMinutes: typeof incoming.readingMinutes === 'number' && incoming.readingMinutes > 0 ? incoming.readingMinutes : 4,
      coverImageId: incoming.coverImageId?.trim() || '',
      galleryImageIds: Array.isArray(incoming.galleryImageIds) ? incoming.galleryImageIds.filter((id): id is string => typeof id === 'string') : [],
      bodyParagraphs: Array.isArray(incoming.bodyParagraphs) ? incoming.bodyParagraphs.map((p) => String(p).trim()).filter(Boolean) : [],
      pullQuote: incoming.pullQuote?.trim() || '',
      status: incoming.status === 'draft' ? 'draft' : 'published',
      featured: Boolean(incoming.featured),
    };

    const existingIndex = current.stories.findIndex((s) => s.id === sanitizedId);
    let nextStories = [...current.stories];
    if (existingIndex >= 0) {
      nextStories[existingIndex] = sanitizedStory;
    } else {
      nextStories = [sanitizedStory, ...nextStories];
    }

    if (sanitizedStory.featured) {
      nextStories = nextStories.map((s) => ({
        ...s,
        featured: s.id === sanitizedId,
      }));
    }

    const updated = await saveCmsState({
      ...current,
      stories: nextStories,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së rrëfimit:', error);
    return NextResponse.json({ error: 'Nuk u ruajt rrëfimi.' }, { status: 500 });
  }
}
