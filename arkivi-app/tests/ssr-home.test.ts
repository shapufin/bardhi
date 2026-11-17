import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCmsState, saveCmsState } from '../src/lib/payloadClient';
import Page, { generateMetadata } from '../src/app/(frontend)/page';

test('F-19: home page HTML already contains the content (no client fetch) and no drafts', async () => {
  const original = await getCmsState();
  const draftTitle = `DRAFT-SSR-${Date.now()}`;
  try {
    await saveCmsState({
      ...original,
      stories: [{ ...original.stories[0], id: `ssr-${Date.now()}`, title: draftTitle, status: 'draft', featured: false }, ...original.stories],
    });

    const html = renderToStaticMarkup(await Page());
    assert.ok(html.includes(original.hero.headline), 'hero headline must be in the server-rendered HTML');
    assert.ok(!html.includes('Po hapet Arkivi Përkujtimor'), 'must not render the client loading screen');
    assert.ok(!html.includes(draftTitle), 'draft titles must never be in public HTML');

    const meta = await generateMetadata();
    assert.ok(String(meta.title).includes(original.site.siteTitle));
  } finally {
    await saveCmsState(original);
  }
});
