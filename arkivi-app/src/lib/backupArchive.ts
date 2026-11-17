/**
 * Zero-loss backup & restore archive engine (portable — no PowerShell dependency).
 *
 * Archive layout (ZIP):
 *   manifest.json
 *   data/arkivi.db
 *   data/cms-data.json
 *   public/uploads/<file>...
 *
 * Used by both the HTTP routes (/api/backup, /api/restore) and the CLI
 * scripts (scripts/backup.ts, scripts/restore.ts) so behaviour is identical
 * on Windows dev machines and Linux production containers.
 */

import JSZip from 'jszip';
import os from 'node:os';
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { APP_ROOT, DATA_DIR, DATA_FILE, UPLOADS_DIR, ensureStorage } from '@/src/lib/payloadClient';

export const BACKUP_APP_NAME = 'arkivi-app';
export const BACKUP_VERSION = '1.0.0';
export const SUPPORTED_BACKUP_VERSIONS = ['1.0.0'];

/** Hard cap for a compressed archive accepted by restore (guards memory/disk). */
export const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024; // 200MB
/** Per-file cap on decompressed content pulled out of an archive. */
const MAX_ENTRY_BYTES = 100 * 1024 * 1024; // 100MB
/** Sanity cap on number of upload files restored in one archive. */
const MAX_UPLOAD_FILES = 5000;

const DB_FILE = path.join(DATA_DIR, 'arkivi.db');

export interface BackupManifest {
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

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

function computeSha256(buf: Buffer | Uint8Array): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function isoTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

/** Normalizes a zip-internal path; rejects traversal. Returns null when unsafe. */
function safeEntryPath(p: string): string | null {
  const normalized = p.replace(/\\/g, '/');
  if (normalized.includes('..') || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
    return null;
  }
  return normalized;
}

/**
 * Consistent copy of a SQLite file via VACUUM INTO (includes data still sitting in the WAL,
 * safe while Payload holds the DB open). Falls back to a raw read if VACUUM is unavailable.
 */
export async function snapshotDatabase(dbFile: string): Promise<Buffer> {
  const tmp = path.join(os.tmpdir(), `arkivi-snapshot-${process.pid}-${Date.now()}.db`);
  const client = createClient({ url: `file:${dbFile.split(path.sep).join('/')}` });
  try {
    await client.execute(`VACUUM INTO '${tmp.split(path.sep).join('/').replace(/'/g, "''")}'`);
    return await fs.readFile(tmp);
  } catch {
    return await fs.readFile(dbFile);
  } finally {
    client.close();
    await fs.rm(tmp, { force: true }).catch(() => {});
  }
}

/** Removes stale WAL/SHM sidecar files so a restored DB is never mixed with old journal data. */
async function removeDbSidecars(dbFile: string): Promise<void> {
  for (const ext of ['-wal', '-shm', '-journal']) await fs.rm(dbFile + ext, { force: true }).catch(() => {});
}

export async function createBackupArchive(): Promise<{ buffer: Buffer; filename: string; manifest: BackupManifest }> {
  await ensureStorage();
  if (!existsSync(DATA_FILE) || !existsSync(DB_FILE)) {
    throw new BackupError('Të dhënat e nevojshme nuk u gjetën për të krijuar kopjen rezervë.');
  }

  const dbBuf = await snapshotDatabase(DB_FILE);
  const cmsBuf = await fs.readFile(DATA_FILE);

  let counts = { stories: 0, bookSpreads: 0, media: 0 };
  try {
    const parsed = JSON.parse(cmsBuf.toString('utf-8'));
    counts = {
      stories: Array.isArray(parsed.stories) ? parsed.stories.length : 0,
      bookSpreads: Array.isArray(parsed.bookSpreads) ? parsed.bookSpreads.length : 0,
      media: Array.isArray(parsed.media) ? parsed.media.length : 0,
    };
  } catch {
    // counts stay zero — manifest still records checksums
  }

  const manifest: BackupManifest = {
    appName: BACKUP_APP_NAME,
    version: BACKUP_VERSION,
    timestamp: new Date().toISOString(),
    contents: {
      database: 'data/arkivi.db',
      cmsState: 'data/cms-data.json',
      uploads: 'public/uploads/',
    },
    checksums: {
      database: computeSha256(dbBuf),
      cmsState: computeSha256(cmsBuf),
    },
    counts,
  };

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('data/arkivi.db', dbBuf);
  zip.file('data/cms-data.json', cmsBuf);

  if (existsSync(UPLOADS_DIR)) {
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const buf = await fs.readFile(path.join(UPLOADS_DIR, entry.name));
      zip.file(`public/uploads/${entry.name}`, buf);
    }
  }

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { buffer, filename: `backup-${isoTimestamp()}.zip`, manifest };
}

async function readEntry(zip: JSZip, name: string): Promise<Buffer> {
  const file = zip.file(name);
  if (!file) throw new BackupError(`Arkivi nuk përmban skedarin e nevojshëm: ${name}`);
  const data = await file.async('nodebuffer');
  if (data.length > MAX_ENTRY_BYTES) {
    throw new BackupError(`Skedari ${name} tejkalon madhësinë e lejuar.`);
  }
  return data;
}

