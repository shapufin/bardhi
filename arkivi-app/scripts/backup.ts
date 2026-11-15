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
 */

import fs from 'node:fs/promises';
import { existsSync, statSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Resolve APP_ROOT anchored to this script file
const __filename = fileURLToPath(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(__filename), '..');

const DATA_DIR = path.join(APP_ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms-data.json');
const DB_FILE = path.join(DATA_DIR, 'arkivi.db');
const UPLOADS_DIR = path.join(APP_ROOT, 'public', 'uploads');
const BACKUPS_DIR = path.join(APP_ROOT, 'backups');

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function isoTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

async function readCounts(): Promise<{ stories: number; bookSpreads: number; media: number }> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const p = JSON.parse(raw);
    return {
      stories: Array.isArray(p.stories) ? p.stories.length : 0,
      bookSpreads: Array.isArray(p.bookSpreads) ? p.bookSpreads.length : 0,
      media: Array.isArray(p.media) ? p.media.length : 0,
    };
  } catch {
    return { stories: 0, bookSpreads: 0, media: 0 };
  }
}

async function main() {
  console.log('🔒 Arkivi Backup — duke krijuar kopje rezervë...\n');

  if (!existsSync(DATA_FILE)) {
    console.error(`❌ cms-data.json nuk u gjet: ${DATA_FILE}`);
    process.exit(1);
  }
  if (!existsSync(DB_FILE)) {
    console.error(`❌ arkivi.db nuk u gjet: ${DB_FILE}`);
    process.exit(1);
  }

  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  const timestamp = isoTimestamp();
  const archiveName = `backup-${timestamp}.zip`;
  const archivePath = path.join(BACKUPS_DIR, archiveName);
  const stagingDir = path.join(BACKUPS_DIR, `.staging-${Date.now()}`);

  try {
    const stagingData = path.join(stagingDir, 'data');
    const stagingUploads = path.join(stagingDir, 'public', 'uploads');
    await fs.mkdir(stagingData, { recursive: true });
    await fs.mkdir(stagingUploads, { recursive: true });

    // Copy data files
    await fs.copyFile(DB_FILE, path.join(stagingData, 'arkivi.db'));
    await fs.copyFile(DATA_FILE, path.join(stagingData, 'cms-data.json'));

    // Copy uploads
    let uploadCount = 0;
    if (existsSync(UPLOADS_DIR)) {
      const files = readdirSync(UPLOADS_DIR).filter((f) => statSync(path.join(UPLOADS_DIR, f)).isFile());
      for (const file of files) {
        await fs.copyFile(path.join(UPLOADS_DIR, file), path.join(stagingUploads, file));
        uploadCount++;
      }
    }
    console.log(`  📁 Kopjuar ${uploadCount} skedar(ë) ngarkimi`);

    // Checksums on staged files (after copy, so checksums match exactly what's in archive)
    const dbChecksum = sha256(path.join(stagingData, 'arkivi.db'));
    const cmsChecksum = sha256(path.join(stagingData, 'cms-data.json'));
    const counts = await readCounts();

    const manifest = {
      appName: 'arkivi-app',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      contents: {
        database: 'data/arkivi.db',
        cmsState: 'data/cms-data.json',
        uploads: 'public/uploads/',
      },
      checksums: { database: dbChecksum, cmsState: cmsChecksum },
      counts,
    };
    await fs.writeFile(path.join(stagingDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`  ✅ Manifest: ${counts.stories} rrëfime, ${counts.media} fotografi, ${counts.bookSpreads} faqe libri`);

    // Create ZIP via PowerShell (Windows-native, zero external deps)
    const psCmd = `
      Add-Type -AssemblyName System.IO.Compression.FileSystem;
      $src = '${stagingDir.replace(/\\/g, '\\\\').replace(/'/g, "''")}';
      $dst = '${archivePath.replace(/\\/g, '\\\\').replace(/'/g, "''")}';
      if (Test-Path $dst) { Remove-Item $dst -Force };
      [System.IO.Compression.ZipFile]::CreateFromDirectory($src, $dst, [System.IO.Compression.CompressionLevel]::Optimal, $false);
    `;
    execFileSync('powershell', ['-NoProfile', '-Command', psCmd], { stdio: 'inherit' });

    const sizeMb = (statSync(archivePath).size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Kopja rezervë u krijua me sukses!`);
    console.log(`   📦 ${archivePath}`);
    console.log(`   📊 Madhësia: ${sizeMb} MB`);

  } finally {
    try {
      if (existsSync(stagingDir)) {
        rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      }
    } catch {}
  }
}

main().catch((err) => {
  console.error('❌ Gabim gjatë krijimit të kopjes rezervë:', err);
  process.exit(1);
});
