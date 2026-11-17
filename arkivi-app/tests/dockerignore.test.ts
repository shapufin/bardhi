import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('F-20: .dockerignore keeps secrets, databases and uploads out of the image', () => {
  const lines = fs
    .readFileSync(path.resolve(import.meta.dirname, '..', '.dockerignore'), 'utf-8')
    .split(/\r?\n/)
    .map((l) => l.trim());
  for (const required of ['.env', '.env.*', 'data/*.db', 'data/cms-data.json', 'public/uploads/*', 'backups', 'tests']) {
    assert.ok(lines.includes(required), `.dockerignore must contain "${required}"`);
  }
  assert.ok(lines.includes('!.env.example'), 'example env may stay');
});
