import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState } from '@/src/lib/payloadClient';
import type { MediaAsset } from '@/src/types/cms';
import fs from 'node:fs/promises';
import path from 'node:path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: Request) {
  try {
    const current = await getCmsState();
    const { title, caption, year, alt, dataUrl, aspectRatio } = (await req.json()) as {
      title: string;
      caption?: string;
      year?: string;
      alt?: string;
      dataUrl: string;
      aspectRatio?: MediaAsset['aspectRatio'];
    };

    const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(dataUrl || '');
    if (!match) {
      return NextResponse.json(
        { error: 'Ju lutemi ngarkoni nje fotografi te vlefshme PNG, JPG ose WebP.' },
        { status: 400 }
      );
    }

    const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
    const buffer = Buffer.from(match[3], 'base64');
    const id = `media-${Date.now()}`;
    const filename = `${id}.${ext}`;
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

    const newAsset: MediaAsset = {
      id,
      title: title?.trim() || 'Fotografi Familjare',
      url: `/uploads/${filename}`,
      alt: alt?.trim() || title?.trim() || 'Fotografi arkivore familjare',
      caption: caption?.trim() || '',
      year: year?.trim() || String(new Date().getFullYear()),
      aspectRatio: aspectRatio || '4:3',
      isUpload: true,
    };

    const updated = await saveCmsState({
      ...current,
      media: [newAsset, ...current.media],
    });
    return NextResponse.json({ asset: newAsset, state: updated });
  } catch (error) {
    console.error('Gabim gjate ngarkimit te fotografise:', error);
    return NextResponse.json({ error: 'Nuk u arrit te ruhej fotografia.' }, { status: 500 });
  }
}
