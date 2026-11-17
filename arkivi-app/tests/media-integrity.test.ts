import './with-auth';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getCmsState, saveCmsState, UPLOADS_DIR } from '../src/lib/payloadClient';
import { POST } from '../src/app/api/media/route';
import { DELETE } from '../src/app/api/media/[id]/route';

async function png() {
  const buf = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#888' } }).png().toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}
const upload = async (dataUrl: string) =>
  POST(new Request('http://localhost/api/media', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'probe', dataUrl }),
  }));

test('F-18: uploads in the same millisecond get unique ids and distinct files', async () => {
  const original = await getCmsState();
  const realNow = Date.now;
  Date.now = () => 1_700_000_000_000; // freeze the clock: old ids (`media-${Date.now()}`) would collide
  try {
    const dataUrl = await png();
    const a = (await (await upload(dataUrl)).json()) as { asset: { id: string; url: string } };
    const b = (await (await upload(dataUrl)).json()) as { asset: { id: string; url: string } };
    assert.notEqual(a.asset.id, b.asset.id);
    assert.notEqual(a.asset.url, b.asset.url);
  } finally {
    Date.now = realNow;
    await saveCmsState(original);
  }
});

test('F-18: delete keeps the file when the state cannot be saved (save first, unlink after)', async () => {
  const original = await getCmsState();
  try {
    const { asset } = (await (await upload(await png())).json()) as { asset: { id: string; url: string } };
    const file = path.join(UPLOADS_DIR, path.basename(asset.url));
    await fs.access(file);

    // Force only the state WRITE to fail (reads still work) by patching rename/copyFile for cms-data.json.
    const realRename = fs.rename;
    const realCopy = fs.copyFile;
    const boom = (target: unknown) => String(target).endsWith('cms-data.json');
    (fs as { rename: unknown }).rename = async (from: string, to: string) => {
      if (boom(to)) throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      return realRename(from, to);
    };
    (fs as { copyFile: unknown }).copyFile = async (from: string, to: string, ...r: unknown[]) => {
      if (boom(to)) throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      return (realCopy as (...a: unknown[]) => Promise<void>)(from, to, ...r);
    };
    try {
      const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params: Promise.resolve({ id: asset.id }) });
      assert.equal(res.status, 500);
      await fs.access(file); // file must still exist: state was not saved, so the record still points at it
    } finally {
      (fs as { rename: unknown }).rename = realRename;
      (fs as { copyFile: unknown }).copyFile = realCopy;
    }
    await fs.unlink(file).catch(() => {});
  } finally {
    await saveCmsState(original);
  }
});
