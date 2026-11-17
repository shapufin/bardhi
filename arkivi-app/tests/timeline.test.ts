import './with-auth';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTimeline, moveEntry, newTimelineEntry, removeEntry } from '../src/lib/timeline';
import { getCmsState, saveCmsState } from '../src/lib/payloadClient';
import { PUT } from '../src/app/api/timeline/route';

test('F-15: timeline helpers add, reorder, remove and drop untitled rows', () => {
  const a = { ...newTimelineEntry(1), title: 'A', year: '1990' };
  const b = { ...newTimelineEntry(2), title: 'B', year: '2000' };
  const blank = newTimelineEntry(3);
  assert.notEqual(newTimelineEntry(1).id, newTimelineEntry(1).id, 'ids are unique even in the same ms');
  assert.deepEqual(moveEntry([a, b], 1, -1).map((e) => e.title), ['B', 'A']);
  assert.deepEqual(moveEntry([a, b], 0, -1).map((e) => e.title), ['A', 'B'], 'out-of-range move is a no-op');
  assert.deepEqual(removeEntry([a, b], 0).map((e) => e.title), ['B']);
  assert.deepEqual(cleanTimeline([a, blank, b]).map((e) => e.title), ['A', 'B']);
});

test('F-15: PUT /api/timeline persists the edited order (what the Studio tab sends)', async () => {
  const original = await getCmsState();
  try {
    const edited = moveEntry(original.timeline, 0, 1);
    const res = await PUT(new Request('http://localhost', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ timeline: edited }),
    }));
    assert.equal(res.status, 200);
    assert.deepEqual((await getCmsState()).timeline.map((e) => e.id), edited.map((e) => e.id));
  } finally {
    await saveCmsState(original);
  }
});
