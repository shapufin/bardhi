import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Type } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import type { MediaAsset, Story } from '@/src/types/cms';

interface StoryReaderViewProps {
  story: Story;
  allStories: Story[];
  authorName: string;
  getMedia: (id?: string) => MediaAsset | undefined;
  onBack: () => void;
  onSelectStory: (story: Story) => void;
}

export function StoryReaderView({
  story,
  allStories,
  authorName,
  getMedia,
  onBack,
  onSelectStory,
}: StoryReaderViewProps) {
  const [largeText, setLargeText] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const published = allStories.filter((s) => s.status === 'published');
  const currentIdx = published.findIndex((s) => s.id === story.id);
  const nextStory = currentIdx >= 0 && currentIdx + 1 < published.length ? published[currentIdx + 1] : null;
  const cover = getMedia(story.coverImageId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [story.id]);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (total <= 0) {
        setScrollProgress(100);
        return;
      }
      setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / total) * 100)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="bg-background pb-24"
    >
      <div className="sticky top-[73px] z-20 h-[2px] w-full bg-border/50">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-6 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Kthehu te Arkivi</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLargeText((v) => !v)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Type className="h-4 w-4" />
            <span>{largeText ? 'Madhësi Standarde' : 'Shkrim më i Madh'}</span>
          </Button>
        </div>

        <header className="mt-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span>{story.eraLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{story.publishedDate}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{story.readingMinutes} min lexim</span>
            <span aria-hidden="true">·</span>
            <span>Nga {authorName}</span>
          </div>

          <h1 className="mt-4 font-serif text-[clamp(2.1rem,4vw,3.3rem)] font-medium leading-[1.12] tracking-tight text-foreground">
            {story.title}
          </h1>

          {story.subtitle && (
            <p className="mt-4 font-serif text-2xl italic leading-relaxed text-muted-foreground">
              {story.subtitle}
            </p>
          )}
        </header>

        {cover && (
          <figure className="mt-10">
            <div className="aspect-[16/10] w-full overflow-hidden border border-foreground/15">
              <ArchivalImage src={cover.url} alt={cover.alt} title={cover.title} className="h-full w-full" />
            </div>
            <figcaption className="mt-2.5 font-serif text-sm italic text-muted-foreground">
              Fig. 1 : {cover.caption || cover.title} ({cover.year})
            </figcaption>
          </figure>
        )}

        <div
          className={`mt-12 max-w-prose space-y-6 font-serif leading-[1.82] text-foreground ${
            largeText ? 'text-2xl' : 'text-[20px]'
          }`}
        >
          {story.bodyParagraphs.map((paragraph, index) => (
            <p key={index} className={index === 0 ? 'archival-drop-cap' : undefined}>
              {paragraph}
            </p>
          ))}
        </div>

        {story.pullQuote && (
          <blockquote className="my-12 max-w-2xl border-y border-foreground/20 py-8 font-serif text-3xl italic leading-relaxed text-foreground">
            “{story.pullQuote}”
          </blockquote>
        )}

        {story.galleryImageIds.length > 1 && (
          <div className="mt-14 border-t border-border pt-10">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Fotografi Shoqëruese
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {story.galleryImageIds.slice(1).map((mediaId, i) => {
                const asset = getMedia(mediaId);
                if (!asset) return null;
                return (
                  <figure key={mediaId}>
                    <div className="aspect-[4/3] overflow-hidden border border-border">
                      <ArchivalImage src={asset.url} alt={asset.alt} title={asset.title} className="h-full w-full" />
                    </div>
                    <figcaption className="mt-2 font-serif text-sm italic text-muted-foreground">
                      Fig. {i + 2} : {asset.caption || asset.title} ({asset.year})
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-16 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Kthehu te Të Gjitha Rrëfimet</span>
          </Button>

          {nextStory && (
            <button
              type="button"
              onClick={() => onSelectStory(nextStory)}
              className="group flex items-center gap-3 text-left sm:text-right cursor-pointer"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Rrëfimi Tjetër</p>
                <p className="font-serif text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                  {nextStory.title}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
