import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { resolveDatabaseUrl } from '../src/lib/dataPaths';

const root = path.resolve('/srv/arkivi-app');
const dataDir = path.join(root, 'data');
const url = (p: string) => `file:${p.split(path.sep).join('/')}`;

test('F-17: default and relative DB URLs are anchored to the app, never to process.cwd()', () => {
  assert.equal(resolveDatabaseUrl(undefined, root, dataDir), url(path.join(dataDir, 'arkivi.db')));
  assert.equal(resolveDatabaseUrl('', root, dataDir), url(path.join(dataDir, 'arkivi.db')));
  assert.equal(resolveDatabaseUrl('file:./data/arkivi.db', root, dataDir), url(path.join(root, 'data', 'arkivi.db')));
});

test('F-17: absolute file URLs and remote URLs pass through unchanged', () => {
  assert.equal(resolveDatabaseUrl('file:/var/lib/arkivi.db', root, dataDir), 'file:/var/lib/arkivi.db');
  assert.equal(resolveDatabaseUrl('file:C:/data/arkivi.db', root, dataDir), 'file:C:/data/arkivi.db');
  assert.equal(resolveDatabaseUrl('libsql://example.turso.io', root, dataDir), 'libsql://example.turso.io');
});
