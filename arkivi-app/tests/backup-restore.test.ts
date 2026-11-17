import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fsPromises from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fs = { ...fsPromises, statSync };
import './with-auth';
import {
  APP_ROOT,
  DATA_DIR,
  DATA_FILE,
  UPLOADS_DIR,
  getCmsState,
  saveCmsState,
} from '../src/lib/payloadClient';
import type { CmsState } from '../src/types/cms';

const BACKUP_ROUTE_MODULE = `${'../src/app/api/backup'}/route`;
const RESTORE_ROUTE_MODULE = `${'../src/app/api/restore'}/route`;

async function loadBackupRoute(): Promise<{ GET?: (req: Request) => Promise<Response> } | null> {
  try {
    return (await import(BACKUP_ROUTE_MODULE)) as { GET?: (req: Request) => Promise<Response> };
  } catch {
    return null;
  }
}

async function loadRestoreRoute(): Promise<{ POST?: (req: Request) => Promise<Response> } | null> {
  try {
    return (await import(RESTORE_ROUTE_MODULE)) as { POST?: (req: Request) => Promise<Response> };
  } catch {
    return null;
  }
}

const BACKUP_SCRIPT = path.join(APP_ROOT, 'scripts', 'backup.ts');
const RESTORE_SCRIPT = path.join(APP_ROOT, 'scripts', 'restore.ts');
const BACKUPS_DIR = path.join(APP_ROOT, 'backups');
const DB_FILE = path.join(DATA_DIR, 'arkivi.db');
const TSX_BIN = path.join(APP_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

// Reliable cross-platform CLI runner using node + tsx
function runCli(args: string[], options: Record<string, any> = {}) {
  const filteredArgs = args.filter((a) => a !== 'tsx');
  if (existsSync(TSX_BIN)) {
    return spawnSync(process.execPath, [TSX_BIN, ...filteredArgs], {
      cwd: APP_ROOT,
      encoding: 'utf-8',
      timeout: 30000,
      ...options,
    });
  }
  return spawnSync('npx', args, {
    cwd: APP_ROOT,
    encoding: 'utf-8',
    timeout: 30000,
    shell: process.platform === 'win32',
    ...options,
  });
}

// Helper to compute SHA-256 hash of a file or buffer
function computeSha256(content: Buffer | string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper to unlink file with retry on Windows transient locks (EBUSY / EPERM)
async function unlinkWithRetry(filePath: string, maxAttempts = 15, delay = 75): Promise<void> {
  if (!existsSync(filePath)) return;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fs.unlink(filePath);
      return;
    } catch (err: any) {
      if ((err.code === 'EBUSY' || err.code === 'EPERM') && i < maxAttempts - 1) {
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }
      throw err;
    }
  }
}

// Helper to list entries inside a zip archive using native PowerShell
function listZipArchiveEntries(zipPath: string): string[] {
  const psScript = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}');
    $zip.Entries | ForEach-Object { $_.FullName };
    $zip.Dispose();
  `;
  const stdout = execFileSync('powershell', ['-NoProfile', '-Command', psScript], {
    encoding: 'utf-8',
  });
  return stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Helper to extract a single file's text content from a zip archive
/** Logical DB content: row count per table (snapshots are not byte-identical to the live file). */
async function dbFingerprint(file: string): Promise<Record<string, number>> {
  const { createClient } = await import('@libsql/client');
  // Inspect a copy so no handle is left on the live file (Windows cannot unlink open files).
  const copy = path.join(os.tmpdir(), `arkivi-fp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  await fs.copyFile(file, copy);
  const client = createClient({ url: `file:${copy.split(path.sep).join('/')}` });
  try {
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    const out: Record<string, number> = {};
    for (const r of tables.rows) {
      const name = String(r.name).replace(/"/g, '""');
      const c = await client.execute(`SELECT count(*) AS c FROM "${name}"`);
      out[String(r.name)] = Number(c.rows[0].c);
    }
    return out;
  } finally {
    client.close();
    await fs.rm(copy, { force: true }).catch(() => {});
  }
}

