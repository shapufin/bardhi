import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bumpSessionEpoch, createSessionToken, verifySessionToken } from '../src/lib/studioAuth';

test('F-11: bumping the session epoch revokes older sessions but not newer ones', () => {
  const t0 = Date.now();
  const old = createSessionToken(t0);
  assert.equal(verifySessionToken(old, t0 + 1), true);

  bumpSessionEpoch(t0 + 1000);
  assert.equal(verifySessionToken(old, t0 + 2000), false, 'pre-epoch session must be revoked');

  const fresh = createSessionToken(t0 + 2000);
  assert.equal(verifySessionToken(fresh, t0 + 3000), true, 'post-epoch session stays valid');
});
