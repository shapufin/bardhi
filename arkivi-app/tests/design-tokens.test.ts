import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.tsx') ? [path.join(dir, e.name)] : []
  );
}

test('F-22: components use CSS variable tokens, never hardcoded hex colours', () => {
  const root = path.resolve(import.meta.dirname, '..', 'src', 'components');
  const offenders = walk(root).filter((f) => /#[0-9a-fA-F]{6}\b/.test(fs.readFileSync(f, 'utf-8')));
  assert.deepEqual(offenders.map((f) => path.relative(root, f)), []);
});
