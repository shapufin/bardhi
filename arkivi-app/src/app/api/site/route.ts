import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { SiteConfig } from '@/src/types/cms';

export async function PUT(req: Request) {
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const sitePatch = raw as Partial<SiteConfig>;

    const updated = await saveCmsState({
      ...current,
      site: {
        ...current.site,
        ...sitePatch,
        siteTitle: sitePatch.siteTitle?.trim() || current.site.siteTitle,
        honoreeName: sitePatch.honoreeName?.trim() || current.site.honoreeName,
        navMenu: Array.isArray(sitePatch.navMenu) ? sitePatch.navMenu : current.site.navMenu,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së identitetit:', error);
    return NextResponse.json({ error: 'Nuk u ruajtën të dhënat e faqes.' }, { status: 500 });
  }
}
