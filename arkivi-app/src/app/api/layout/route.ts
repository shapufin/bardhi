import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, serialized } from '@/src/lib/payloadClient';
import { verifyAdminAuth } from '@/src/lib/adminAuth';
import type { CmsState, PageSectionConfig, PageSectionType, StoriesLayoutVariant } from '@/src/types/cms';

const SECTION_TYPES = new Set<PageSectionType>([
  'hero',
  'featured-story',
  'stories-feed',
  'masonry-gallery',
  'book-spotlight',
  'quote-band',
  'timeline',
]);
const STORY_VARIANTS = new Set<StoriesLayoutVariant>(['editorial-grid', 'chronicle-list', 'masonry']);
const MAX_SECTIONS = 50;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function putHandler(req: Request) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Ruajtja e renditjes së faqes kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const body = raw as {
      sections?: unknown;
      quoteBand?: CmsState['quoteBand'];
    };

    const sections: PageSectionConfig[] = Array.isArray(body.sections)
      ? body.sections.slice(0, MAX_SECTIONS).map((section, index) => {
          const s = (section && typeof section === 'object' ? section : {}) as Partial<PageSectionConfig>;
          const type = SECTION_TYPES.has(s.type as PageSectionType) ? (s.type as PageSectionType) : 'hero';
          return {
            id: clip(s.id, 100) || `section-${index}`,
            type,
            label: clip(s.label, 200),
            heading: clip(s.heading, 500),
            subheading: clip(s.subheading, 1000),
            enabled: s.enabled !== false,
            storiesVariant:
              typeof s.storiesVariant === 'string' && STORY_VARIANTS.has(s.storiesVariant as StoriesLayoutVariant)
                ? (s.storiesVariant as StoriesLayoutVariant)
                : undefined,
          };
        })
      : current.sections;

    const quoteBand =
      body.quoteBand && typeof body.quoteBand === 'object'
        ? {
            quote: clip((body.quoteBand as { quote?: unknown }).quote, 2000),
            attribution: clip((body.quoteBand as { attribution?: unknown }).attribution, 300),
          }
        : current.quoteBand;

    const updated = await saveCmsState({
      ...current,
      sections,
      quoteBand,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së renditjes:', error);
    return NextResponse.json({ error: 'Nuk u ruajt renditja e faqes.' }, { status: 500 });
  }
}

export const PUT = serialized(putHandler);
