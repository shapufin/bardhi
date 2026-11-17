import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, UPLOADS_DIR, serialized } from '@/src/lib/payloadClient';
import { verifyAdminAuth } from '@/src/lib/adminAuth';
import type { CmsState, MediaAsset } from '@/src/types/cms';
import fs from 'node:fs/promises';
import path from 'node:path';

const PATCHABLE_FIELDS = ['title', 'caption', 'year', 'alt', 'aspectRatio'] as const;
const MAX_STRING = { title: 300, caption: 2000, year: 50, alt: 500 } as const;
const VALID_ASPECTS = new Set<MediaAsset['aspectRatio']>(['3:4', '4:3', '16:9', '1:1']);

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function putHandler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Përditësimi i fotografive kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    const current = await getCmsState();
    if (!current.media.some((m) => m.id === id)) {
      return NextResponse.json({ error: 'Fotografia nuk u gjet.' }, { status: 404 });
    }

    const patch = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const clean: Partial<MediaAsset> = {};
    for (const field of PATCHABLE_FIELDS) {
      const raw = patch[field];
      if (raw === undefined) continue;
      if (field === 'aspectRatio') {
        if (typeof raw === 'string' && VALID_ASPECTS.has(raw as MediaAsset['aspectRatio'])) {
          clean.aspectRatio = raw as MediaAsset['aspectRatio'];
        }
      } else {
        (clean as Record<string, string>)[field] = clip(raw, MAX_STRING[field]);
      }
    }

    const updated = await saveCmsState({
      ...current,
      media: current.media.map((m) => (m.id === id ? { ...m, ...clean } : m)),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate perditesimit te fotografise:', error);
    return NextResponse.json({ error: 'Nuk u perditesuan te dhenat e fotografise.' }, { status: 500 });
  }
}

async function deleteHandler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Fshirja e fotografive kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    const current = await getCmsState();
    const target = current.media.find((m) => m.id === id);
    if (!target) {
      return NextResponse.json({ error: 'Fotografia nuk u gjet.' }, { status: 404 });
    }

    // Shkëput automatikisht të gjitha referencat që kjo foto të mos mbetet e bllokuar (zero-lockout cascade)
    const cleanedStories = (current.stories ?? []).map((story) => ({
      ...story,
      coverImageId: story.coverImageId === id ? '' : story.coverImageId,
      galleryImageIds: (story.galleryImageIds ?? []).filter((gid) => gid !== id),
    }));

    const cleanedSpreads = (current.bookSpreads ?? []).map((spread) => ({
      ...spread,
      leftBlocks: (spread.leftBlocks ?? []).map((b) => (b.imageId === id ? { ...b, imageId: undefined } : b)),
      rightBlocks: (spread.rightBlocks ?? []).map((b) => (b.imageId === id ? { ...b, imageId: undefined } : b)),
    }));

    const cleanedHero = current.hero
      ? {
          ...current.hero,
          heroImageId: current.hero.heroImageId === id ? '' : current.hero.heroImageId,
        }
      : current.hero;

    const cleanedBookCover = current.bookCoverImageId === id ? '' : current.bookCoverImageId;

    // Fshi skedarin fizik nga disku nëse ndodhet në /uploads/
    if (target.url && target.url.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(target.url));
      await fs.unlink(filePath).catch(() => undefined);
    }

    const updated = await saveCmsState({
      ...current,
      hero: cleanedHero,
      bookCoverImageId: cleanedBookCover,
      stories: cleanedStories,
      bookSpreads: cleanedSpreads,
      media: current.media.filter((m) => m.id !== id),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate fshirjes se fotografise:', error);
    return NextResponse.json({ error: 'Nuk u fshi fotografia.' }, { status: 500 });
  }
}

export const PUT = serialized(putHandler);

export const DELETE = serialized(deleteHandler);
