/**
 * POST /api/restore
 * Accepts a multipart/form-data upload of a backup ZIP archive.
 * Validates checksums, then atomically restores db + cms + uploads.
 *
 * Body: FormData with field "archive" containing a .zip file.
 * Returns: { success: true, counts, timestamp } on success.
 */

import { NextResponse } from 'next/server';
import { APP_ROOT, DATA_FILE, UPLOADS_DIR } from '@/src/lib/payloadClient';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DATA_DIR = path.join(APP_ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'arkivi.db');
const SUPPORTED_VERSIONS = ['1.0.0'];

function computeSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function extractZipToDir(zipPath: string, destDir: string): void {
  const psCmd = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem;
    $src = '${zipPath.replace(/'/g, "''")}';
    $dst = '${destDir.replace(/'/g, "''")}';
    if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null };
    [System.IO.Compression.ZipFile]::ExtractToDirectory($src, $dst);
  `;
  execFileSync('powershell', ['-NoProfile', '-Command', psCmd]);
}

export async function POST(req: Request) {
  const tmpBase = path.join(APP_ROOT, 'backups', `.restore-api-${Date.now()}`);
  const tmpZip = `${tmpBase}.zip`;
  const stagingDir = `${tmpBase}-extracted`;
  const rollbackDir = `${tmpBase}-rollback`;

  try {
    // 1. Parse multipart form
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Kërkesa duhet të jetë multipart/form-data.' }, { status: 400 });
    }

    const archiveBlob = formData.get('archive') as File | null;
    if (!archiveBlob) {
      return NextResponse.json({ error: 'Ju lutemi ngarkoni arkivin ZIP (fusha "archive").' }, { status: 400 });
    }

    // 2. Write zip to temp file
    await fs.mkdir(path.join(APP_ROOT, 'backups'), { recursive: true });
    const zipBuffer = Buffer.from(await archiveBlob.arrayBuffer());

    // Validate zip magic bytes: PK\x03\x04
    if (zipBuffer.length < 4 || zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b || zipBuffer[2] !== 0x03 || zipBuffer[3] !== 0x04) {
      return NextResponse.json({ error: 'Skedari i ngarkuar nuk është një arkiv ZIP i vlefshëm.' }, { status: 400 });
    }

    await fs.writeFile(tmpZip, zipBuffer);

    // 3. Extract
    try {
      extractZipToDir(tmpZip, stagingDir);
    } catch {
      return NextResponse.json({ error: 'Arkivi ZIP është i dëmtuar ose i pavlefshëm.' }, { status: 400 });
    }

    // 4. Validate manifest
    const manifestPath = path.join(stagingDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      return NextResponse.json({ error: 'manifest.json mungon në arkiv.' }, { status: 400 });
    }

    let manifest: {
      appName: string;
      version: string;
      timestamp: string;
      contents: { database: string; cmsState: string; uploads?: string };
      checksums: { database: string; cmsState: string };
      counts: { stories: number; bookSpreads: number; media: number };
    };
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: 'manifest.json nuk mund të lexohet.' }, { status: 400 });
    }

    if (!SUPPORTED_VERSIONS.includes(manifest.version)) {
      return NextResponse.json(
        { error: `Versioni i arkivit "${manifest.version}" nuk mbështetet.` },
        { status: 400 }
      );
    }

    // 5. SHA-256 verification
    const stagedDb = path.join(stagingDir, manifest.contents.database);
    const stagedCms = path.join(stagingDir, manifest.contents.cmsState);

    if (!existsSync(stagedDb)) {
      return NextResponse.json({ error: 'Baza e të dhënave (arkivi.db) mungon në arkiv.' }, { status: 400 });
    }
    if (!existsSync(stagedCms)) {
      return NextResponse.json({ error: 'cms-data.json mungon në arkiv.' }, { status: 400 });
    }

    const actualDbHash = computeSha256(readFileSync(stagedDb));
    if (actualDbHash !== manifest.checksums.database) {
      return NextResponse.json(
        { error: 'Kontrolli i integritetit SHA-256 i bazës së të dhënave dështoi. Arkivi mund të jetë i modifikuar.' },
        { status: 400 }
      );
    }

    const actualCmsHash = computeSha256(readFileSync(stagedCms));
    if (actualCmsHash !== manifest.checksums.cmsState) {
      return NextResponse.json(
        { error: 'Kontrolli i integritetit SHA-256 i cms-data.json dështoi. Arkivi mund të jetë i modifikuar.' },
        { status: 400 }
      );
    }

    // 6. Rollback snapshot of current state
    await fs.mkdir(rollbackDir, { recursive: true });
    if (existsSync(DB_FILE)) await fs.copyFile(DB_FILE, path.join(rollbackDir, 'arkivi.db'));
    if (existsSync(DATA_FILE)) await fs.copyFile(DATA_FILE, path.join(rollbackDir, 'cms-data.json'));

    // 7. Atomic restore
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.mkdir(UPLOADS_DIR, { recursive: true });

      await fs.copyFile(stagedDb, DB_FILE);
      await fs.copyFile(stagedCms, DATA_FILE);

      // Restore uploads
      const stagedUploads = path.join(stagingDir, 'public', 'uploads');
      if (existsSync(stagedUploads)) {
        const uploadFiles = await fs.readdir(stagedUploads);
        for (const file of uploadFiles) {
          const src = path.join(stagedUploads, file);
          if ((await fs.stat(src)).isFile()) {
            await fs.copyFile(src, path.join(UPLOADS_DIR, file));
          }
        }
      }

      // Cleanup rollback on success
      await fs.rm(rollbackDir, { recursive: true, force: true }).catch(() => {});

      return NextResponse.json({
        success: true,
        timestamp: manifest.timestamp,
        counts: manifest.counts,
        message: 'Të dhënat u rikthyen me sukses nga kopja rezervë.',
      });

    } catch (err) {
      // Rollback on error
      try {
        const rbDb = path.join(rollbackDir, 'arkivi.db');
        const rbCms = path.join(rollbackDir, 'cms-data.json');
        if (existsSync(rbDb)) await fs.copyFile(rbDb, DB_FILE);
        if (existsSync(rbCms)) await fs.copyFile(rbCms, DATA_FILE);
      } catch {}
      await fs.rm(rollbackDir, { recursive: true, force: true }).catch(() => {});
      console.error('Gabim gjatë rivendosjes API:', err);
      return NextResponse.json({ error: 'Rivendosja dështoi. Gjendja e mëparshme u rikthye.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Gabim i papritur /api/restore:', error);
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit gjatë rivendosjes.' }, { status: 500 });
  } finally {
    await fs.unlink(tmpZip).catch(() => {});
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
  }
}
