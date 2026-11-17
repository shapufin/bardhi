import './test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_TOKEN } from './test-env';

/**
 * Regression tests for audit round 2026-11-15:
 * every mutation/admin endpoint must reject unauthenticated requests and
 * accept the configured admin token.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const AUTH_HEADERS = { ...JSON_HEADERS, 'x-admin-token': ADMIN_TOKEN as string };

function req(url: string, init?: RequestInit) {
  return new Request(`http://localhost:3001${url}`, init);
}

describe('Admin Auth Boundary (AUDIT-2026-11-15)', () => {
  it('GET /api/backup without token returns 401 and does not leak the archive', async () => {
    const route = await import('../src/app/api/backup/route');
    const res = await route.GET(req('/api/backup', { method: 'GET' }));
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.ok(!body.error?.includes('backup-'));
  });

  it('GET /api/backup with wrong token returns 403', async () => {
    const route = await import('../src/app/api/backup/route');
    const res = await route.GET(
      req('/api/backup', { method: 'GET', headers: { 'x-admin-token': 'wrong-secret' } })
    );
    assert.strictEqual(res.status, 403);
  });

  it('GET /api/backup with valid token returns a ZIP archive', async () => {
    const route = await import('../src/app/api/backup/route');
    const res = await route.GET(
      req('/api/backup', { method: 'GET', headers: { 'x-admin-token': ADMIN_TOKEN as string } })
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/zip');
    const buf = Buffer.from(await res.arrayBuffer());
    assert.strictEqual(buf[0], 0x50);
    assert.strictEqual(buf[1], 0x4b);
  });

  it('POST /api/restore without token returns 401', async () => {
    const route = await import('../src/app/api/restore/route');
    const form = new FormData();
    form.append('archive', new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])]), 'x.zip');
    const res = await route.POST(req('/api/restore', { method: 'POST', body: form }));
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/stories without token returns 401', async () => {
    const route = await import('../src/app/api/stories/route');
    const res = await route.POST(
      req('/api/stories', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ title: 'Probe' }) })
    );
    assert.strictEqual(res.status, 401);
  });

  it('DELETE /api/stories/:id without token returns 401', async () => {
    const route = await import('../src/app/api/stories/[id]/route');
    const res = await route.DELETE(req('/api/stories/any-id', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'any-id' }),
    });
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/media without token returns 401', async () => {
    const route = await import('../src/app/api/media/route');
    const res = await route.POST(
      req('/api/media', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ dataUrl: 'data:image/png;base64,AAAA' }) })
    );
    assert.strictEqual(res.status, 401);
  });

  it('PUT /api/media/:id without token returns 401', async () => {
    const route = await import('../src/app/api/media/[id]/route');
    const res = await route.PUT(
      req('/api/media/some-id', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ title: 'x' }) }),
      { params: Promise.resolve({ id: 'some-id' }) }
    );
    assert.strictEqual(res.status, 401);
  });

  it('DELETE /api/media/:id without token returns 401', async () => {
    const route = await import('../src/app/api/media/[id]/route');
    const res = await route.DELETE(req('/api/media/some-id', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'some-id' }),
    });
    assert.strictEqual(res.status, 401);
  });

  it('PUT /api/timeline without token returns 401', async () => {
    const route = await import('../src/app/api/timeline/route');
    const res = await route.PUT(
      req('/api/timeline', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ timeline: [] }) })
    );
    assert.strictEqual(res.status, 401);
  });

  it('PUT /api/hero without token returns 401', async () => {
    const route = await import('../src/app/api/hero/route');
    const res = await route.PUT(
      req('/api/hero', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ headline: 'x' }) })
    );
    assert.strictEqual(res.status, 401);
  });

  it('PUT /api/site without token returns 401', async () => {
    const route = await import('../src/app/api/site/route');
    const res = await route.PUT(
      req('/api/site', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ siteTitle: 'x' }) })
    );
    assert.strictEqual(res.status, 401);
  });

  it('PUT /api/layout without token returns 401', async () => {
    const route = await import('../src/app/api/layout/route');
    const res = await route.PUT(
      req('/api/layout', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ sections: [] }) })
    );
    assert.strictEqual(res.status, 401);
  });

  it('PUT /api/book/spreads without token returns 401', async () => {
    const route = await import('../src/app/api/book/spreads/route');
    const res = await route.PUT(
      req('/api/book/spreads', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify({ bookSpreads: [] }) })
    );
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/stories with valid token still succeeds (auth does not break function)', async () => {
    const route = await import('../src/app/api/stories/route');
    const testId = `story-authtest-${Date.now()}`;
    const res = await route.POST(
      req('/api/stories', {
        method: 'POST',
        headers: AUTH_HEADERS,
        body: JSON.stringify({ id: testId, title: 'Test Auth Boundary', status: 'draft' }),
      })
    );
    assert.strictEqual(res.status, 200);
    const state = await res.json();
    assert.ok(state.stories.some((s: { id: string }) => s.id === testId));

    // cleanup
    const delRoute = await import('../src/app/api/stories/[id]/route');
    await delRoute.DELETE(
      req(`/api/stories/${testId}`, { method: 'DELETE', headers: { 'x-admin-token': ADMIN_TOKEN as string } }),
      { params: Promise.resolve({ id: testId }) }
    );
  });

  it('GET /api/cms and GET /api/media remain public (read-only)', async () => {
    const cmsRoute = await import('../src/app/api/cms/route');
    const cmsRes = await cmsRoute.GET(new Request('http://localhost/api/cms'));
    assert.strictEqual(cmsRes.status, 200);

    const mediaRoute = await import('../src/app/api/media/route');
    const mediaRes = await mediaRoute.GET();
    assert.strictEqual(mediaRes.status, 200);
  });
});
