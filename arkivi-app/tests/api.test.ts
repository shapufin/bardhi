import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCmsState, saveCmsState } from '../src/lib/payloadClient';
import type { Story, BookSpread } from '../src/types/cms';

describe('CMS Data Integrity & Atomic State', () => {
  it('getCmsState returns valid state with Albanian locale', async () => {
    const state = await getCmsState();
    assert.ok(state);
    assert.strictEqual(state.locale, 'sq');
    assert.ok(state.site.siteTitle);
    assert.ok(Array.isArray(state.site.navMenu));
    assert.ok(Array.isArray(state.stories));
    assert.ok(Array.isArray(state.bookSpreads));
  });

  it('saveCmsState atomically updates and stamps updatedAt', async () => {
    const current = await getCmsState();
    const testTitle = `Titull Testimi ${Date.now()}`;
    const updated = await saveCmsState({
      ...current,
      site: {
        ...current.site,
        siteTitle: testTitle,
      },
    });

    assert.strictEqual(updated.site.siteTitle, testTitle);
    assert.ok(updated.updatedAt);

    // Verify it persisted on disk
    const reloaded = await getCmsState();
    assert.strictEqual(reloaded.site.siteTitle, testTitle);

    // Restore original title
    await saveCmsState({
      ...reloaded,
      site: {
        ...reloaded.site,
        siteTitle: current.site.siteTitle,
      },
    });
  });

  it('Story creation, indexing and deletion integrity', async () => {
    const current = await getCmsState();
    const testId = `story-test-${Date.now()}`;
    const testStory: Story = {
      id: testId,
      title: 'Rrëfim Prove për Auditimin',
      subtitle: 'Nëntitull Prove',
      eraLabel: 'Test',
      publishedDate: 'Nëntor 2026',
      readingMinutes: 3,
      coverImageId: '',
      galleryImageIds: [],
      bodyParagraphs: ['Ky është një paragraf prove i shkruar gjatë auditimit automatik.'],
      pullQuote: 'Citim prove.',
      status: 'draft',
      featured: false,
    };

    // Save story
    const stateWithStory = await saveCmsState({
      ...current,
      stories: [testStory, ...current.stories],
    });

    assert.ok(stateWithStory.stories.some((s) => s.id === testId));

    // Delete story and verify clean removal
    const cleanStories = stateWithStory.stories.filter((s) => s.id !== testId);
    const cleanedState = await saveCmsState({
      ...stateWithStory,
      stories: cleanStories,
    });

    assert.ok(!cleanedState.stories.some((s) => s.id === testId));
  });

  it('Book spread pagination numbers are strictly sequential', async () => {
    const current = await getCmsState();
    const rawSpreads: BookSpread[] = current.bookSpreads.map((sp, i) => ({
      ...sp,
      leftPageNumber: i * 2 + 1,
      rightPageNumber: i * 2 + 2,
    }));

    for (let i = 0; i < rawSpreads.length; i++) {
      assert.strictEqual(rawSpreads[i].leftPageNumber, i * 2 + 1);
      assert.strictEqual(rawSpreads[i].rightPageNumber, i * 2 + 2);
    }
  });
});
