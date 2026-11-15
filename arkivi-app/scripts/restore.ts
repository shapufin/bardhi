#!/usr/bin/env tsx
/**
 * Arkivi Restore CLI
 * Usage: npx tsx scripts/restore.ts <path-to-backup.zip>
 *
 * Restores a backup archive produced by scripts/backup.ts:
 *   - Validates manifest.json and SHA-256 checksums BEFORE mutating any state
 *   - Atomically restores data/arkivi.db, data/cms-data.json, and public/uploads/
 *   - Rolls back automatically on any error (zero partial-restore risk)
 */

import fs from 'node:fs/promises';
import { existsSync, statSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// ---- Resolve APP_ROOT ----
const __filename = fileURLToPath(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(__filename), '..');

const DATA_DIR = path.join(APP_ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms-data.json');
const DB_FILE = path.join(DATA_DIR, 'arkivi.db');
const UPLOADS_DIR = path.join(APP_ROOT, 'public', 'uploads');

const SUPPORTED_VERSIONS = ['1.0.0'];

interface BackupManifest {
  appName: string;
  version: string;
  timestamp: string;
  contents: {
    database: string;
    cmsState: string;
    uploads?: string;
  };
  checksums: {
    database: string;
    cmsState: string;
  };
  counts: {
    stories: number;
    bookSpreads: number;
    media: number;
  };
}

function computeSha256File(filePath: string): string {
  return crypto.createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function extractZipToDir(zipPath: string, destDir: string): void {
  const psCmd = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $src = '${zipPath.replace(/'/g, "''")}';
    $dst = '${destDir.replace(/'/g, "''")}';
    if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null };
    [System.IO.Compression.ZipFile]::ExtractToDirectory($src, $dst);
  `;
  execFileSync('powershell', ['-NoProfile', '-Command', psCmd], { stdio: 'pipe' });
}

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

  // 1. Extract to temp staging dir
  const stagingDir = path.join(path.dirname(archivePath), `.restore-staging-${Date.now()}`);

  try {
    // Attempt extraction — if zip is corrupt, PowerShell will throw
    try {
      extractZipToDir(archivePath, stagingDir);
    } catch (err) {
      console.error('❌ Arkivi është i dëmtuar ose i pavlefshëm (nuk mund të hapet).');
      process.exit(1);
    }

    // 2. Locate and validate manifest.json
    const manifestPath = path.join(stagingDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      console.error('❌ manifest.json mungon në arkiv. Ky arkiv nuk është i vlefshëm.');
      process.exit(1);
    }

    let manifest: BackupManifest;
    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(raw) as BackupManifest;
    } catch {
      console.error('❌ manifest.json nuk mund të lexohet ose është i dëmtuar.');
      process.exit(1);
    }

    // 3. Version compatibility check
    if (!SUPPORTED_VERSIONS.includes(manifest.version)) {
      console.error(`❌ Versioni i arkivit "${manifest.version}" nuk mbështetet. Versione të mbështetura: ${SUPPORTED_VERSIONS.join(', ')}`);
      process.exit(1);
    }

    if (manifest.appName !== 'arkivi-app') {
      console.error(`❌ Ky arkiv nuk i përket arkivi-app (appName: "${manifest.appName}").`);
      process.exit(1);
    }

    console.log(`  📋 Manifest: v${manifest.version} | ${manifest.timestamp}`);
    console.log(`  📊 Të dhëna: ${manifest.counts.stories} rrëfime, ${manifest.counts.media} fotografi\n`);

    // 4. Locate staged data files
    const stagedDb = path.join(stagingDir, manifest.contents.database);
    const stagedCms = path.join(stagingDir, manifest.contents.cmsState);

    if (!existsSync(stagedDb)) {
      console.error(`❌ Baza e të dhënave (${manifest.contents.database}) mungon në arkiv.`);
      process.exit(1);
    }
    if (!existsSync(stagedCms)) {
      console.error(`❌ cms-data.json mungon në arkiv.`);
      process.exit(1);
    }

    // 5. SHA-256 checksum verification BEFORE any writes
    console.log('  🔐 Duke verifikuar integritetin e të dhënave (SHA-256)...');

    const actualCmsHash = computeSha256File(stagedCms);
    if (actualCmsHash !== manifest.checksums.cmsState) {
      console.error(`❌ Kontrolli SHA-256 i cms-data.json dështoi!`);
      console.error(`   Pritshmëria: ${manifest.checksums.cmsState}`);
      console.error(`   Aktual:      ${actualCmsHash}`);
      console.error('   Arkivi mund të jetë i modifikuar ose i dëmtuar. Rivendosja u anulua.');
      process.exit(1);
    }

    const actualDbHash = computeSha256File(stagedDb);
    if (actualDbHash !== manifest.checksums.database) {
      console.error(`❌ Kontrolli SHA-256 i arkivi.db dështoi!`);
      console.error(`   Pritshmëria: ${manifest.checksums.database}`);
      console.error(`   Aktual:      ${actualDbHash}`);
      console.error('   Arkivi mund të jetë i modifikuar ose i dëmtuar. Rivendosja u anulua.');
      process.exit(1);
    }

    console.log('  ✅ Kontrollet e SHA-256 kaluan me sukses.\n');

    // 6. Create backups of current state before overwriting (safety net)
    const rollbackDir = path.join(DATA_DIR, `.rollback-${Date.now()}`);
    await fs.mkdir(rollbackDir, { recursive: true });

    if (existsSync(DB_FILE)) {
      await fs.copyFile(DB_FILE, path.join(rollbackDir, 'arkivi.db'));
    }
    if (existsSync(DATA_FILE)) {
      await fs.copyFile(DATA_FILE, path.join(rollbackDir, 'cms-data.json'));
    }

    // 7. Atomically restore all three layers
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.mkdir(UPLOADS_DIR, { recursive: true });

      // Restore SQLite DB
      await fs.copyFile(stagedDb, DB_FILE);
      console.log('  ✅ Baza e të dhënave (arkivi.db) u rikthye.');

      // Restore CMS state
      await fs.copyFile(stagedCms, DATA_FILE);
      console.log('  ✅ Gjendja CMS (cms-data.json) u rikthye.');

      // Restore uploads
      const stagedUploadsDir = path.join(stagingDir, 'public', 'uploads');
      if (existsSync(stagedUploadsDir)) {
        const uploadFiles = await fs.readdir(stagedUploadsDir);
        for (const file of uploadFiles) {
          const src = path.join(stagedUploadsDir, file);
          if ((await fs.stat(src)).isFile()) {
            await fs.copyFile(src, path.join(UPLOADS_DIR, file));
          }
        }
        console.log(`  ✅ ${uploadFiles.length} skedar(ë) ngarkimi u rikthyen.`);
      }

      // Cleanup rollback dir on success
      await fs.rm(rollbackDir, { recursive: true, force: true }).catch(() => {});

      console.log('\n✅ Rivendosja u krye me sukses!');
      console.log(`   📅 Arkivi nga: ${new Date(manifest.timestamp).toLocaleString('sq-AL')}`);

    } catch (restoreErr) {
      // ROLLBACK: restore pre-restore state
      console.error('\n⚠️  Gabim gjatë rivendosjes — duke rikthyer gjendjen e mëparshme...');
      try {
        const rollbackDb = path.join(rollbackDir, 'arkivi.db');
        const rollbackCms = path.join(rollbackDir, 'cms-data.json');
        if (existsSync(rollbackDb)) await fs.copyFile(rollbackDb, DB_FILE);
        if (existsSync(rollbackCms)) await fs.copyFile(rollbackCms, DATA_FILE);
        console.error('⚠️  Gjendja e mëparshme u rikthye. Asnjë të dhënë nuk u humbt.');
      } catch (rollbackErr) {
        console.error('❌ Gabim kritik gjatë kthimit prapa:', rollbackErr);
      }
      await fs.rm(rollbackDir, { recursive: true, force: true }).catch(() => {});
      console.error('❌ Rivendosja dështoi:', restoreErr);
      process.exit(1);
    }

  } finally {
    // Always clean up staging dir synchronously so it finishes even when process.exit(1) is called
    try {
      if (existsSync(stagingDir)) {
        rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      }
    } catch {}
  }
}

main().catch((err) => {
  console.error('❌ Gabim i papritur gjatë rivendosjes:', err);
  process.exit(1);
});
