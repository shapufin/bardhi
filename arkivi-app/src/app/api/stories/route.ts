import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import { verifyAdminAuth } from '@/src/lib/adminAuth';
import type { Story } from '@/src/types/cms';

const MAX_JSON_BYTES = 512 * 1024;
const LIMITS = {
  id: 100,
  title: 300,
  subtitle: 1000,
  eraLabel: 100,
  publishedDate: 100,
  coverImageId: 100,
  pullQuote: 2000,
  galleryImageIds: 200,
  bodyParagraphs: 500,
  paragraphChars: 20000,
} as const;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(req: Request) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Ruajtja e rrëfimeve kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_JSON_BYTES) {
      return NextResponse.json({ error: 'Kërkesa tejkalon madhësinë e lejuar.' }, { status: 413 });
    }

    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhënat e dërguara janë të pavlefshme.' }, { status: 400 });
    }

    const incoming = raw as Partial<Story>;
    const title = clip(incoming.title, LIMITS.title);
    if (!title) {
      return NextResponse.json({ error: 'Titulli i rrëfimit është i detyrueshëm.' }, { status: 400 });
    }

    const current = await getCmsState();
    const sanitizedId = clip(incoming.id, LIMITS.id) || `story-${Date.now()}`;
    const sanitizedStory: Story = {
      id: sanitizedId,
      title,
      subtitle: clip(incoming.subtitle, LIMITS.subtitle),
      eraLabel: clip(incoming.eraLabel, LIMITS.eraLabel) || 'Kujtime',
      publishedDate: clip(incoming.publishedDate, LIMITS.publishedDate) || 'Nëntor 2024',
      readingMinutes: typeof incoming.readingMinutes === 'number' && incoming.readingMinutes > 0 ? Math.min(incoming.readingMinutes, 10000) : 4,
      coverImageId: clip(incoming.coverImageId, LIMITS.coverImageId),
      galleryImageIds: Array.isArray(incoming.galleryImageIds)
        ? incoming.galleryImageIds.filter((id): id is string => typeof id === 'string').slice(0, LIMITS.galleryImageIds).map((id) => id.slice(0, LIMITS.coverImageId))
        : [],
      bodyParagraphs: Array.isArray(incoming.bodyParagraphs)
        ? incoming.bodyParagraphs.map((p) => String(p).trim().slice(0, LIMITS.paragraphChars)).filter(Boolean).slice(0, LIMITS.bodyParagraphs)
        : [],
      pullQuote: clip(incoming.pullQuote, LIMITS.pullQuote),
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
