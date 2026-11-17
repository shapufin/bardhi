import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, serialized } from '@/src/lib/payloadClient';
import { mergeText } from '@/src/lib/sanitize';
import { verifyAdminAuthAsync } from '@/src/lib/adminAuth';
import type { HeroSettings } from '@/src/types/cms';

const ANIMATION_STYLES = new Set(['gentle-drift', 'soft-fade', 'none']);

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function putHandler(req: Request) {
  const auth = await verifyAdminAuthAsync(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Ruajtja e seksionit kryesor kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const p = raw as Partial<HeroSettings>;
    const hero: HeroSettings = {
      ...current.hero,
      kicker: mergeText(p.kicker, 200, current.hero.kicker, true),
      headline: mergeText(p.headline, 500, current.hero.headline),
      subheadline: mergeText(p.subheadline, 2000, current.hero.subheadline, true),
      featuredStoryId: mergeText(p.featuredStoryId, 100, current.hero.featuredStoryId),
      heroImageId: mergeText(p.heroImageId, 100, current.hero.heroImageId, true),
      primaryCtaLabel: mergeText(p.primaryCtaLabel, 100, current.hero.primaryCtaLabel),
      secondaryCtaLabel: mergeText(p.secondaryCtaLabel, 100, current.hero.secondaryCtaLabel, true),
      animationEnabled: typeof p.animationEnabled === 'boolean' ? p.animationEnabled : current.hero.animationEnabled,
      animationStyle:
        typeof p.animationStyle === 'string' && ANIMATION_STYLES.has(p.animationStyle)
          ? p.animationStyle
          : current.hero.animationStyle,
    };

    const updated = await saveCmsState({ ...current, hero });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së kryefaqes:', error);
    return NextResponse.json({ error: 'Nuk u ruajt seksioni kryesor.' }, { status: 500 });
  }
}

export const PUT = serialized(putHandler);
