/**
 * GET /api/backup
 * Streams a fresh ZIP backup archive as a file download.
 * Requires admin auth (x-admin-token / Bearer) — the archive contains the
 * full database including credential hashes and must never be public.
 */

import { NextResponse } from 'next/server';
import { verifyAdminAuthAsync } from '@/src/lib/adminAuth';
import { createBackupArchive, BackupError } from '@/src/lib/backupArchive';

export async function GET(req: Request) {
  const auth = await verifyAdminAuthAsync(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Shkarkimi i kopjes rezervë kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const { buffer, filename } = await createBackupArchive();

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof BackupError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('Gabim gjatë krijimit të backup-it API:', error);
    return NextResponse.json({ error: 'Nuk u arrit të krijohej kopja rezervë.' }, { status: 500 });
  }
}
