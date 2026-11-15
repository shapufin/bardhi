#!/usr/bin/env tsx
/**
 * Arkivi Backup CLI
 * Usage: npx tsx scripts/backup.ts
 *   or:  npm run backup
 *
 * Creates a self-contained ZIP archive in backups/ containing:
 *   - data/arkivi.db       (SQLite database)
 *   - data/cms-data.json   (CMS state)
 *   - public/uploads/      (all uploaded media assets)
 *   - manifest.json        (checksums, counts, timestamp)
 *
 * Portable: uses the shared jszip-based engine (src/lib/backupArchive.ts),
 * works identically on Windows and Linux production containers.
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackupArchive } from '../src/lib/backupArchive';

const __filename = fileURLToPath(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(__filename), '..');
const BACKUPS_DIR = path.join(APP_ROOT, 'backups');

async function main() {
  console.log('🔒 Arkivi Backup — duke krijuar kopje rezervë...\n');

  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  const { buffer, filename, manifest } = await createBackupArchive();
  const archivePath = path.join(BACKUPS_DIR, filename);
  await fs.writeFile(archivePath, buffer);

  const sizeMb = (buffer.length / 1024 / 1024).toFixed(2);
  console.log('  ✅ Manifest:', `${manifest.counts.stories} rrëfime, ${manifest.counts.media} fotografi, ${manifest.counts.bookSpreads} faqe libri`);
  console.log(`\n✅ Kopja rezervë u krijua me sukses!`);
  console.log(`   📦 ${archivePath}`);
  console.log(`   📊 Madhësia: ${sizeMb} MB`);
}

main().catch((err) => {
  console.error('❌ Gabim gjatë krijimit të kopjes rezervë:', err instanceof Error ? err.message : err);
  process.exit(1);
});
