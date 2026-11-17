import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR } from '@/src/lib/payloadClient';

/**
 * Serves files from public/uploads at runtime.
 * `next start` only serves public/ files that existed at server start, so photos
 * uploaded from the Studio would 404 until a restart. next.config.mjs rewrites
 * /uploads/:file here (static files still win when they exist).
 */

export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
};

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file: raw } = await params;
  let name = raw;
  try {
    name = decodeURIComponent(raw);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const type = TYPES[path.extname(name).toLowerCase()];
  if (!type || name !== path.basename(name) || name.includes('\\') || name.startsWith('.')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const data = await fs.readFile(path.join(UPLOADS_DIR, name));
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
