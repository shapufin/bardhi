import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPayloadClient } from '../src/lib/payloadClient';
import { POST } from '../src/app/api/stories/route';

async function tokenFor(role: 'superuser' | 'author') {
  const payload = await getPayloadClient();
  const email = `${role}-${Date.now()}@example.test`;
  await payload.create({ collection: 'users', data: { email, password: 'longenough-pass1', name: role, role }, overrideAccess: true });
  const res = await payload.login({ collection: 'users', data: { email, password: 'longenough-pass1' } });
  return res.token as string;
}

const save = (cookie?: string) =>
  POST(new Request('http://localhost/api/stories', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ id: `admin-session-${Date.now()}`, title: 'Probe', status: 'draft' }),
  }));

test('F-12: superuser logged in only via /admin (payload-token cookie) can save; author-only and anonymous cannot', async () => {
  const su = await tokenFor('superuser');
  const au = await tokenFor('author');
  assert.equal((await save(`payload-token=${su}`)).status, 200);
  assert.ok([401, 403].includes((await save(`payload-token=${au}`)).status), 'author payload session alone must not authorize writes');
  assert.equal((await save()).status, 401);
  assert.ok([401, 403].includes((await save('payload-token=garbage')).status));
});
