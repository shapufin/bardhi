#!/usr/bin/env tsx
/**
 * Arkivi Restore CLI
 * Usage: npx tsx scripts/restore.ts <path-to-backup.zip>
 *
 * Restores a backup archive produced by scripts/backup.ts:
 *   - Validates manifest.json and SHA-256 checksums BEFORE mutating any state
 *   - Atomically restores data/arkivi.db, data/cms-data.json, and public/uploads/
 *   - Rolls back automatically on any error (zero partial-restore risk)
 *
 * Portable: uses the shared jszip-based engine (src/lib/backupArchive.ts),
 * works identically on Windows and Linux production containers.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { restoreFromArchiveFile } from '../src/lib/backupArchive';

async function main() {
  const archivePath = process.argv[2];

  if (!archivePath) {
    console.error('❌ Përdorimi: npx tsx scripts/restore.ts <rruga-e-backup.zip>');
    process.exit(1);
  }

  if (!existsSync(archivePath)) {
    console.error(`❌ Skedari i arkivit nuk u gjet: ${archivePath}`);
    process.exit(1);
  }

  console.log(`🔄 Arkivi Restore — duke rikthyer nga: ${path.basename(archivePath)}\n`);

  try {
    const manifest = await restoreFromArchiveFile(archivePath);

    console.log(`  📋 Manifest: v${manifest.version} | ${manifest.timestamp}`);
    console.log(`  📊 Të dhëna: ${manifest.counts.stories} rrëfime, ${manifest.counts.media} fotografi\n`);
    console.log('✅ Rivendosja u krye me sukses!');
    console.log(`   📅 Arkivi nga: ${new Date(manifest.timestamp).toLocaleString('sq-AL')}`);
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : 'Gabim i papritur gjatë rivendosjes.'}`);
    process.exit(1);
  }
}

main();
