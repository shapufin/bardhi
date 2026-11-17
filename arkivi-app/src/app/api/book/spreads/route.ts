import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, serialized } from '@/src/lib/payloadClient';
import { verifyAdminAuth } from '@/src/lib/adminAuth';
import type { BookBlock, BookBlockType, BookSpread } from '@/src/types/cms';

const BLOCK_TYPES = new Set<BookBlockType>(['prose', 'photo', 'quote', 'handwritten-note']);
const MAX_SPREADS = 300;
const MAX_BLOCKS_PER_SIDE = 100;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function sanitizeBlock(block: unknown, index: number): BookBlock {
  const b = (block && typeof block === 'object' ? block : {}) as Partial<BookBlock>;
  return {
    id: clip(b.id, 100) || `block-${Date.now()}-${index}`,
    type: BLOCK_TYPES.has(b.type as BookBlockType) ? (b.type as BookBlockType) : 'prose',
    heading: clip(b.heading, 500) || undefined,
    content: clip(b.content, 50000),
    imageId: clip(b.imageId, 100) || undefined,
    caption: clip(b.caption, 1000) || undefined,
    dropCap: b.dropCap === true,
  };
}

async function putHandler(req: Request) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Ruajtja e librit kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Kërkesa tejkalon madhësinë e lejuar.' }, { status: 413 });
    }

    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme për librin.' }, { status: 400 });
    }

    const current = await getCmsState();
    const body = raw as {
      bookTitle?: string;
      bookSubtitle?: string;
      bookCoverImageId?: string;
      bookSpreads?: unknown;
    };

    const normalizedSpreads: BookSpread[] = Array.isArray(body.bookSpreads)
      ? body.bookSpreads.slice(0, MAX_SPREADS).map((spread, index) => {
          const s = (spread && typeof spread === 'object' ? spread : {}) as Partial<BookSpread>;
          const left = Array.isArray(s.leftBlocks) ? s.leftBlocks : [];
          const right = Array.isArray(s.rightBlocks) ? s.rightBlocks : [];
          return {
            id: clip(s.id, 100) || `spread-${index + 1}`,
            chapterLabel: clip(s.chapterLabel, 200),
            spreadTitle: clip(s.spreadTitle, 500),
            leftPageNumber: index * 2 + 1,
            rightPageNumber: index * 2 + 2,
            leftBlocks: left.slice(0, MAX_BLOCKS_PER_SIDE).map((b, i) => sanitizeBlock(b, i)),
            rightBlocks: right.slice(0, MAX_BLOCKS_PER_SIDE).map((b, i) => sanitizeBlock(b, i + left.length)),
          };
        })
      : current.bookSpreads;

    const updated = await saveCmsState({
      ...current,
      bookTitle: clip(body.bookTitle, 300) || current.bookTitle,
      bookSubtitle: clip(body.bookSubtitle, 1000) || current.bookSubtitle,
      bookCoverImageId: clip(body.bookCoverImageId, 100) || current.bookCoverImageId,
      bookSpreads: normalizedSpreads,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së librit:', error);
    return NextResponse.json({ error: 'Nuk u ruajtën faqet e librit.' }, { status: 500 });
  }
}

export const PUT = serialized(putHandler);
