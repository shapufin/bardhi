import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import type { MediaAsset, Story } from '@/src/types/cms';

interface FeaturedStorySectionProps {
  id?: string;
  heading: string;
  subheading: string;
  story?: Story;
  getMedia: (id?: string) => MediaAsset | undefined;
  onSelectStory: (story: Story) => void;
}

export function FeaturedStorySection({
  id,
  heading,
  subheading,
  story,
  getMedia,
  onSelectStory,
}: FeaturedStorySectionProps) {
  if (!story) return null;
  const cover = getMedia(story.coverImageId);

  return (
    <section id={id} className="border-b border-border bg-card py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-1 border-b border-foreground/15 pb-5 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {heading}
          </p>
          <p className="font-serif text-base italic text-muted-foreground">{subheading}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <button
              type="button"
              onClick={() => onSelectStory(story)}
              className="group block w-full overflow-hidden border border-foreground/15 text-left cursor-pointer"
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                <ArchivalImage
                  src={cover?.url}
                  alt={cover?.alt || story.title}
                  title={story.title}
                  className="h-full w-full"
                  imgClassName="transition-transform duration-700 group-hover:scale-[1.025]"
                />
              </div>
            </button>
          </div>

          <div className="flex flex-col justify-center lg:col-span-6">
            <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <span>{story.eraLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{story.publishedDate}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{story.readingMinutes} min lexim</span>
            </div>

            <h2 className="mt-4 font-serif text-3xl font-medium leading-[1.15] text-foreground lg:text-4xl">
              {story.title}
            </h2>

            <p className="mt-4 font-serif text-xl leading-relaxed text-muted-foreground">
              {story.subtitle}
            </p>

            {story.bodyParagraphs[0] && (
              <p className="mt-5 line-clamp-3 font-serif text-lg leading-relaxed text-foreground/85">
                {story.bodyParagraphs[0]}
              </p>
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={() => onSelectStory(story)}
                className="group inline-flex items-center gap-2 border-b border-primary pb-1 font-sans text-sm font-semibold text-primary transition-colors hover:text-foreground hover:border-foreground cursor-pointer"
              >
                <span>Lexo Rrëfimin e Plotë</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
