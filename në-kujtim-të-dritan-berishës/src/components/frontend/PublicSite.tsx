import React, { useCallback, useState } from 'react';
import { PublicHeader, type PublicRoute } from '@/src/components/frontend/PublicHeader';
import { HeroSection } from '@/src/components/frontend/HeroSection';
import { FeaturedStorySection } from '@/src/components/frontend/FeaturedStorySection';
import { StoriesFeedSection } from '@/src/components/frontend/StoriesFeedSection';
import { BookSpotlightSection } from '@/src/components/frontend/BookSpotlightSection';
import { QuoteBandSection } from '@/src/components/frontend/QuoteBandSection';
import { MasonryGallerySection } from '@/src/components/frontend/MasonryGallerySection';
import { TimelineSection } from '@/src/components/frontend/TimelineSection';
import { StoryReaderView } from '@/src/components/frontend/StoryReaderView';
import { PhysicalBookReader } from '@/src/components/frontend/PhysicalBookReader';
import type { CmsState, MediaAsset, Story } from '@/src/types/cms';

interface PublicSiteProps {
  cms: CmsState;
  onOpenAdmin: () => void;
  isPreview?: boolean;
}

export function PublicSite({ cms, onOpenAdmin, isPreview = false }: PublicSiteProps) {
  const [route, setRoute] = useState<PublicRoute>('home');
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);

  const getMedia = useCallback(
    (id?: string): MediaAsset | undefined => (id ? cms.media.find((m) => m.id === id) : undefined),
    [cms.media]
  );

  const publishedStories = cms.stories.filter((s) => s.status === 'published');
  const featuredStory =
    publishedStories.find((s) => s.id === cms.hero.featuredStoryId) ||
    publishedStories.find((s) => s.featured) ||
    publishedStories[0];

  const activeStory = cms.stories.find((s) => s.id === activeStoryId) || null;

  const handleNavigate = (nextRoute: PublicRoute, anchorId?: string) => {
    setRoute(nextRoute);
    if (nextRoute !== 'story') {
      setActiveStoryId(null);
    }
    if (anchorId) {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectStory = (story: Story) => {
    setActiveStoryId(story.id);
    setRoute('story');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader
        siteTitle={cms.site.siteTitle}
        navMenu={cms.site.navMenu}
        activeRoute={route}
        onNavigate={handleNavigate}
        onOpenAdmin={onOpenAdmin}
        isPreview={isPreview}
      />

      {route === 'book' && (
        <PhysicalBookReader
          bookTitle={cms.bookTitle}
          bookSubtitle={cms.bookSubtitle}
          authorName={cms.site.authorName}
          bookCoverImageId={cms.bookCoverImageId}
          spreads={cms.bookSpreads}
          getMedia={getMedia}
          onExitBook={() => handleNavigate('home')}
        />
      )}

      {route === 'story' && activeStory && (
        <StoryReaderView
          story={activeStory}
          allStories={cms.stories}
          authorName={cms.site.authorName}
          getMedia={getMedia}
          onBack={() => handleNavigate('home', 'section-stories-feed')}
          onSelectStory={handleSelectStory}
        />
      )}

      {route === 'home' && (
        <main>
          {cms.sections
            .filter((section) => section.enabled)
            .map((section) => {
              switch (section.type) {
                case 'hero':
                  return (
                    <HeroSection
                      key={section.id}
                      site={cms.site}
                      hero={cms.hero}
                      heroImage={getMedia(cms.hero.heroImageId)}
                      publishedStoriesCount={publishedStories.length}
                      spreadsCount={cms.bookSpreads.length}
                      onReadFeatured={() => {
                        if (featuredStory) handleSelectStory(featuredStory);
                      }}
                      onOpenBook={() => handleNavigate('book')}
                    />
                  );

                case 'featured-story':
                  return (
                    <FeaturedStorySection
                      key={section.id}
                      id="section-featured-story"
                      heading={section.heading}
                      subheading={section.subheading}
                      story={featuredStory}
                      getMedia={getMedia}
                      onSelectStory={handleSelectStory}
                    />
                  );

                case 'stories-feed':
                  return (
                    <StoriesFeedSection
                      key={section.id}
                      id="section-stories-feed"
                      heading={section.heading}
                      subheading={section.subheading}
                      stories={cms.stories}
                      variant={section.storiesVariant || 'editorial-grid'}
                      getMedia={getMedia}
                      onSelectStory={handleSelectStory}
                    />
                  );

                case 'book-spotlight':
                  return (
                    <BookSpotlightSection
                      key={section.id}
                      id="section-book-spotlight"
                      heading={section.heading}
                      subheading={section.subheading}
                      bookTitle={cms.bookTitle}
                      bookSubtitle={cms.bookSubtitle}
                      coverImage={getMedia(cms.bookCoverImageId)}
                      spreads={cms.bookSpreads}
                      onOpenBook={() => handleNavigate('book')}
                    />
                  );

                case 'quote-band':
                  return (
                    <QuoteBandSection
                      key={section.id}
                      id="section-quote-band"
                      quote={cms.quoteBand.quote}
                      attribution={cms.quoteBand.attribution}
                    />
                  );

                case 'masonry-gallery':
                  return (
                    <MasonryGallerySection
                      key={section.id}
                      id="section-masonry-gallery"
                      heading={section.heading}
                      subheading={section.subheading}
                      media={cms.media}
                    />
                  );

                case 'timeline':
                  return (
                    <TimelineSection
                      key={section.id}
                      id="section-timeline"
                      heading={section.heading}
                      subheading={section.subheading}
                      entries={cms.timeline}
                    />
                  );

                default:
                  return null;
              }
            })}
        </main>
      )}

      {/* Fundi i Faqes (Footer) */}
      <footer className="bg-background py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-xl font-medium text-foreground">{cms.site.siteTitle}</p>
            <p className="mt-1.5 max-w-xl font-serif text-base text-muted-foreground">
              {cms.site.footerNote}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            {cms.site.navMenu
              .filter((m) => m.enabled && (m.target === 'home' || m.target === 'book'))
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleNavigate(m.target === 'book' ? 'book' : 'home')}
                  className="hover:text-foreground cursor-pointer"
                >
                  {m.label}
                </button>
              ))}
            {!isPreview && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="font-medium text-primary hover:underline cursor-pointer"
              >
                Studio e Autorit
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
