import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { getCmsState, saveCmsState } from '../src/lib/payloadClient';
import './test-env';

const VALID_SECRET = process.env.PAYLOAD_SECRET || 'sekret-arkivi-dritan-berisha-2026-autorit';

describe('Security & Auth Guardrails (SEC-01 & SEC-02)', () => {
  after(async () => {
    try {
      const { getPayloadClient } = await import('../src/lib/payloadClient');
      const payload = (await getPayloadClient()) as any;
      if (typeof payload?.db?.client?.close === 'function') {
        payload.db.client.close();
      }
    } catch {
      // Ignore
    }

    // Unref any background socket/pipe handles spawned by Payload/libsql
    try {
      const getHandles = (process as any)._getActiveHandles;
      if (typeof getHandles === 'function') {
        const handles = getHandles();
        for (const h of handles) {
          if (h && typeof h.unref === 'function') {
            h.unref();
          }
        }
      }
    } catch {
      // Ignore
    }
  });
  // ==========================================
  // TIER 1: FEATURE EQUIVALENCE CLASS COVERAGE
  // ==========================================

  it('Tier 1: POST /api/cms/reset without authentication returns HTTP 401 with Albanian error', async () => {
    const routeModule = await import('../src/app/api/cms/reset/route');
    const req = new Request('http://localhost:3001/api/cms/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const res = await routeModule.POST(req);
    assert.strictEqual(res.status, 401, 'Unauthenticated reset must return 401');

    const json = await res.json();
    assert.ok(json.error, 'Response must include error field');
    assert.match(json.error, /I paautorizuar/i, 'Error must state unauthorized in Albanian');
  });

  it('Tier 1: POST /api/cms/reset with valid Bearer secret returns HTTP 200 and restores state', async () => {
    const routeModule = await import('../src/app/api/cms/reset/route');
    const req = new Request('http://localhost:3001/api/cms/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VALID_SECRET}`,
      },
    });

    const res = await routeModule.POST(req);
    assert.strictEqual(res.status, 200, 'Authenticated reset must return 200');

    const json = await res.json();
    assert.strictEqual(json.locale, 'sq');
    assert.ok(Array.isArray(json.stories));
  });

  it('Tier 1: GET /api/users without authentication returns HTTP 401 without leaking accounts', async () => {
    const routeModule = await import('../src/app/api/users/route');
    const req = new Request('http://localhost:3001/api/users', {
      method: 'GET',
    });

    const res = await routeModule.GET(req);
    assert.strictEqual(res.status, 401, 'Unauthenticated GET /api/users must return 401');

    const json = await res.json();
    assert.ok(json.error, 'Response must include error message');
    assert.strictEqual(json.users, undefined, 'User accounts must not be leaked');
    assert.match(json.error, /I paautorizuar/i);
  });

  it('Tier 1: POST /api/users without authentication returns HTTP 401', async () => {
    const routeModule = await import('../src/app/api/users/route');
    const req = new Request('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unauth-attacker@example.com',
        password: 'Password123!',
        role: 'superuser',
      }),
    });

    const res = await routeModule.POST(req);
    assert.strictEqual(res.status, 401, 'Unauthenticated POST /api/users must return 401');

    const json = await res.json();
    assert.ok(json.error);
    assert.strictEqual(json.user, undefined, 'No user record must be returned');
  });

  it('Tier 1: NODE_ENV=production enforces safeguard requiring explicit confirmation', async () => {
    const originalEnv = process.env.NODE_ENV;
    const envRecord = process.env as Record<string, string | undefined>;
    try {
      envRecord.NODE_ENV = 'production';
      const routeModule = await import('../src/app/api/cms/reset/route');

      // Attempt reset with only Bearer token but without x-confirm-reset or x-admin-token
      const req = new Request('http://localhost:3001/api/cms/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VALID_SECRET}`,
        },
      });

      const res = await routeModule.POST(req);
      assert.strictEqual(
        res.status,
        403,
        'Production reset without confirmation header must be rejected with 403'
      );
    } finally {
      envRecord.NODE_ENV = originalEnv;
    }
  });

  // ==========================================
  // TIER 2: BOUNDARY AND CORNER CASES
  // ==========================================

  it('Tier 2: Invalid bearer token returns HTTP 403 Forbidden', async () => {
    const routeModule = await import('../src/app/api/cms/reset/route');
    const req = new Request('http://localhost:3001/api/cms/reset', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong-secret-token-12345',
      },
    });

    const res = await routeModule.POST(req);
    assert.strictEqual(res.status, 403, 'Invalid secret token must return 403');
  });

  it('Tier 2: Malformed authorization header format returns HTTP 401', async () => {
    const routeModule = await import('../src/app/api/users/route');
    const req = new Request('http://localhost:3001/api/users', {
      method: 'GET',
      headers: {
        Authorization: '', // Empty auth header
      },
    });

    const res = await routeModule.GET(req);
    assert.strictEqual(res.status, 401, 'Empty auth header must return 401');
  });

  it('Tier 2: Weak password (< 8 chars) on authorized POST /api/users returns HTTP 400', async () => {
    const routeModule = await import('../src/app/api/users/route');
    const req = new Request('http://localhost:3001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VALID_SECRET}`,
      },
      body: JSON.stringify({
        email: `valid-email-${Date.now()}@example.com`,
        password: 'short', // 5 characters
        name: 'Weak Password User',
      }),
    });

    const res = await routeModule.POST(req);
    assert.strictEqual(res.status, 400, 'Password under 8 characters must return 400');

    const json = await res.json();
    assert.match(json.error, /8 karaktere/i);
  });

  it('Tier 2: Invalid email address format on authorized POST /api/users returns HTTP 400', async () => {
    const routeModule = await import('../src/app/api/users/route');
    const req = new Request('http://localhost:3001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VALID_SECRET}`,
      },
      body: JSON.stringify({
        email: 'invalid-email-without-at-sign',
        password: 'ValidPassword123!',
      }),
    });

    const res = await routeModule.POST(req);
    assert.strictEqual(res.status, 400, 'Invalid email format must return 400');

    const json = await res.json();
    assert.match(json.error, /email të vlefshëm/i);
  });

  it('Tier 2: Duplicate email on authorized POST /api/users is cleanly rejected', async () => {
    const routeModule = await import('../src/app/api/users/route');
    const uniqueEmail = `duplicate-user-${Date.now()}@example.com`;

    // First creation
    const req1 = new Request('http://localhost:3001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VALID_SECRET}`,
      },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'InitialPassword123!',
        name: 'Original User',
      }),
    });

    const res1 = await routeModule.POST(req1);
    assert.strictEqual(res1.status, 200, 'First creation must succeed');

    // Duplicate creation attempt
    const req2 = new Request('http://localhost:3001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VALID_SECRET}`,
      },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'SecondPassword123!',
        name: 'Duplicate User',
      }),
    });

    const res2 = await routeModule.POST(req2);
    // Duplicate registration should return non-200 (500 or 409 depending on DB adapter)
    assert.notStrictEqual(res2.status, 200, 'Duplicate user creation must not succeed');
    const json2 = await res2.json();
    assert.ok(json2.error, 'Must return error on duplicate creation');
    assert.match(json2.error, /ekziston tashmë/i);
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================

  it('Tier 3: Unauthenticated reset attempt leaves active CMS state completely intact', async () => {
    const currentState = await getCmsState();
    const testMarker = `Marker-${Date.now()}`;

    // Temporarily mutate title
    await saveCmsState({
      ...currentState,
      site: {
        ...currentState.site,
        siteTitle: testMarker,
      },
    });

    // Unauthenticated attacker tries to wipe CMS
    const resetRoute = await import('../src/app/api/cms/reset/route');
    const attackReq = new Request('http://localhost:3001/api/cms/reset', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer forged-attacker-token',
      },
    });

    const res = await resetRoute.POST(attackReq);
    assert.strictEqual(res.status, 403, 'Attack must be rejected with 403');

    // Verify title was NOT wiped back to default
    const verifiedState = await getCmsState();
    assert.strictEqual(
      verifiedState.site.siteTitle,
      testMarker,
      'CMS state must remain untouched by unauthorized reset attempt'
    );

    // Revert marker
    await saveCmsState({
      ...verifiedState,
      site: {
        ...verifiedState.site,
        siteTitle: currentState.site.siteTitle,
      },
    });
  });

  it('Tier 3: Authorized user creation and subsequent retrieval roundtrip without password leak', async () => {
    const usersRoute = await import('../src/app/api/users/route');
    const testEmail = `roundtrip-${Date.now()}@example.com`;
    const testName = 'Verified Author';

    const createReq = new Request('http://localhost:3001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VALID_SECRET}`,
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword123!',
        name: testName,
        role: 'author',
      }),
    });

    const createRes = await usersRoute.POST(createReq);
    assert.strictEqual(createRes.status, 200);
    const createdJson = await createRes.json();
    assert.strictEqual(createdJson.user.email, testEmail);

    // Retrieve via GET /api/users
    const getReq = new Request('http://localhost:3001/api/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${VALID_SECRET}`,
      },
    });

    const getRes = await usersRoute.GET(getReq);
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert.ok(Array.isArray(getJson.users));

    const found = getJson.users.find((u: { email: string }) => u.email === testEmail);
    assert.ok(found, 'Created user must exist in GET /api/users list');
    assert.strictEqual(found.name, testName);
    assert.strictEqual(found.password, undefined, 'Password hash must never be returned in API response');
  });

  // ==========================================
  // TIER 4: REAL-WORLD ADVERSARIAL PENETRATION SCAN
  // ==========================================

  it('Tier 4: Adversarial unauthenticated penetration scan blocked with zero state alteration', async () => {
    const resetRoute = await import('../src/app/api/cms/reset/route');
    const usersRoute = await import('../src/app/api/users/route');

    const stateBefore = await getCmsState();

    // Matrix of adversarial requests simulating hostile external actors
    const adversarialProbes = [
      // 1. SQL Injection / Header manipulation in Authorization
      {
        name: 'Auth header SQL injection',
        handler: () =>
          resetRoute.POST(
            new Request('http://localhost:3001/api/cms/reset', {
              method: 'POST',
              headers: { Authorization: "Bearer ' OR '1'='1" },
            })
          ),
        expectedStatuses: [401, 403],
      },
      // 2. Spoofed Admin header injection
      {
        name: 'Spoofed X-Admin / X-Forwarded headers',
        handler: () =>
          resetRoute.POST(
            new Request('http://localhost:3001/api/cms/reset', {
              method: 'POST',
              headers: {
                'X-Admin': 'true',
                'X-Forwarded-For': '127.0.0.1',
                'X-Role': 'admin',
              },
            })
          ),
        expectedStatuses: [401, 403],
      },
      // 3. User enumeration probe without credentials
      {
        name: 'Unauthenticated user enumeration probe',
        handler: () =>
          usersRoute.GET(
            new Request('http://localhost:3001/api/users', {
              method: 'GET',
              headers: { Cookie: 'session=fake-session-cookie-xyz' },
            })
          ),
        expectedStatuses: [401, 403],
      },
      // 4. Privilege escalation superuser creation probe
      {
        name: 'Privilege escalation superuser creation probe',
        handler: () =>
          usersRoute.POST(
            new Request('http://localhost:3001/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer invalid-token-xyz',
              },
              body: JSON.stringify({
                email: 'hacked-admin@example.com',
                password: 'HackedPassword123!',
                role: 'superuser',
              }),
            })
          ),
        expectedStatuses: [401, 403],
      },
    ];

    for (const probe of adversarialProbes) {
      const response = await probe.handler();
      assert.ok(
        probe.expectedStatuses.includes(response.status),
        `Probe "${probe.name}" was not blocked appropriately: received status ${response.status}`
      );
    }

    // Verify system state has not been corrupted or wiped
    const stateAfter = await getCmsState();
    assert.strictEqual(
      stateAfter.stories.length,
      stateBefore.stories.length,
      'Stories count must remain unaltered after attack scan'
    );
    assert.strictEqual(
      stateAfter.bookSpreads.length,
      stateBefore.bookSpreads.length,
      'Book spreads count must remain unaltered after attack scan'
    );
  });
});
