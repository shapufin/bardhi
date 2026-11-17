import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOADS_DIR } from '../src/lib/payloadClient';
import { GET } from '../src/app/api/uploads/[file]/route';

const call = (file: string) =>
  GET(new Request(`http://localhost/uploads/${file}`), { params: Promise.resolve({ file }) });

test('uploads route serves a file written after server start with image/webp', async () => {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const name = `zz-serve-test-${Date.now()}.webp`;
  const bytes = Buffer.from('RIFF....WEBPVP8 test');
  await fs.writeFile(path.join(UPLOADS_DIR, name), bytes);
  try {
    const res = await call(name);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/webp');
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), bytes);
  } finally {
    await fs.unlink(path.join(UPLOADS_DIR, name)).catch(() => {});
  }
});

test('uploads route returns 404 for missing files and rejects traversal / bad extensions', async () => {
  assert.equal((await call('does-not-exist.webp')).status, 404);
  assert.equal((await call('..%2F..%2Fpackage.json')).status, 404);
  assert.equal((await call('..\\package.json')).status, 404);
  assert.equal((await call('.gitkeep')).status, 404);
  assert.equal((await call('notes.txt')).status, 404);
});
