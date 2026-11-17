import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { getCmsState, saveCmsState, DATA_FILE, CmsStateCorruptError } from '../src/lib/payloadClient';

test('F-14: corrupt or malformed cms-data.json is rejected and never overwritten with defaults', async () => {
  const good = await getCmsState();
  try {
    for (const bad of ['{ not json', JSON.stringify({ locale: 'en', hello: 'world' })]) {
      await fs.writeFile(DATA_FILE, bad, 'utf-8');
      await assert.rejects(() => getCmsState(), CmsStateCorruptError);
      assert.equal(await fs.readFile(DATA_FILE, 'utf-8'), bad, 'live file must stay untouched');
    }
  } finally {
    await saveCmsState(good);
  }
});

test('F-14: an empty or missing file still initialises defaults (first run)', async () => {
  const good = await getCmsState();
  try {
    await fs.writeFile(DATA_FILE, '', 'utf-8');
    assert.equal((await getCmsState()).locale, 'sq');
    await fs.rm(DATA_FILE);
    assert.equal((await getCmsState()).locale, 'sq');
  } finally {
    await saveCmsState(good);
  }
});
