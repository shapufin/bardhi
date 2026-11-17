import './test-env';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { snapshotDatabase, createBackupArchive, restoreFromArchiveBuffer } from '../src/lib/backupArchive';
import { DATA_DIR } from '../src/lib/payloadClient';

test('F-09: snapshot captures committed rows while the DB is open in WAL mode', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'arkivi-snap-'));
  const file = path.join(dir, 'live.db');
  const live = createClient({ url: `file:${file.split(path.sep).join('/')}` });
  try {
    await live.execute('PRAGMA journal_mode=WAL');
    await live.execute('CREATE TABLE t (v TEXT)');
    await live.execute("INSERT INTO t VALUES ('wal-row')");

    const snapPath = path.join(dir, 'snap.db');
    await fs.writeFile(snapPath, await snapshotDatabase(file));
    const snap = createClient({ url: `file:${snapPath.split(path.sep).join('/')}` });
    const rows = await snap.execute('SELECT v FROM t');
    snap.close();
    assert.deepEqual(rows.rows.map((r) => r.v), ['wal-row']);
  } finally {
    live.close();
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

test('F-09: restore removes stale -wal/-shm sidecars next to the DB', async () => {
  const { buffer } = await createBackupArchive();
  const db = path.join(DATA_DIR, 'arkivi.db');
  await fs.writeFile(db + '-wal', 'stale');
  await fs.writeFile(db + '-shm', 'stale');
  await restoreFromArchiveBuffer(buffer);
  await assert.rejects(() => fs.access(db + '-wal'));
  await assert.rejects(() => fs.access(db + '-shm'));
});
