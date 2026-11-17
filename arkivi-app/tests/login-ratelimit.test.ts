import './test-env';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/app/api/studio/login/route';
import { getClientKey, loginRateLimited, resetLoginRateLimit, MAX_GLOBAL, MAX_PER_CLIENT } from '../src/lib/loginRateLimit';

beforeEach(() => resetLoginRateLimit());

const attempt = (headers: Record<string, string>) =>
  POST(new Request('http://localhost/api/studio/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ password: 'definitely-wrong-password' }),
  }));

test('F-07: rotating a forged X-Forwarded-For first hop does not evade the limit', async () => {
  const statuses: number[] = [];
  for (let i = 0; i < MAX_PER_CLIENT + 2; i++) {
    statuses.push((await attempt({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': `10.0.0.${i}` })).status);
  }
  assert.equal(statuses[0], 401);
  assert.equal(statuses[MAX_PER_CLIENT], 429);
});

test('F-07: without cf header, the trusted LAST forwarded hop is the key, not the forged first', () => {
  const req = (xff: string) => new Request('http://x', { headers: { 'x-forwarded-for': xff } });
  assert.equal(getClientKey(req('1.1.1.1, 2.2.2.2, 198.51.100.4')), '198.51.100.4');
  assert.equal(getClientKey(req('9.9.9.9, 198.51.100.4')), '198.51.100.4');
});

test('F-07: global cap blocks many distinct clients', () => {
  let blocked = false;
  for (let i = 0; i < MAX_GLOBAL + 1; i++) blocked = loginRateLimited(`client-${i}`);
  assert.equal(blocked, true);
});
