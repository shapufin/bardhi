import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, serialized } from '@/src/lib/payloadClient';
import { mergeText } from '@/src/lib/sanitize';
import { verifyAdminAuthAsync } from '@/src/lib/adminAuth';
import type { NavTargetType, SiteConfig } from '@/src/types/cms';

const NAV_TARGETS = new Set<NavTargetType>(['home', 'stories', 'book', 'gallery', 'timeline']);
const MAX_NAV_ITEMS = 20;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function putHandler(req: Request) {
  const auth = await verifyAdminAuthAsync(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Ruajtja e identitetit të faqes kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const p = raw as Partial<SiteConfig>;

    const navMenu = Array.isArray(p.navMenu)
      ? p.navMenu.slice(0, MAX_NAV_ITEMS).map((item, index) => {
          const it = (item && typeof item === 'object' ? item : {}) as SiteConfig['navMenu'][number];
          return {
            id: clip(it.id, 100) || `nav-${index}`,
            target: NAV_TARGETS.has(it.target) ? it.target : ('home' as NavTargetType),
            label: clip(it.label, 100),
            enabled: it.enabled !== false,
          };
        })
      : current.site.navMenu;

    const site: SiteConfig = {
      ...current.site,
      siteTitle: mergeText(p.siteTitle, 300, current.site.siteTitle),
      honoreeName: mergeText(p.honoreeName, 300, current.site.honoreeName),
      yearsLabel: mergeText(p.yearsLabel, 100, current.site.yearsLabel, true),
      authorName: mergeText(p.authorName, 300, current.site.authorName),
      authorRelation: mergeText(p.authorRelation, 300, current.site.authorRelation, true),
      dedicationLine: mergeText(p.dedicationLine, 1000, current.site.dedicationLine, true),
      footerNote: mergeText(p.footerNote, 1000, current.site.footerNote, true),
      navMenu,
    };

    const updated = await saveCmsState({ ...current, site });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së identitetit:', error);
    return NextResponse.json({ error: 'Nuk u ruajtën të dhënat e faqes.' }, { status: 500 });
  }
}

export const PUT = serialized(putHandler);
