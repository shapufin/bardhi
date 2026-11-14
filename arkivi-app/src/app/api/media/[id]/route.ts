import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { MediaAsset } from '@/src/types/cms';
import fs from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const current = await getCmsState();
    const patch = (await req.json()) as Partial<MediaAsset>;
    const updated = await saveCmsState({
      ...current,
      media: current.media.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate perditesimit te fotografise:', error);
    return NextResponse.json({ error: 'Nuk u perditesuan te dhenat e fotografise.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const current = await getCmsState();
    const target = current.media.find((m) => m.id === id);
    if (target?.isUpload && target.url.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(target.url));
      await fs.unlink(filePath).catch(() => undefined);
    }
    const updated = await saveCmsState({
      ...current,
      media: current.media.filter((m) => m.id !== id),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate fshirjes se fotografise:', error);
    return NextResponse.json({ error: 'Nuk u fshi fotografia.' }, { status: 500 });
  }
}
