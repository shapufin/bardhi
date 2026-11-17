import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Users } from '../src/collections/Users';
import { StudioSettings } from '../src/globals/StudioSettings';
import { POST } from '../src/app/api/users/route';
import { createSessionToken, STUDIO_COOKIE } from '../src/lib/studioAuth';
import { ADMIN_TOKEN } from './test-env';

type Fn = (a: { req: { user?: unknown } }) => unknown;
const author = { id: 7, role: 'author' };
const superuser = { id: 1, role: 'superuser' };

test('F-04: only superusers can create/delete users; authors can read/update only themselves', async () => {
  const a = Users.access as Record<string, Fn>;
  for (const op of ['create', 'delete']) {
    assert.equal(await a[op]({ req: {} }), false);
    assert.equal(await a[op]({ req: { user: author } }), false);
    assert.equal(await a[op]({ req: { user: superuser } }), true);
  }
  for (const op of ['read', 'update']) {
    assert.equal(await a[op]({ req: {} }), false);
    assert.equal(await a[op]({ req: { user: superuser } }), true);
    assert.deepEqual(await a[op]({ req: { user: author } }), { id: { equals: 7 } });
  }
});

test('F-04: studio-settings (Studio password) is superuser-only', async () => {
  const a = StudioSettings.access as Record<string, Fn>;
  for (const op of ['read', 'update']) {
    assert.equal(await a[op]({ req: { user: author } }), false);
    assert.equal(await a[op]({ req: {} }), false);
    assert.equal(await a[op]({ req: { user: superuser } }), true);
  }
});

test('F-04: studio cookie cannot create superusers; admin token can', async () => {
  const mk = (headers: Record<string, string>, role: string, tag: string) =>
    POST(new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ email: `${tag}-${Date.now()}@example.test`, password: 'longenough1', name: tag, role }),
    }));
  const cookie = { cookie: `${STUDIO_COOKIE}=${encodeURIComponent(createSessionToken())}` };

  assert.equal((await mk(cookie, 'superuser', 'esc')).status, 403);
  assert.equal((await mk(cookie, 'author', 'auth')).status, 200);
  assert.equal((await mk({ 'x-admin-token': ADMIN_TOKEN }, 'superuser', 'adm')).status, 200);
});
