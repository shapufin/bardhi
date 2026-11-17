/**
 * In-memory login throttling (per process; resets on restart).
 * - per-client: MAX_PER_CLIENT attempts / WINDOW_MS
 * - global: MAX_GLOBAL attempts / WINDOW_MS across all clients (stops distributed or header-spoofed guessing)
 */
export const WINDOW_MS = 10 * 60 * 1000;
export const MAX_PER_CLIENT = 10;
export const MAX_GLOBAL = 100;
const MAX_TRACKED = 5000;

const clients = new Map<string, { count: number; reset: number }>();
let global = { count: 0, reset: 0 };

/**
 * Client key. `cf-connecting-ip` is set by Cloudflare (the production tunnel) and cannot be
 * forged through it. Otherwise use the LAST x-forwarded-for hop (appended by the nearest proxy),
 * never the first, which the client controls.
 */
export function getClientKey(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'local';
}

export function loginRateLimited(key: string, now: number = Date.now()): boolean {
  if (global.reset < now) global = { count: 0, reset: now + WINDOW_MS };
  global.count += 1;
  if (global.count > MAX_GLOBAL) return true;

  if (clients.size >= MAX_TRACKED) {
    for (const [k, v] of clients) if (v.reset < now) clients.delete(k);
    if (clients.size >= MAX_TRACKED) clients.clear();
  }
  const entry = clients.get(key);
  if (!entry || entry.reset < now) {
    clients.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_CLIENT;
}

export function resetLoginRateLimit(): void {
  clients.clear();
  global = { count: 0, reset: 0 };
}
