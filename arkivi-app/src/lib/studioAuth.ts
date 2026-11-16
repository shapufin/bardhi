import { createHmac, pbkdf2Sync, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Studio session auth — password checked against author users in
 * the `users` collection, the Payload `studio-settings` global (scrypt hash),
 * with STUDIO_PASSWORD env as bootstrap fallback. Sessions are signed
 * HttpOnly cookies; no secret ever reaches the client bundle.
 */

export const STUDIO_COOKIE = 'studio_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 ditë
const SCRYPT_PREFIX = 'scrypt$';

const PASSWORD_HASH_PREFIXES: Record<number, string> = {
  100000: 'pbkdf2-sha256-100k-v1:',
  600000: 'pbkdf2-sha256-v1:',
};
const DEFAULT_KEY_LENGTH = 32;
const LEGACY_ITERATIONS = 25000;
const LEGACY_KEY_LENGTH = 512;

export function getPayloadHashParameters(hash: string): { hash: string; iterations: number; keyLength: number } {
  for (const [iterations, prefix] of Object.entries(PASSWORD_HASH_PREFIXES)) {
    if (hash.startsWith(prefix)) {
      return {
        hash: hash.slice(prefix.length),
        iterations: Number(iterations),
        keyLength: DEFAULT_KEY_LENGTH,
      };
    }
  }
  return {
    hash,
    iterations: LEGACY_ITERATIONS,
    keyLength: LEGACY_KEY_LENGTH,
  };
}

export function verifyUserPasswordHash(
  password: string,
  storedHash: string | undefined | null,
  salt: string | undefined | null
): boolean {
  if (!storedHash || !salt) return false;
  try {
    const { hash: cleanHash, iterations, keyLength } = getPayloadHashParameters(storedHash);
    const actual = pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
    const expected = Buffer.from(cleanHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

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
