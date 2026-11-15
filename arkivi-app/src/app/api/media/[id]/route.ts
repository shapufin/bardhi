import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, UPLOADS_DIR } from '@/src/lib/payloadClient';
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

/** Collect every media id referenced anywhere in CMS state. */
function collectMediaReferences(state: CmsState): Set<string> {
  const refs = new Set<string>();
  const add = (id?: string) => {
    if (typeof id === 'string' && id) refs.add(id);
  };

  add(state.hero?.heroImageId);
  add(state.bookCoverImageId);
  for (const story of state.stories ?? []) {
    add(story.coverImageId);
    for (const id of story.galleryImageIds ?? []) add(id);
  }
  for (const spread of state.bookSpreads ?? []) {
    for (const block of [...(spread.leftBlocks ?? []), ...(spread.rightBlocks ?? [])]) {
      add(block.imageId);
    }
  }
  return refs;
}

export async function PUT(
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

export async function DELETE(
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

    if (collectMediaReferences(current).has(id)) {
      return NextResponse.json(
        { error: 'Kjo fotografi përdoret diku në arkiv (rrëfim, hero, libër ose faqe libri). Hiqeni referencën para se ta fshini.' },
        { status: 409 }
      );
    }

    if (target.isUpload && target.url.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(target.url));
      await fs.unlink(filePath).catch(() => undefined);
    }
    const updated = await saveCmsState({
      ...current,
      media: current.media.filter((m) => m.id !== id),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate fshirjes se fotografise:', error);
    return NextResponse.json({ error: 'Nuk u fshi fotografia.' }, { status: 500 });
  }
}
