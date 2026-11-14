import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { BookSpread } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const current = await getCmsState();
    const body = (await req.json()) as {
      bookTitle?: string;
      bookSubtitle?: string;
      bookCoverImageId?: string;
      bookSpreads?: BookSpread[];
    };

    const normalizedSpreads = Array.isArray(body.bookSpreads)
      ? body.bookSpreads.map((spread, index) => ({
          ...spread,
          leftPageNumber: index * 2 + 1,
          rightPageNumber: index * 2 + 2,
        }))
      : current.bookSpreads;

    const updated = await saveCmsState({
      ...current,
      bookTitle: body.bookTitle ?? current.bookTitle,
      bookSubtitle: body.bookSubtitle ?? current.bookSubtitle,
      bookCoverImageId: body.bookCoverImageId ?? current.bookCoverImageId,
      bookSpreads: normalizedSpreads,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate ruajtjes se librit:', error);
    return NextResponse.json({ error: 'Nuk u ruajten faqet e librit.' }, { status: 500 });
  }
}
