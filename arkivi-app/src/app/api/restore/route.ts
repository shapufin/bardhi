/**
 * POST /api/restore
 * Accepts a multipart/form-data upload of a backup ZIP archive.
 * Requires admin auth (x-admin-token / Bearer). Validates manifest +
 * SHA-256 checksums, then atomically restores db + cms + uploads.
 *
 * Body: FormData with field "archive" containing a .zip file.
 * Returns: { success: true, timestamp, counts, message } on success.
 */

import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/src/lib/adminAuth';
import { restoreFromArchiveBuffer, BackupError, MAX_ARCHIVE_BYTES } from '@/src/lib/backupArchive';

export async function POST(req: Request) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Rivendosja e të dhënave kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
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

    if (archiveBlob.size > MAX_ARCHIVE_BYTES) {
      return NextResponse.json(
        { error: 'Arkivi ZIP tejkalon madhësinë maksimale të lejuar.' },
        { status: 413 }
      );
    }

    const zipBuffer = Buffer.from(await archiveBlob.arrayBuffer());
    const manifest = await restoreFromArchiveBuffer(zipBuffer);

    // The running Payload/libsql connection still points at the pre-restore file. In production
    // (Docker `restart: unless-stopped`) exit shortly after responding so it reopens the restored DB.
    if (process.env.NODE_ENV === 'production') setTimeout(() => process.exit(0), 1500);

    return NextResponse.json({
      success: true,
      timestamp: manifest.timestamp,
      counts: manifest.counts,
      message: 'Të dhënat u rikthyen me sukses nga kopja rezervë.',
    });
  } catch (error) {
    if (error instanceof BackupError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Gabim i papritur /api/restore:', error);
    return NextResponse.json({ error: 'Gabim i brendshëm i serverit gjatë rivendosjes.' }, { status: 500 });
  }
}
