import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPayloadClient } from '../src/lib/payloadClient';
import { Users } from '../src/collections/Users';

test('F-02: users read access denies anonymous requests', async () => {
  const read = Users.access?.read as (a: { req: { user?: unknown } }) => unknown;
  assert.equal(await read({ req: {} }), false);
  assert.equal(await read({ req: { user: { id: 1, role: 'author' } } }), true);
});

test('F-02: anonymous payload.find/findByID on users is forbidden (REST path /api/users/:id)', async () => {
  const payload = await getPayloadClient();
  await assert.rejects(() => payload.find({ collection: 'users', overrideAccess: false }));
  await assert.rejects(() => payload.findByID({ collection: 'users', id: 1, overrideAccess: false }));
});
