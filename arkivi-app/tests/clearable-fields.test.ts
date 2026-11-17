import './with-auth';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCmsState, saveCmsState } from '../src/lib/payloadClient';
import { PUT as putHero } from '../src/app/api/hero/route';
import { PUT as putSite } from '../src/app/api/site/route';
import { PUT as putBook } from '../src/app/api/book/spreads/route';

const put = (fn: (r: Request) => Promise<Response>, body: unknown) =>
  fn(new Request('http://localhost', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));

test('F-16: optional text fields can be cleared; required ones and absent keys keep their value', async () => {
  const original = await getCmsState();
  try {
    let s = (await (await put(putHero, { kicker: '', subheadline: '', heroImageId: '', headline: '' })).json()) as typeof original;
    assert.equal(s.hero.kicker, '');
    assert.equal(s.hero.subheadline, '');
    assert.equal(s.hero.heroImageId, '');
    assert.equal(s.hero.headline, original.hero.headline, 'required headline must not be blanked');
    assert.equal(s.hero.primaryCtaLabel, original.hero.primaryCtaLabel, 'absent key keeps value');

    s = (await (await put(putSite, { dedicationLine: '', footerNote: '', siteTitle: '' })).json()) as typeof original;
    assert.equal(s.site.dedicationLine, '');
    assert.equal(s.site.footerNote, '');
    assert.equal(s.site.siteTitle, original.site.siteTitle);

    s = (await (await put(putBook, { bookSubtitle: '', bookCoverImageId: '', bookTitle: '' })).json()) as typeof original;
    assert.equal(s.bookSubtitle, '');
    assert.equal(s.bookCoverImageId, '');
    assert.equal(s.bookTitle, original.bookTitle);
  } finally {
    await saveCmsState(original);
  }
});
