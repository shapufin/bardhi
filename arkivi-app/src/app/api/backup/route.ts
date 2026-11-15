/**
 * GET /api/backup
 * Streams a fresh ZIP backup archive as a file download.
 * No auth required for GET (the archive is downloadable by admin who has access to this URL).
 * For production, place behind your auth middleware.
 */

import { NextResponse } from 'next/server';
import { DATA_FILE, UPLOADS_DIR, APP_ROOT } from '@/src/lib/payloadClient';
import fs from 'node:fs/promises';
import { existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DATA_DIR = path.join(APP_ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'arkivi.db');

function computeSha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function isoTimestamp(): string {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

export async function GET() {
  const stagingDir = path.join(APP_ROOT, 'backups', `.api-staging-${Date.now()}`);
  const archivePath = path.join(APP_ROOT, 'backups', `backup-${isoTimestamp()}.zip`);

  try {
    if (!existsSync(DATA_FILE) || !existsSync(DB_FILE)) {
      return NextResponse.json(
        { error: 'Të dhënat e nevojshme nuk u gjetën për të krijuar kopjen rezervë.' },
        { status: 500 }
      );
    }

    const stagingData = path.join(stagingDir, 'data');
    const stagingUploads = path.join(stagingDir, 'public', 'uploads');
    await fs.mkdir(stagingData, { recursive: true });
    await fs.mkdir(stagingUploads, { recursive: true });
    await fs.mkdir(path.join(APP_ROOT, 'backups'), { recursive: true });

    // Copy data files
    await fs.copyFile(DB_FILE, path.join(stagingData, 'arkivi.db'));
    await fs.copyFile(DATA_FILE, path.join(stagingData, 'cms-data.json'));

    // Copy uploads
    if (existsSync(UPLOADS_DIR)) {
      const files = readdirSync(UPLOADS_DIR).filter((f) => statSync(path.join(UPLOADS_DIR, f)).isFile());
      for (const file of files) {
        await fs.copyFile(path.join(UPLOADS_DIR, file), path.join(stagingUploads, file));
      }
    }

    // Compute checksums
    const dbBuf = readFileSync(path.join(stagingData, 'arkivi.db'));
    const cmsBuf = readFileSync(path.join(stagingData, 'cms-data.json'));
    const dbChecksum = computeSha256(dbBuf);
    const cmsChecksum = computeSha256(cmsBuf);

    // Parse CMS for counts
    let counts = { stories: 0, bookSpreads: 0, media: 0 };
    try {
      const parsed = JSON.parse(cmsBuf.toString('utf-8'));
      counts = {
        stories: Array.isArray(parsed.stories) ? parsed.stories.length : 0,
        bookSpreads: Array.isArray(parsed.bookSpreads) ? parsed.bookSpreads.length : 0,
        media: Array.isArray(parsed.media) ? parsed.media.length : 0,
      };
    } catch {}

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

    // Create ZIP via PowerShell
    const psCmd = `
      Add-Type -AssemblyName System.IO.Compression.FileSystem;
      $src = '${stagingDir.replace(/'/g, "''")}';
      $dst = '${archivePath.replace(/'/g, "''")}';
      if (Test-Path $dst) { Remove-Item $dst -Force };
      [System.IO.Compression.ZipFile]::CreateFromDirectory($src, $dst, [System.IO.Compression.CompressionLevel]::Optimal, $false);
    `;
    execFileSync('powershell', ['-NoProfile', '-Command', psCmd]);

    // Read zip into buffer and stream as download
    const zipBuffer = await fs.readFile(archivePath);
    const filename = path.basename(archivePath);

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Gabim gjatë krijimit të backup-it API:', error);
    return NextResponse.json({ error: 'Nuk u arrit të krijohej kopja rezervë.' }, { status: 500 });
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    // Keep the zip on disk for history; optionally clean old ones
  }
}