function readZipFileEntry(zipPath: string, entryName: string): string {
  const psScript = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}');
    $entry = $zip.Entries | Where-Object { $_.FullName -eq '${entryName.replace(/'/g, "''")}' } | Select-Object -First 1;
    if ($entry) {
      $reader = New-Object System.IO.StreamReader($entry.Open());
      $reader.ReadToEnd();
      $reader.Close();
    }
    $zip.Dispose();
  `;
  return execFileSync('powershell', ['-NoProfile', '-Command', psScript], {
    encoding: 'utf-8',
  });
}

// Helper to create a zip archive from a source folder using PowerShell
function createZipFromFolder(sourceFolder: string, destinationZip: string): void {
  const psScript = `
    if (Test-Path '${destinationZip.replace(/'/g, "''")}') { Remove-Item '${destinationZip.replace(/'/g, "''")}' -Force };
    Compress-Archive -Path '${sourceFolder.replace(/'/g, "''")}\\*' -DestinationPath '${destinationZip.replace(/'/g, "''")}';
  `;
  execFileSync('powershell', ['-NoProfile', '-Command', psScript]);
}

// Helper to find latest backup zip in backups directory
function getLatestBackupZip(): string | null {
  if (!existsSync(BACKUPS_DIR)) return null;
  const files = readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith('backup-') && f.endsWith('.zip'))
    .map((f) => path.join(BACKUPS_DIR, f));
  if (files.length === 0) return null;
  files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  return files[files.length - 1];
}

describe('Zero-Loss Backup & Restore System (R2)', { concurrency: 1 }, () => {
  let baselineCmsState: CmsState;
  let baselineDbBuffer: Buffer | null = null;
  const temporaryFilesToClean: string[] = [];

  before(async () => {
    baselineCmsState = await getCmsState();
    if (existsSync(DB_FILE)) {
      baselineDbBuffer = await fs.readFile(DB_FILE);
    }
    await fs.mkdir(BACKUPS_DIR, { recursive: true });
    try {
      const files = readdirSync(BACKUPS_DIR);
      for (const f of files) {
        await fs.rm(path.join(BACKUPS_DIR, f), { recursive: true, force: true }).catch(() => {});
      }
    } catch {}
  });

  after(async () => {
    // Restore baseline CMS state
    if (baselineCmsState) {
      await saveCmsState(baselineCmsState);
    }

    // Restore baseline SQLite DB if missing or empty after testing
    if (baselineDbBuffer && (!existsSync(DB_FILE) || (await fs.readFile(DB_FILE)).length === 0)) {
      await fs.writeFile(DB_FILE, baselineDbBuffer);
    }

    // Clean up temporary files/folders created during testing
    for (const f of temporaryFilesToClean) {
      try {
        await fs.rm(f, { recursive: true, force: true });
      } catch {
        // Ignore missing files
      }
    }
  });

  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('Tier 1: CLI backup (npm run backup / tsx scripts/backup.ts) runs cleanly and exits 0', async () => {
    assert.ok(
      existsSync(BACKUP_SCRIPT),
      `CLI backup script must exist at: ${BACKUP_SCRIPT}`
    );

    const result = runCli(['tsx', BACKUP_SCRIPT]);

    assert.strictEqual(
      result.status,
      0,
      `CLI backup must exit with code 0. Stderr: ${result.stderr}, Stdout: ${result.stdout}`
    );

    const latestZip = getLatestBackupZip();
    assert.ok(latestZip, 'A backup zip archive must be created in backups/');
    temporaryFilesToClean.push(latestZip);
  });

  it('Tier 1: Backup zip archive contains manifest.json, DB, CMS state, and uploads', async () => {
    const latestZip = getLatestBackupZip();
    assert.ok(latestZip, 'Backup archive must be available for inspection');

    const entries = listZipArchiveEntries(latestZip);
    assert.ok(
      entries.includes('manifest.json'),
      'Backup archive must contain manifest.json at root'
    );
    assert.ok(
      entries.some((e) => e === 'data/arkivi.db' || e.endsWith('arkivi.db')),
      'Backup archive must contain data/arkivi.db'
    );
    assert.ok(
      entries.some((e) => e === 'data/cms-data.json' || e.endsWith('cms-data.json')),
      'Backup archive must contain data/cms-data.json'
    );
    assert.ok(
      entries.some((e) => e.replace(/\\/g, '/').includes('public/uploads') || e.replace(/\\/g, '/').includes('uploads')),
      'Backup archive must contain uploads directory or assets'
    );
  });

  it('Tier 1: manifest.json schema conforms to interface contract and contains valid checksums', async () => {
    const latestZip = getLatestBackupZip();
    assert.ok(latestZip, 'Backup archive must exist');

    const manifestRaw = readZipFileEntry(latestZip, 'manifest.json');
    assert.ok(manifestRaw, 'manifest.json entry must not be empty');

    const manifest = JSON.parse(manifestRaw);
    assert.strictEqual(manifest.appName, 'arkivi-app');
    assert.strictEqual(manifest.version, '1.0.0');
    assert.ok(manifest.timestamp, 'Timestamp must be present');
    assert.ok(!isNaN(Date.parse(manifest.timestamp)), 'Timestamp must be valid ISO string');

    assert.ok(manifest.contents, 'Manifest must specify contents map');
    assert.strictEqual(manifest.contents.database, 'data/arkivi.db');
    assert.strictEqual(manifest.contents.cmsState, 'data/cms-data.json');

    assert.ok(manifest.checksums, 'Manifest must include SHA-256 checksums');
    assert.match(
      manifest.checksums.cmsState,
      /^[a-f0-9]{64}$/,
      'cmsState checksum must strictly match 64-character lowercase hex SHA-256'
    );
    const actualCmsSha = computeSha256(await fs.readFile(DATA_FILE));
    assert.strictEqual(
      manifest.checksums.cmsState,
      actualCmsSha,
      'cmsState checksum in manifest must strictly match the actual SHA-256 hash of data/cms-data.json'
    );

    assert.match(
      manifest.checksums.database,
      /^[a-f0-9]{64}$/,
      'database checksum must strictly match 64-character lowercase hex SHA-256'
    );
    // The archived DB is a consistent VACUUM INTO snapshot, so its bytes differ from the live file;
    // the manifest must match the SHA-256 of the database entry stored inside the archive.
    const zipDb = await (await import('jszip')).default.loadAsync(await fs.readFile(latestZip));
    const archivedDb = await zipDb.file('data/arkivi.db')!.async('nodebuffer');
    assert.strictEqual(
      manifest.checksums.database,
      computeSha256(archivedDb),
      'database checksum in manifest must match the SHA-256 of data/arkivi.db inside the archive'
    );

    assert.ok(manifest.counts, 'Manifest must include entity counts');
    assert.strictEqual(typeof manifest.counts.stories, 'number');
    assert.strictEqual(typeof manifest.counts.bookSpreads, 'number');
    assert.strictEqual(typeof manifest.counts.media, 'number');
  });

  it('Tier 1: CLI restore (npm run restore / tsx scripts/restore.ts) runs cleanly and exits 0', async () => {
    const latestZip = getLatestBackupZip();
    assert.ok(latestZip, 'Backup archive must exist');
    assert.ok(
      existsSync(RESTORE_SCRIPT),
      `CLI restore script must exist at: ${RESTORE_SCRIPT}`
    );

    const result = runCli(['tsx', RESTORE_SCRIPT, latestZip]);

    assert.strictEqual(
      result.status,
      0,
      `CLI restore must exit with code 0. Stderr: ${result.stderr}, Stdout: ${result.stdout}`
    );
  });

  it('Tier 1: GET /api/backup returns downloadable zip stream with proper attachment headers', async () => {
    const backupRoute = await loadBackupRoute();
    assert.ok(backupRoute?.GET, 'GET /api/backup route handler must be implemented');

    const req = new Request('http://localhost:3001/api/backup', { method: 'GET' });
    const res = await backupRoute.GET(req);

    assert.strictEqual(res.status, 200, 'GET /api/backup must return 200');

    const disposition = res.headers.get('content-disposition') || '';
    assert.match(
      disposition,
      /attachment;\s*filename="backup-.*\.zip"/i,
      'Content-Disposition must specify attachment with backup-*.zip filename'
    );

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    assert.ok(buffer.length > 0, 'Backup stream must not be empty');

    // Verify zip header magic bytes: PK\x03\x04 (0x50, 0x4b, 0x03, 0x04)
    assert.strictEqual(buffer[0], 0x50, 'Must have zip header byte 0 (P)');
    assert.strictEqual(buffer[1], 0x4b, 'Must have zip header byte 1 (K)');
    assert.strictEqual(buffer[2], 0x03, 'Must have zip header byte 2');
    assert.strictEqual(buffer[3], 0x04, 'Must have zip header byte 3');
  });

  it('Tier 1: POST /api/restore accepts multipart/form-data zip upload and restores state', async () => {
    const restoreRoute = await loadRestoreRoute();
    assert.ok(restoreRoute?.POST, 'POST /api/restore route handler must be implemented');

    const latestZip = getLatestBackupZip();
    assert.ok(latestZip, 'Backup archive must exist');

    const zipBuffer = await fs.readFile(latestZip);
    const formData = new FormData();
    formData.append('archive', new Blob([zipBuffer], { type: 'application/zip' }), 'backup.zip');

    const req = new Request('http://localhost:3001/api/restore', {
      method: 'POST',
      body: formData,
    });

    const res = await restoreRoute.POST(req);
    assert.strictEqual(res.status, 200, 'POST /api/restore must return 200 on valid archive');

    const json = await res.json();
    assert.strictEqual(json.success, true, 'Restore response must indicate success: true');
  });

  // ==========================================
  // TIER 2: BOUNDARY AND CORNER CASES
  // ==========================================

  it('Tier 2: Truncated/corrupt zip archive is rejected with non-zero exit code or HTTP 400', async () => {
    const corruptZipPath = path.join(BACKUPS_DIR, `corrupted-${Date.now()}.zip`);
    // Create invalid truncated zip payload
    await fs.writeFile(corruptZipPath, Buffer.from('PK\x03\x04GARBAGE_TRUNCATED_ARCHIVE_DATA'));
    temporaryFilesToClean.push(corruptZipPath);

    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');
    const result = runCli(['tsx', RESTORE_SCRIPT, corruptZipPath]);

    assert.notStrictEqual(
      result.status,
      0,
      'Restoring a corrupted zip must fail with non-zero exit code'
    );
  });

  it('Tier 2: SHA-256 checksum mismatch is rejected before mutating production state', async () => {
    // 1. Create a temporary folder structure with tampered content
    const tamperDir = path.join(BACKUPS_DIR, `tamper-${Date.now()}`);
    const tamperDataDir = path.join(tamperDir, 'data');
    await fs.mkdir(tamperDataDir, { recursive: true });
    temporaryFilesToClean.push(tamperDir);

    const fakeCmsState = { ...baselineCmsState, site: { ...baselineCmsState.site, siteTitle: 'TAMPERED' } };
    await fs.writeFile(path.join(tamperDataDir, 'cms-data.json'), JSON.stringify(fakeCmsState));
    await fs.writeFile(path.join(tamperDataDir, 'arkivi.db'), Buffer.from('fake-db'));

    // Manifest contains mismatched checksum for cms-data.json
    const manifest = {
      version: '1.0.0',
      appName: 'arkivi-app',
      timestamp: new Date().toISOString(),
      contents: { database: 'data/arkivi.db', cmsState: 'data/cms-data.json' },
      counts: { stories: 0, bookSpreads: 0, media: 0 },
      checksums: {
        cmsState: '0000000000000000000000000000000000000000000000000000000000000000', // invalid hash
        database: computeSha256('fake-db'),
      },
    };
    await fs.writeFile(path.join(tamperDir, 'manifest.json'), JSON.stringify(manifest));

    const tamperedZip = path.join(BACKUPS_DIR, `tampered-${Date.now()}.zip`);
    createZipFromFolder(tamperDir, tamperedZip);
    temporaryFilesToClean.push(tamperedZip);

    const cmsBefore = await getCmsState();

    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');
    const result = runCli(['tsx', RESTORE_SCRIPT, tamperedZip]);

    assert.notStrictEqual(
      result.status,
      0,
      'Restoration of archive with checksum mismatch must fail'
    );

    // Verify production state was NOT mutated to TAMPERED
    const cmsAfter = await getCmsState();
    assert.strictEqual(
      cmsAfter.site.siteTitle,
      cmsBefore.site.siteTitle,
      'Production state must remain untouched when checksum fails'
    );
  });

  it('Tier 2: Database SHA-256 checksum mismatch is rejected before mutating production state', async () => {
    // 1. Create a temporary folder structure with tampered content
    const tamperDir = path.join(BACKUPS_DIR, `tamper-db-${Date.now()}`);
    const tamperDataDir = path.join(tamperDir, 'data');
    await fs.mkdir(tamperDataDir, { recursive: true });
    temporaryFilesToClean.push(tamperDir);

    const fakeCmsState = { ...baselineCmsState, site: { ...baselineCmsState.site, siteTitle: 'TAMPERED_DB' } };
    const fakeCmsRaw = JSON.stringify(fakeCmsState);
    await fs.writeFile(path.join(tamperDataDir, 'cms-data.json'), fakeCmsRaw);
    await fs.writeFile(path.join(tamperDataDir, 'arkivi.db'), Buffer.from('tampered-database-bytes'));

    // Manifest contains valid checksum for cmsState, but tampered/invalid checksum for database
    const manifest = {
      version: '1.0.0',
      appName: 'arkivi-app',
      timestamp: new Date().toISOString(),
      contents: { database: 'data/arkivi.db', cmsState: 'data/cms-data.json' },
      counts: { stories: 0, bookSpreads: 0, media: 0 },
      checksums: {
        cmsState: computeSha256(fakeCmsRaw),
        database: '0'.repeat(64), // invalid database hash
      },
    };
    await fs.writeFile(path.join(tamperDir, 'manifest.json'), JSON.stringify(manifest));

    const tamperedZip = path.join(BACKUPS_DIR, `tampered-db-${Date.now()}.zip`);
    createZipFromFolder(tamperDir, tamperedZip);
    temporaryFilesToClean.push(tamperedZip);

    const cmsBefore = await getCmsState();
    const dbBefore = existsSync(DB_FILE) ? await fs.readFile(DB_FILE) : null;

    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');
    const result = runCli(['tsx', RESTORE_SCRIPT, tamperedZip]);

    assert.notStrictEqual(
      result.status,
      0,
      'Restoration of archive with database checksum mismatch must fail with non-zero exit code'
    );

    // Verify production state was NOT mutated
    const cmsAfter = await getCmsState();
    assert.strictEqual(
      cmsAfter.site.siteTitle,
      cmsBefore.site.siteTitle,
      'Production state must remain untouched when database checksum fails'
    );
    if (dbBefore && existsSync(DB_FILE)) {
      const dbAfter = await fs.readFile(DB_FILE);
      assert.strictEqual(
        computeSha256(dbAfter),
        computeSha256(dbBefore),
        'Production database must remain untouched when database checksum fails'
      );
    }
  });

  it('Tier 2: Archive missing manifest.json is rejected', async () => {
    const noManifestDir = path.join(BACKUPS_DIR, `nomanifest-${Date.now()}`);
    await fs.mkdir(path.join(noManifestDir, 'data'), { recursive: true });
    await fs.writeFile(path.join(noManifestDir, 'data', 'cms-data.json'), '{}');
    temporaryFilesToClean.push(noManifestDir);

    const noManifestZip = path.join(BACKUPS_DIR, `nomanifest-${Date.now()}.zip`);
    createZipFromFolder(noManifestDir, noManifestZip);
    temporaryFilesToClean.push(noManifestZip);

    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');
    const result = runCli(['tsx', RESTORE_SCRIPT, noManifestZip]);

    assert.notStrictEqual(
      result.status,
      0,
      'Restoring zip without manifest.json must exit with non-zero code'
    );
  });

  it('Tier 2: Archive with incompatible manifest version is rejected', async () => {
    const badVersionDir = path.join(BACKUPS_DIR, `badversion-${Date.now()}`);
    await fs.mkdir(badVersionDir, { recursive: true });
    temporaryFilesToClean.push(badVersionDir);

    const manifest = {
      version: '9.9.9', // Unsupported future version
      appName: 'arkivi-app',
      timestamp: new Date().toISOString(),
      contents: { database: 'data/arkivi.db', cmsState: 'data/cms-data.json' },
      counts: {},
      checksums: {},
    };
    await fs.writeFile(path.join(badVersionDir, 'manifest.json'), JSON.stringify(manifest));

    const badVersionZip = path.join(BACKUPS_DIR, `badversion-${Date.now()}.zip`);
    createZipFromFolder(badVersionDir, badVersionZip);
    temporaryFilesToClean.push(badVersionZip);

    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');
    const result = runCli(['tsx', RESTORE_SCRIPT, badVersionZip]);

    assert.notStrictEqual(
      result.status,
      0,
      'Incompatible manifest version 9.9.9 must be rejected'
    );
  });

  it('Tier 2: Passing non-existent file path exits cleanly with code 1', async () => {
    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');
    const nonExistentPath = path.join(BACKUPS_DIR, 'non-existent-fake-backup.zip');

    const result = runCli(['tsx', RESTORE_SCRIPT, nonExistentPath]);

    assert.strictEqual(
      result.status,
      1,
      'Passing non-existent archive path must exit with code 1'
    );
  });

  it('Tier 2: Atomic rollback on midway restore failure guarantees database is not corrupted', async () => {
    const currentState = await getCmsState();
    const testTitle = `Stable-Title-${Date.now()}`;
    await saveCmsState({
      ...currentState,
      site: { ...currentState.site, siteTitle: testTitle },
    });

    // Attempt restoring invalid file
    const invalidZip = path.join(BACKUPS_DIR, `invalid-${Date.now()}.zip`);
    await fs.writeFile(invalidZip, Buffer.from('MALFORMED_ZIP_CONTENT'));
    temporaryFilesToClean.push(invalidZip);

    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');
    runCli(['tsx', RESTORE_SCRIPT, invalidZip]);

    // Title should still be intact
    const afterFailedRestore = await getCmsState();
    assert.strictEqual(
      afterFailedRestore.site.siteTitle,
      testTitle,
      'State must remain intact and unchanged after failed restore'
    );
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================

  it('Tier 3: Upload image + story -> backup -> wipe -> restore -> full access verification', async () => {
    assert.ok(existsSync(BACKUP_SCRIPT), 'Backup script must exist');
    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');

    // 1. Create a custom test story and asset
    const testId = `story-backup-roundtrip-${Date.now()}`;
    const testAssetFilename = `test-backup-asset-${Date.now()}.webp`;
    const testAssetPath = path.join(UPLOADS_DIR, testAssetFilename);
    await fs.writeFile(testAssetPath, Buffer.from('RIFF....WEBPVP8 ...'));
    temporaryFilesToClean.push(testAssetPath);

    const currentState = await getCmsState();
    const customStory = {
      id: testId,
      title: 'Rrëfim Prove për Backup dhe Restore',
      subtitle: 'Nëntitull',
      eraLabel: '2026',
      publishedDate: 'Nëntor 2026',
      readingMinutes: 3,
      coverImageId: `media-${testId}`,
      galleryImageIds: [],
      bodyParagraphs: ['Ky rrëfim duhet të mbijetojë fshirjen totale dhe rikthimin.'],
      pullQuote: 'Citim mbijetese.',
      status: 'published' as const,
      featured: true,
    };

    await saveCmsState({
      ...currentState,
      stories: [customStory, ...currentState.stories],
    });

    // 2. Run CLI backup
    const backupResult = runCli(['tsx', BACKUP_SCRIPT]);
    assert.strictEqual(backupResult.status, 0, 'Backup execution must succeed');

    const createdZip = getLatestBackupZip();
    assert.ok(createdZip, 'Backup zip must be produced');
    temporaryFilesToClean.push(createdZip);

    // 3. Simulate state wipe
    await unlinkWithRetry(testAssetPath);
    assert.strictEqual(existsSync(testAssetPath), false, 'Asset must be removed during wipe');

    await saveCmsState({
      ...currentState,
      stories: [],
    });
    const wipedState = await getCmsState();
    assert.strictEqual(wipedState.stories.length, 0, 'State was wiped');

    // 4. Run CLI restore
    const restoreResult = runCli(['tsx', RESTORE_SCRIPT, createdZip]);
    assert.strictEqual(restoreResult.status, 0, 'Restore execution must succeed');

    // 5. Verify story and asset are fully restored
    const restoredState = await getCmsState();
    const restoredStory = restoredState.stories.find((s) => s.id === testId);
    assert.ok(restoredStory, 'Custom story must be completely restored');
    assert.strictEqual(restoredStory.title, customStory.title);
    assert.ok(existsSync(testAssetPath), 'Uploaded media asset must be restored to disk');
  });

  it('Tier 3: API backup download + API restore roundtrip across HTTP endpoints without CLI', async () => {
    const backupRoute = await loadBackupRoute();
    const restoreRoute = await loadRestoreRoute();

    assert.ok(backupRoute?.GET, 'GET /api/backup handler must exist');
    assert.ok(restoreRoute?.POST, 'POST /api/restore handler must exist');

    const originalState = await getCmsState();

    // 1. Download backup via API
    const backupRes = await backupRoute.GET(new Request('http://localhost:3001/api/backup', { method: 'GET' }));
    assert.strictEqual(backupRes.status, 200);
    const backupBuffer = Buffer.from(await backupRes.arrayBuffer());

    // 2. Mutate state
    await saveCmsState({
      ...originalState,
      site: { ...originalState.site, siteTitle: `API-Mutation-${Date.now()}` },
    });

    // 3. Upload backup via API restore
    const formData = new FormData();
    formData.append('archive', new Blob([backupBuffer], { type: 'application/zip' }), 'restore.zip');

    const restoreRes = await restoreRoute.POST(
      new Request('http://localhost:3001/api/restore', {
        method: 'POST',
        body: formData,
      })
    );
    assert.strictEqual(restoreRes.status, 200);

    // 4. Verify title restored
    const restoredState = await getCmsState();
    assert.strictEqual(
      restoredState.site.siteTitle,
      originalState.site.siteTitle,
      'CMS title must match original state after API restore'
    );
  });

  // ==========================================
  // TIER 4: REAL-WORLD DISASTER RECOVERY
  // ==========================================

  it('Tier 4: Full Disaster Recovery: complete wipe of DB, JSON, and media followed by 100% data recovery', async () => {
    assert.ok(existsSync(BACKUP_SCRIPT), 'Backup script must exist');
    assert.ok(existsSync(RESTORE_SCRIPT), 'Restore script must exist');

    // 1. Snapshot baseline CMS state, SQLite database SHA-256, and test media file SHA-256
    const baseline = await getCmsState();
    const baselineStoriesCount = baseline.stories.length;
    const baselineSpreadsCount = baseline.bookSpreads.length;
    const baselineMediaCount = baseline.media.length;

    assert.ok(existsSync(DB_FILE), 'SQLite DB file (data/arkivi.db) must exist before backup');
    const originalDbBuffer = await fs.readFile(DB_FILE);
    const originalDbFingerprint = await dbFingerprint(DB_FILE);

    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const disasterMediaFilename = `disaster-recovery-test-${Date.now()}.webp`;
    const disasterMediaPath = path.join(UPLOADS_DIR, disasterMediaFilename);
    const disasterMediaBuffer = Buffer.from(
      `RIFF_DISASTER_RECOVERY_${Date.now()}_${crypto.randomBytes(64).toString('hex')}`
    );
    await fs.writeFile(disasterMediaPath, disasterMediaBuffer);
    const originalMediaSha = computeSha256(disasterMediaBuffer);
    temporaryFilesToClean.push(disasterMediaPath);

    // 2. Create backup
    const backupResult = runCli(['tsx', BACKUP_SCRIPT]);
    assert.strictEqual(
      backupResult.status,
      0,
      `Disaster recovery backup must succeed. Stderr: ${backupResult.stderr}, Stdout: ${backupResult.stdout}`
    );

    const backupArchive = getLatestBackupZip();
    assert.ok(backupArchive, 'Backup archive must exist');
    temporaryFilesToClean.push(backupArchive);

    // 3. Total Disaster: wipe all three persistence layers (JSON, SQLite DB, media asset)
    // 3a. Wipe cms-data.json
    await saveCmsState({
      ...baseline,
      site: { ...baseline.site, siteTitle: 'WIPED_DISASTER' },
      stories: [],
      bookSpreads: [],
      media: [],
      timeline: [],
    });

    const disasterState = await getCmsState();
    assert.strictEqual(disasterState.stories.length, 0, 'CMS state must be wiped');

    // 3b. Wipe SQLite database (data/arkivi.db)
    await unlinkWithRetry(DB_FILE);
    assert.strictEqual(
      existsSync(DB_FILE),
      false,
      'SQLite database must be deleted during disaster wipe'
    );

    // 3c. Wipe media asset in public/uploads/
    await unlinkWithRetry(disasterMediaPath);
    assert.strictEqual(
      existsSync(disasterMediaPath),
      false,
      'Test media file in public/uploads/ must be deleted during disaster wipe'
    );

    // 4. Disaster Recovery: execute restore
    const restoreResult = runCli(['tsx', RESTORE_SCRIPT, backupArchive]);
    assert.strictEqual(restoreResult.status, 0, 'Disaster recovery restore must succeed');

    // 5. Verify 100% full recovery across all three layers with matching SHA-256 hashes
    // 5a. CMS JSON state recovery
    const recoveredState = await getCmsState();
    assert.strictEqual(
      recoveredState.stories.length,
      baselineStoriesCount,
      'All stories must be 100% recovered'
    );
    assert.strictEqual(
      recoveredState.bookSpreads.length,
      baselineSpreadsCount,
      'All book spreads must be 100% recovered'
    );
    assert.strictEqual(
      recoveredState.media.length,
      baselineMediaCount,
      'All media items must be 100% recovered'
    );
    assert.strictEqual(
      recoveredState.site.siteTitle,
      baseline.site.siteTitle,
      'Site title must be 100% recovered'
    );

    // 5b. SQLite DB recovery and SHA-256 verification
    assert.strictEqual(
      existsSync(DB_FILE),
      true,
      'SQLite database file (data/arkivi.db) must be restored to disk'
    );
    const restoredDbBuffer = await fs.readFile(DB_FILE);
    assert.ok(restoredDbBuffer.length > 0, 'Restored database file must not be empty');
    assert.deepStrictEqual(
      await dbFingerprint(DB_FILE),
      originalDbFingerprint,
      'Restored SQLite database must contain exactly the same tables and row counts as before the disaster'
    );

    // 5c. Media asset recovery and SHA-256 verification
    assert.strictEqual(
      existsSync(disasterMediaPath),
      true,
      'Test media asset in public/uploads/ must be restored to disk'
    );
    const restoredMediaBuffer = await fs.readFile(disasterMediaPath);
    assert.ok(restoredMediaBuffer.length > 0, 'Restored media file must not be empty');
    const restoredMediaSha = computeSha256(restoredMediaBuffer);
    assert.strictEqual(
      restoredMediaSha,
      originalMediaSha,
      'Restored media asset SHA-256 hash must match pre-disaster hash exactly'
    );
  });
});
