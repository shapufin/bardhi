import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCmsState, saveCmsState } from '../src/lib/payloadClient';
import { GET } from '../src/app/api/cms/route';
import { ADMIN_TOKEN } from './test-env';
import type { CmsState } from '../src/types/cms';

test('F-03: public GET /api/cms hides drafts; authenticated request still sees them', async () => {
  const original = await getCmsState();
  const draft = { ...original.stories[0], id: `draft-probe-${Date.now()}`, title: 'DRAFT PROBE', status: 'draft' as const, featured: false };
  try {
    await saveCmsState({ ...original, stories: [draft, ...original.stories] });

    const anon = (await (await GET(new Request('http://localhost/api/cms'))).json()) as CmsState;
    assert.ok(!anon.stories.some((s) => s.id === draft.id), 'anonymous must not receive drafts');
    assert.ok(anon.stories.every((s) => s.status === 'published'));

    const res = await GET(new Request('http://localhost/api/cms', { headers: { 'x-admin-token': ADMIN_TOKEN } }));
    const authed = (await res.json()) as CmsState;
    assert.ok(authed.stories.some((s) => s.id === draft.id), 'admin must receive drafts');
    assert.match(res.headers.get('cache-control') || '', /no-store|private/);
  } finally {
    await saveCmsState(original);
  }
});
