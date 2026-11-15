import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Studio session auth — password checked against the Payload
 * `studio-settings` global (scrypt hash, editable in /admin) with
 * STUDIO_PASSWORD env as bootstrap fallback. Sessions are signed
 * HttpOnly cookies; no secret ever reaches the client bundle.
 */

export const STUDIO_COOKIE = 'studio_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ditë
const SCRYPT_PREFIX = 'scrypt$';

export function hashStudioPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${SCRYPT_PREFIX}${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyStudioPasswordHash(password: string, stored: string): boolean {
  if (!stored.startsWith(SCRYPT_PREFIX)) return false;
  const [saltHex, hashHex] = stored.slice(SCRYPT_PREFIX.length).split('$');
  if (!saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function sessionSecret(): string {
  return (process.env.PAYLOAD_SECRET || process.env.ADMIN_SECRET || '').trim();
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('hex');
}

export function createSessionToken(now: number = Date.now()): string {
  const exp = String(now + SESSION_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

export function verifySessionToken(token: string | undefined | null, now: number = Date.now()): boolean {
  if (!token || !sessionSecret()) return false;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || !/^[0-9a-f]{64}$/i.test(sig)) return false;
  if (Number(exp) <= now) return false;
  const expected = sign(exp);
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function getSessionTokenFromRequest(req: Request): string | undefined {
  return parseCookies(req.headers.get('cookie'))[STUDIO_COOKIE];
}

export function isStudioRequestAuthorized(req: Request): boolean {
  return verifySessionToken(getSessionTokenFromRequest(req));
}

export function sessionCookieHeader(token: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${STUDIO_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function clearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${STUDIO_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
