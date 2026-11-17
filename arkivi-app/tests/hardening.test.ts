import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createSessionToken, verifySessionToken, SESSION_TTL_MS } from '../src/lib/studioAuth';

test('F-21: session cookies are not signed with the raw PAYLOAD_SECRET (usable as an API token)', () => {
  const now = Date.now();
  const exp = String(now + SESSION_TTL_MS);
  const forged = `${exp}.${createHmac('sha256', process.env.PAYLOAD_SECRET as string).update(exp).digest('hex')}`;
  assert.equal(verifySessionToken(forged, now), false, 'a cookie signed with the raw secret must be rejected');
  assert.equal(verifySessionToken(createSessionToken(now), now), true, 'normal sessions still verify');
});

test('F-21: next.config allows no remote image hosts (no open image proxy)', () => {
  const cfg = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'next.config.mjs'), 'utf-8');
  assert.match(cfg, /remotePatterns:\s*\[\s*\]/);
  assert.ok(!cfg.includes("hostname: '**'"));
});
