import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { SiteConfig } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const current = await getCmsState();
    const sitePatch = (await req.json()) as Partial<SiteConfig>;
    const updated = await saveCmsState({
      ...current,
      site: {
        ...current.site,
        ...sitePatch,
        navMenu: Array.isArray(sitePatch.navMenu) ? sitePatch.navMenu : current.site.navMenu,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate ruajtjes se identitetit:', error);
    return NextResponse.json({ error: 'Nuk u ruajten te dhenat e faqes.' }, { status: 500 });
  }
}
