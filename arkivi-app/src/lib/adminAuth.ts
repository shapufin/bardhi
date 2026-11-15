import { isStudioRequestAuthorized } from './studioAuth';

/**
 * Shared admin-token verification for mutation/admin API routes.
 *
 * Accepted credentials (checked in order, all from environment — never hardcoded):
 *   - `x-admin-token` header or `Authorization: Bearer <token>`
 *   - STUDIO_TOKEN, ADMIN_SECRET, or PAYLOAD_SECRET env values
 *   - `studio_session` cookie issued by /api/studio/login (Studio author login)
 *
 * If no secrets are configured, every request is denied.
 */

export function getAdminTokens(): string[] {
  return [process.env.STUDIO_TOKEN, process.env.ADMIN_SECRET, process.env.PAYLOAD_SECRET]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s && s.length > 0));
}

export function extractBearerToken(req: Request): string | undefined {
  const adminToken = req.headers.get('x-admin-token')?.trim();
  if (adminToken) return adminToken;

  const authHeader = req.headers.get('authorization')?.trim();
  if (!authHeader) return undefined;
  if (authHeader.toLowerCase().startsWith('bearer')) {
    return authHeader.slice(6).trim() || undefined;
  }
  return authHeader;
}

export function verifyAdminAuth(req: Request): { authorized: boolean; status: number } {
  const validSecrets = getAdminTokens();
  const token = extractBearerToken(req);

  if (token) {
    if (validSecrets.length === 0 || !validSecrets.includes(token)) {
      return { authorized: false, status: 403 };
    }
    return { authorized: true, status: 200 };
  }

  // Studio author session cookie (issued by /api/studio/login)
  if (isStudioRequestAuthorized(req)) {
    return { authorized: true, status: 200 };
  }

  return { authorized: false, status: validSecrets.length === 0 ? 403 : 401 };
}