/**
 * Restores a backup archive buffer into the live data directories.
 * Verifies manifest + SHA-256 checksums BEFORE mutating anything, keeps a
 * rollback snapshot, and restores it automatically on failure.
 */
export async function restoreFromArchiveBuffer(zipBuffer: Buffer): Promise<BackupManifest> {
  if (zipBuffer.length < 4 || zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b) {
    throw new BackupError('Skedari i ngarkuar nuk është një arkiv ZIP i vlefshëm.');
  }
  if (zipBuffer.length > MAX_ARCHIVE_BYTES) {
    throw new BackupError('Arkivi ZIP tejkalon madhësinë maksimale të lejuar.');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    throw new BackupError('Arkivi ZIP është i dëmtuar ose i pavlefshëm.');
  }

  // 1. Manifest
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    throw new BackupError('manifest.json mungon në arkiv.');
  }
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(await manifestFile.async('string')) as BackupManifest;
  } catch {
    throw new BackupError('manifest.json nuk mund të lexohet.');
  }

  if (!SUPPORTED_BACKUP_VERSIONS.includes(manifest.version)) {
    throw new BackupError(`Versioni i arkivit "${manifest.version}" nuk mbështetet.`);
  }
  if (manifest.appName !== BACKUP_APP_NAME) {
    throw new BackupError('Ky arkiv nuk i përket këtij aplikacioni.');
  }

  // 2. Resolve + validate payload paths (must stay inside data/ and public/uploads/)
  const dbEntry = safeEntryPath(manifest.contents?.database || '');
  const cmsEntry = safeEntryPath(manifest.contents?.cmsState || '');
  if (!dbEntry || !dbEntry.startsWith('data/') || !cmsEntry || !cmsEntry.startsWith('data/')) {
    throw new BackupError('manifest.json përmban rrugë të pavlefshme për skedarët e të dhënave.');
  }

  const dbBuf = await readEntry(zip, dbEntry);
  const cmsBuf = await readEntry(zip, cmsEntry);

  // 3. SHA-256 verification before any mutation
  if (computeSha256(dbBuf) !== manifest.checksums?.database) {
    throw new BackupError('Kontrolli i integritetit SHA-256 i bazës së të dhënave dështoi. Arkivi mund të jetë i modifikuar.');
  }
  if (computeSha256(cmsBuf) !== manifest.checksums?.cmsState) {
    throw new BackupError('Kontrolli i integritetit SHA-256 i cms-data.json dështoi. Arkivi mund të jetë i modifikuar.');
  }

  // 4. Collect upload entries (flat files only, basename sanitised)
  const uploadEntries: { name: string; file: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    const safe = safeEntryPath(relativePath);
    if (safe && safe.startsWith('public/uploads/')) {
      uploadEntries.push({ name: path.basename(safe), file });
    }
  });
  if (uploadEntries.length > MAX_UPLOAD_FILES) {
    throw new BackupError('Arkivi përmban shumë skedarë ngarkimi.');
  }

  // 5. Rollback snapshot of current state
  const rollbackDir = path.join(DATA_DIR, `.rollback-${Date.now()}`);
  await fs.mkdir(rollbackDir, { recursive: true });
  if (existsSync(DB_FILE)) await fs.copyFile(DB_FILE, path.join(rollbackDir, 'arkivi.db'));
  if (existsSync(DATA_FILE)) await fs.copyFile(DATA_FILE, path.join(rollbackDir, 'cms-data.json'));

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    await removeDbSidecars(DB_FILE);
    await fs.writeFile(DB_FILE, dbBuf);
    await fs.writeFile(DATA_FILE, cmsBuf);

    for (const { name, file } of uploadEntries) {
      if (!name || name === '.' || name === '..') continue;
      const data = await file.async('nodebuffer');
      if (data.length > MAX_ENTRY_BYTES) {
        throw new BackupError(`Skedari ${name} tejkalon madhësinë e lejuar.`);
      }
      await fs.writeFile(path.join(UPLOADS_DIR, name), data);
    }

    await fs.rm(rollbackDir, { recursive: true, force: true }).catch(() => {});
    return manifest;
  } catch (err) {
    try {
      const rbDb = path.join(rollbackDir, 'arkivi.db');
      const rbCms = path.join(rollbackDir, 'cms-data.json');
      await removeDbSidecars(DB_FILE);
      if (existsSync(rbDb)) await fs.copyFile(rbDb, DB_FILE);
      if (existsSync(rbCms)) await fs.copyFile(rbCms, DATA_FILE);
    } catch {}
    await fs.rm(rollbackDir, { recursive: true, force: true }).catch(() => {});
    if (err instanceof BackupError) throw err;
    throw new BackupError('Rivendosja dështoi. Gjendja e mëparshme u rikthye.');
  }
}

/** Convenience wrapper for the CLI: restore directly from a zip file path. */
export async function restoreFromArchiveFile(archivePath: string): Promise<BackupManifest> {
  const buf = await fs.readFile(archivePath);
  return restoreFromArchiveBuffer(buf);
}

export { APP_ROOT };
