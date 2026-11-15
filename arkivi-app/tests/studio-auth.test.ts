import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import './test-env';
import {
  hashStudioPassword,
  verifyStudioPasswordHash,
  createSessionToken,
  verifySessionToken,
  sessionCookieHeader,
  clearSessionCookieHeader,
  parseCookies,
  STUDIO_COOKIE,
  SESSION_TTL_MS,
} from '../src/lib/studioAuth';
import { verifyAdminAuth } from '../src/lib/adminAuth';

process.env.STUDIO_PASSWORD = process.env.STUDIO_PASSWORD || 'test-studio-pass-001';

function reqWithCookie(cookie: string, url = 'http://localhost/api/stories'): Request {
  return new Request(url, { method: 'POST', headers: { cookie } });
}

describe('Studio Auth — password hashing', () => {
  it('hashStudioPassword produces scrypt$ hash that verifies', () => {
    const hash = hashStudioPassword('fjalekalimi-123');
    assert.ok(hash.startsWith('scrypt$'));
    assert.ok(verifyStudioPasswordHash('fjalekalimi-123', hash));
    assert.ok(!verifyStudioPasswordHash('gabim', hash));
  });

  it('rejects plaintext and malformed stored values', () => {
    assert.ok(!verifyStudioPasswordHash('fjalekalimi-123', 'plain-text'));
    assert.ok(!verifyStudioPasswordHash('fjalekalimi-123', 'scrypt$bad'));
    assert.ok(!verifyStudioPasswordHash('fjalekalimi-123', ''));
  });
});

describe('Studio Auth — session tokens', () => {
  it('create/verify roundtrip works', () => {
    const token = createSessionToken();
    assert.ok(verifySessionToken(token));
  });

  it('rejects tampered, expired and malformed tokens', () => {
    const token = createSessionToken();
    assert.ok(!verifySessionToken(token.slice(0, -2) + 'xx'));
    assert.ok(!verifySessionToken('not-a-token'));
    assert.ok(!verifySessionToken(undefined));
    const expired = createSessionToken(Date.now() - SESSION_TTL_MS - 1000);
    assert.ok(!verifySessionToken(expired));
  });

  it('cookie helpers produce parseable values', () => {
    const token = createSessionToken();
    const header = sessionCookieHeader(token, 3600);
    assert.ok(header.includes(`${STUDIO_COOKIE}=`));
    assert.ok(header.includes('HttpOnly'));
    assert.ok(header.includes('SameSite=Lax'));
    const parsed = parseCookies(`${STUDIO_COOKIE}=${encodeURIComponent(token)}`);
    assert.equal(parsed[STUDIO_COOKIE], token);
    assert.ok(verifySessionToken(parsed[STUDIO_COOKIE]));
    assert.ok(clearSessionCookieHeader().includes('Max-Age=0'));
  });
});

describe('Studio Auth — verifyAdminAuth accepts session cookie', () => {
  it('valid session cookie authorizes mutations without token header', () => {
    const token = createSessionToken();
    const req = reqWithCookie(`${STUDIO_COOKIE}=${encodeURIComponent(token)}`);
    const auth = verifyAdminAuth(req);
    assert.equal(auth.authorized, true);
    assert.equal(auth.status, 200);
  });

  it('invalid cookie is still rejected', () => {
    const req = reqWithCookie(`${STUDIO_COOKIE}=forged-token`);
    const auth = verifyAdminAuth(req);
    assert.equal(auth.authorized, false);
  });

  it('admin token header still works alongside cookie support', async () => {
    const { ADMIN_TOKEN } = await import('./test-env');
    const req = new Request('http://localhost/api/stories', {
      method: 'POST',
      headers: { 'x-admin-token': ADMIN_TOKEN },
    });
    assert.equal(verifyAdminAuth(req).authorized, true);
  });
});

describe('Studio Auth — /api/studio/login route', () => {
  after(async () => {
    try {
      const { getPayloadClient } = await import('../src/lib/payloadClient');
      const payload = (await getPayloadClient()) as any;
      await payload.updateGlobal({
        slug: 'studio-settings',
        data: { password: '' },
        overrideAccess: true,
      });
      if (typeof payload?.db?.client?.close === 'function') payload.db.client.close();
    } catch {
      // ignore
    }
  });

  it('rejects wrong password with 401', async () => {
    const route = await import('../src/app/api/studio/login/route');
    const res = await route.POST(
      new Request('http://localhost/api/studio/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'i-gabuar' }),
      })
    );
    assert.equal(res.status, 401);
  });

  it('accepts STUDIO_PASSWORD env fallback and sets session cookie', async () => {
    const route = await import('../src/app/api/studio/login/route');
    const res = await route.POST(
      new Request('http://localhost/api/studio/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'test-studio-pass-001' }),
      })
    );
    assert.equal(res.status, 200);
    const setCookie = res.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes(`${STUDIO_COOKIE}=`));
    assert.ok(setCookie.includes('HttpOnly'));
  });

  it('Payload global password takes precedence over env', async () => {
    const { getPayloadClient } = await import('../src/lib/payloadClient');
    const payload = (await getPayloadClient()) as any;
    await payload.updateGlobal({
      slug: 'studio-settings',
      data: { password: 'admin-i-ri-fjalekalimi' },
      overrideAccess: true,
    });

    const route = await import('../src/app/api/studio/login/route');
    const wrongEnv = await route.POST(
      new Request('http://localhost/api/studio/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'test-studio-pass-001' }),
      })
    );
    assert.equal(wrongEnv.status, 401);

    const rightGlobal = await route.POST(
      new Request('http://localhost/api/studio/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'admin-i-ri-fjalekalimi' }),
      })
    );
    assert.equal(rightGlobal.status, 200);
  });
});
