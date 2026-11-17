import React from 'react';
import type { Metadata } from 'next';
import { getCmsState } from '@/src/lib/payloadClient';
import { PublicHome } from '@/src/components/frontend/PublicHome';
import type { CmsState } from '@/src/types/cms';

export const dynamic = 'force-dynamic';

/** Public view of the state: drafts never leave the server for anonymous visitors. */
async function loadPublicState(): Promise<CmsState> {
  const state = await getCmsState();
  return { ...state, stories: state.stories.filter((s) => s.status === 'published') };
}

export async function generateMetadata(): Promise<Metadata> {
  const state = await getCmsState();
  return {
    title: `${state.site.siteTitle} · Arkivi & Libri Përkujtimor`,
    description: state.hero.subheadline || state.site.dedicationLine || undefined,
    icons: { icon: '/favicon.ico' },
  };
}

export default async function Page() {
  return <PublicHome initialCms={await loadPublicState()} />;
}
