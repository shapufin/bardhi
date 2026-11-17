import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, UPLOADS_DIR, serialized } from '@/src/lib/payloadClient';
import { verifyAdminAuth } from '@/src/lib/adminAuth';
import type { MediaAsset } from '@/src/types/cms';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAX_BINARY_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes (5MB hard limit)
const MAX_BASE64_LENGTH = Math.ceil(MAX_BINARY_SIZE * (4 / 3)) + 1024;

export async function GET() {
  try {
    const current = await getCmsState();
    return NextResponse.json({ media: current.media });
  } catch (error) {
    console.error('Gabim gjatë leximit të mediave:', error);
    return NextResponse.json({ error: 'Nuk u arrit të lexoheshin fotografitë.' }, { status: 500 });
  }
}

async function postHandler(req: Request) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Ngarkimi i fotografive kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme për ngarkimin e fotografisë.' }, { status: 400 });
    }

    const { title, caption, year, alt, dataUrl, aspectRatio } = raw as {
      title?: string;
      caption?: string;
      year?: string;
      alt?: string;
      dataUrl?: string;
      aspectRatio?: MediaAsset['aspectRatio'];
    };

    if (!dataUrl || typeof dataUrl !== 'string') {
      return NextResponse.json(
        { error: 'Ju lutemi zgjidhni një fotografi nga kompjuteri juaj.' },
        { status: 400 }
      );
    }

    // Fast pre-check on encoded base64 string length
    if (dataUrl.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB.' },
        { status: 413 }
      );
    }

    const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(dataUrl);
    if (!match) {
      return NextResponse.json(
        { error: 'Ju lutemi ngarkoni një fotografi të vlefshme (PNG, JPG, WebP).' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(match[3], 'base64');

    // Strict boundary validation on decoded binary byte length
    if (buffer.length > MAX_BINARY_SIZE) {
      return NextResponse.json(
        { error: 'Madhësia e fotografisë tejkalon kufirin maksimal të lejuar prej 5MB.' },
        { status: 413 }
      );
    }

    // Validate image format and structural integrity via sharp
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(buffer).metadata();
      if (!metadata.format) {
        throw new Error('Formati i panjohur i imazhit');
      }
    } catch {
      return NextResponse.json(
        { error: 'Skedari i ngarkuar nuk është një imazh i vlefshëm.' },
        { status: 400 }
      );
    }

    const id = `media-${Date.now()}`;
    const filename = `${id}.webp`;

    // High-compression Sharp pipeline:
    // 1. Auto-orient EXIF (.rotate())
    // 2. Resize within 2560x2560 without enlarging smaller images
    // 3. Compress to WebP (quality 82, effort 4)
    const compressedBuffer = await sharp(buffer)
      .rotate()
      .resize({
        width: 2560,
        height: 2560,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
        effort: 4,
      })
      .toBuffer();

    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOADS_DIR, filename), compressedBuffer);

    const validAspectRatios = ['3:4', '4:3', '16:9', '1:1'] as const;
    let autoAspectRatio: MediaAsset['aspectRatio'] = '4:3';
    if (metadata.width && metadata.height) {
      const ratio = metadata.width / metadata.height;
      if (ratio > 1.5) autoAspectRatio = '16:9';
      else if (ratio > 1.1) autoAspectRatio = '4:3';
      else if (ratio < 0.85) autoAspectRatio = '3:4';
      else autoAspectRatio = '1:1';
    }

    const finalAspectRatio = aspectRatio && validAspectRatios.includes(aspectRatio)
      ? aspectRatio
      : autoAspectRatio;

    const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const newAsset: MediaAsset = {
      id,
      title: clip(title, 300) || 'Fotografi Familjare',
      url: `/uploads/${filename}`,
      alt: clip(alt, 500) || clip(title, 300) || 'Fotografi arkivore familjare',
      caption: clip(caption, 2000),
      year: clip(year, 50) || String(new Date().getFullYear()),
      aspectRatio: finalAspectRatio,
      isUpload: true,
    };

    const current = await getCmsState();
    const updated = await saveCmsState({
      ...current,
      media: [newAsset, ...current.media],
    });

    return NextResponse.json({ asset: newAsset, state: updated });
  } catch (error) {
    console.error('Gabim gjatë ngarkimit të fotografisë:', error);
    return NextResponse.json({ error: 'Nuk u arrit të ruhej fotografia.' }, { status: 500 });
  }
}

export const POST = serialized(postHandler);
