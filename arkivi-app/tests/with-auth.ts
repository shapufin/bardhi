/**
 * Test bootstrap for functional API tests: installs deterministic secrets and
 * wraps globalThis.Request so every constructed request carries the admin
 * token unless it already provides its own credentials.
 *
 * Import this INSTEAD of test-env in files that exercise authenticated
 * endpoints (upload, backup/restore). Do NOT import it in security.test.ts —
 * that file intentionally builds unauthenticated/malformed requests.
 */

import './test-env';

const OriginalRequest = globalThis.Request;

class AuthedRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    if (!headers.has('x-admin-token') && !headers.has('authorization')) {
      headers.set('x-admin-token', process.env.ADMIN_SECRET as string);
    }
    super(input, { ...init, headers });
  }
}

globalThis.Request = AuthedRequest as typeof Request;

export { ADMIN_TOKEN, PAYLOAD_TOKEN } from './test-env';
