import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('F-23: Studio components use no text smaller than 14px (text-sm minimum) for the elderly author', () => {
  const dir = path.resolve(import.meta.dirname, '..', 'src', 'components', 'admin');
  const offenders: string[] = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.tsx'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf-8');
    if (/\btext-xs\b|text-\[(?:9|10|11|12|13)px\]/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `small text found in: ${offenders.join(', ')}`);
});
