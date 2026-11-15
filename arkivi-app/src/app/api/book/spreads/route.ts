import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { BookSpread } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme për librin.' }, { status: 400 });
    }

    const current = await getCmsState();
    const body = raw as {
      bookTitle?: string;
      bookSubtitle?: string;
      bookCoverImageId?: string;
      bookSpreads?: BookSpread[];
    };

    const normalizedSpreads = Array.isArray(body.bookSpreads)
      ? body.bookSpreads.map((spread, index) => ({
        ...spread,
        id: spread.id || `spread-${index + 1}`,
        leftPageNumber: index * 2 + 1,
        rightPageNumber: index * 2 + 2,
        leftBlocks: Array.isArray(spread.leftBlocks) ? spread.leftBlocks : [],
        rightBlocks: Array.isArray(spread.rightBlocks) ? spread.rightBlocks : [],
      }))
      : current.bookSpreads;

    const updated = await saveCmsState({
      ...current,
      bookTitle: body.bookTitle?.trim() ?? current.bookTitle,
      bookSubtitle: body.bookSubtitle?.trim() ?? current.bookSubtitle,
      bookCoverImageId: body.bookCoverImageId?.trim() ?? current.bookCoverImageId,
      bookSpreads: normalizedSpreads,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së librit:', error);
    return NextResponse.json({ error: 'Nuk u ruajtën faqet e librit.' }, { status: 500 });
  }
}
