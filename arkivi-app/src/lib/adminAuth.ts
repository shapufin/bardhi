/**
 * Shared admin-token verification for mutation/admin API routes.
 *
 * Accepted credentials (checked in order, all from environment — never hardcoded):
 *   - `x-admin-token` header or `Authorization: Bearer <token>`
 *   - STUDIO_TOKEN, ADMIN_SECRET, or PAYLOAD_SECRET env values
 *
 * If no secrets are configured, every request is denied.
 */

export function getAdminTokens(): string[] {
  return [process.env.STUDIO_TOKEN, process.env.ADMIN_SECRET, process.env.PAYLOAD_SECRET]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s && s.length > 0));
}

/** Token the studio UI should send. Picks the first configured secret deterministically. */
export function getStudioToken(): string {
  return (
    process.env.STUDIO_TOKEN?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    process.env.PAYLOAD_SECRET?.trim() ||
    ''
  );
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
  if (validSecrets.length === 0) {
    return { authorized: false, status: 403 };
  }

  const token = extractBearerToken(req);
  if (!token) {
    return { authorized: false, status: 401 };
  }
  if (!validSecrets.includes(token)) {
    return { authorized: false, status: 403 };
  }
  return { authorized: true, status: 200 };
}
