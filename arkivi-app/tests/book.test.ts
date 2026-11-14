import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_CMS_STATE } from '../src/lib/defaultData';
import type { BookSpread } from '../src/types/cms';

describe('3D Physical Book Reader & Spreads Logic', () => {
  it('DEFAULT_CMS_STATE contains valid spreads with sequential pages', () => {
    const spreads = DEFAULT_CMS_STATE.bookSpreads;
    assert.ok(spreads.length >= 3, 'Should have at least 3 spreads');

    spreads.forEach((spread, index) => {
      assert.strictEqual(spread.leftPageNumber, index * 2 + 1);
      assert.strictEqual(spread.rightPageNumber, index * 2 + 2);
      assert.ok(spread.spreadTitle, 'Every spread must have a title');
      assert.ok(spread.chapterLabel, 'Every spread must have a chapter label');
    });
  });

  it('Folio decomposition for mobile decomposes N spreads into 2N folios', () => {
    const spreads = DEFAULT_CMS_STATE.bookSpreads;
    const mobileFolios: { pageNumber: number; side: 'left' | 'right' }[] = [];

    for (const spread of spreads) {
      mobileFolios.push({
        pageNumber: spread.leftPageNumber,
        side: 'left',
      });
      mobileFolios.push({
        pageNumber: spread.rightPageNumber,
        side: 'right',
      });
    }

    assert.strictEqual(mobileFolios.length, spreads.length * 2);
    for (let i = 0; i < mobileFolios.length; i++) {
      assert.strictEqual(mobileFolios[i].pageNumber, i + 1);
    }
  });

  it('Navigation clamp logic never exceeds bounds', () => {
    const spreadsCount = DEFAULT_CMS_STATE.bookSpreads.length;
    const clampSpread = (idx: number) => Math.max(0, Math.min(idx, spreadsCount - 1));

    assert.strictEqual(clampSpread(-5), 0);
    assert.strictEqual(clampSpread(0), 0);
    assert.strictEqual(clampSpread(2), 2);
    assert.strictEqual(clampSpread(100), spreadsCount - 1);
  });
});
