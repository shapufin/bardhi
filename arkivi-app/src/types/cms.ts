export type HeroAnimationStyle = 'gentle-drift' | 'soft-fade' | 'none';

export type StoriesLayoutVariant = 'editorial-grid' | 'chronicle-list' | 'masonry';

export type PageSectionType =
  | 'hero'
  | 'featured-story'
  | 'stories-feed'
  | 'masonry-gallery'
  | 'book-spotlight'
  | 'quote-band'
  | 'timeline';

export type StoryStatus = 'published' | 'draft';

export type BookBlockType = 'prose' | 'photo' | 'quote' | 'handwritten-note';

export type NavTargetType = 'home' | 'stories' | 'book' | 'gallery' | 'timeline';

export interface NavMenuItem {
  id: string;
  target: NavTargetType;
  label: string;
  enabled: boolean;
}

export interface SiteConfig {
  siteTitle: string;
  honoreeName: string;
  yearsLabel: string;
  authorName: string;
  authorRelation: string;
  dedicationLine: string;
  footerNote: string;
  navMenu: NavMenuItem[];
}

export interface HeroSettings {
  kicker: string;
  headline: string;
  subheadline: string;
  featuredStoryId: string;
  heroImageId: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  animationEnabled: boolean;
  animationStyle: HeroAnimationStyle;
}

export interface PageSectionConfig {
  id: string;
  type: PageSectionType;
  label: string;
  heading: string;
  subheading: string;
  enabled: boolean;
  storiesVariant?: StoriesLayoutVariant;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  eraLabel: string;
  publishedDate: string;
  readingMinutes: number;
  coverImageId: string;
  galleryImageIds: string[];
  bodyParagraphs: string[];
  pullQuote?: string;
  status: StoryStatus;
  featured: boolean;
}

export interface BookBlock {
  id: string;
  type: BookBlockType;
  heading?: string;
  content: string;
  imageId?: string;
  caption?: string;
  dropCap?: boolean;
}

export interface BookSpread {
  id: string;
  chapterLabel: string;
  spreadTitle: string;
  leftPageNumber: number;
  rightPageNumber: number;
  leftBlocks: BookBlock[];
  rightBlocks: BookBlock[];
}

export interface TimelineEntry {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface MediaAsset {
  id: string;
  title: string;
  url: string;
  alt: string;
  caption: string;
  year: string;
  aspectRatio: '16:9' | '4:3' | '3:4' | '1:1';
  isUpload?: boolean;
}

export interface CmsState {
  locale: 'sq';
  site: SiteConfig;
  hero: HeroSettings;
  sections: PageSectionConfig[];
  stories: Story[];
  bookTitle: string;
  bookSubtitle: string;
  bookCoverImageId: string;
  bookSpreads: BookSpread[];
  timeline: TimelineEntry[];
  quoteBand: {
    quote: string;
    attribution: string;
  };
  media: MediaAsset[];
  updatedAt: string;
}
