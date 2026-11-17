/**
 * Shared test environment bootstrap.
 * Sets deterministic admin secrets BEFORE route modules read them
 * (verifyAdminAuth reads process.env per request, so order is not critical,
 * but keeping it at import time is safest).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Isolate every test process from the live data/ and public/uploads folders.
if (!process.env.ARKIVI_DATA_ROOT) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arkivi-test-'));
  process.env.ARKIVI_DATA_ROOT = root;
  process.env.DATABASE_URI = `file:${path.join(root, 'data', 'arkivi.db').split(path.sep).join('/')}`;
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  // Seed the temp DB from the dev DB (read-only copy) so users/schema exist; falls back to a fresh Payload DB.
  const liveDb = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'arkivi.db');
  if (fs.existsSync(liveDb)) fs.copyFileSync(liveDb, path.join(root, 'data', 'arkivi.db'));
  // Seed uploads from the dev folder too (read-only copy) so upload/backup tests have realistic content.
  const liveUploads = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'uploads');
  if (fs.existsSync(liveUploads)) fs.cpSync(liveUploads, path.join(root, 'public', 'uploads'), { recursive: true });
  process.on('exit', () => {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {}
  });
}

process.env.ADMIN_SECRET = process.env.ADMIN_SECRET || 'test-admin-secret-0123456789';
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-payload-secret-0123456789';
process.env.STUDIO_TOKEN = process.env.STUDIO_TOKEN || '';

export const ADMIN_TOKEN = process.env.ADMIN_SECRET;
export const PAYLOAD_TOKEN = process.env.PAYLOAD_SECRET;
