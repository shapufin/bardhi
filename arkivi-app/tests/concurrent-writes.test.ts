import './with-auth';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCmsState, saveCmsState } from '../src/lib/payloadClient';
import { POST } from '../src/app/api/stories/route';

test('F-13: concurrent story saves are all kept (no lost updates)', async () => {
  const original = await getCmsState();
  const ids = Array.from({ length: 8 }, (_, i) => `concurrent-${Date.now()}-${i}`);
  try {
    const res = await Promise.all(
      ids.map((id) =>
        POST(new Request('http://localhost/api/stories', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, title: `Rrëfim ${id}`, status: 'draft', bodyParagraphs: ['x'] }),
        }))
      )
    );
    assert.ok(res.every((r) => r.status === 200));
    const after = await getCmsState();
    for (const id of ids) assert.ok(after.stories.some((s) => s.id === id), `story ${id} was lost`);
  } finally {
    await saveCmsState(original);
  }
});
