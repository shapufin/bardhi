import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import type { MediaAsset, StoriesLayoutVariant, Story } from '@/src/types/cms';

interface StoriesFeedSectionProps {
  id?: string;
  heading: string;
  subheading: string;
  stories: Story[];
  variant: StoriesLayoutVariant;
  getMedia: (id?: string) => MediaAsset | undefined;
  onSelectStory: (story: Story) => void;
}

export function StoriesFeedSection({
  id,
  heading,
  subheading,
  stories,
  variant,
  getMedia,
  onSelectStory,
}: StoriesFeedSectionProps) {
  const published = useMemo(() => stories.filter((s) => s.status === 'published'), [stories]);
  const eras = useMemo(() => {
    const unique = Array.from(new Set(published.map((s) => s.eraLabel).filter(Boolean)));
    return ['Të Gjitha', ...unique];
  }, [published]);

  const [selectedEra, setSelectedEra] = useState<string>('Të Gjitha');
  const [readerLayoutOverride, setReaderLayoutOverride] = useState<StoriesLayoutVariant | null>(null);

  const activeVariant = readerLayoutOverride ?? variant;

  const filtered = useMemo(() => {
    if (selectedEra === 'Të Gjitha') return published;
    return published.filter((s) => s.eraLabel === selectedEra);
  }, [published, selectedEra]);

  return (
    <section id={id} className="border-b border-border bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        {/* Titulli dhe Filtrat e Seksionit */}
        <div className="flex flex-col gap-6 border-b border-foreground/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-4xl font-medium tracking-tight text-foreground lg:text-5xl">
              {heading}
            </h2>
            {subheading && (
              <p className="mt-2 max-w-2xl font-serif text-lg italic text-muted-foreground">
                {subheading}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtrat sipas periudhës */}
            <div className="flex flex-wrap items-center gap-1 border border-border bg-card p-1">
              {eras.map((era) => (
                <button
                  key={era}
                  type="button"
                  onClick={() => setSelectedEra(era)}
                  className={`whitespace-nowrap shrink-0 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    selectedEra === era
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {era}
                </button>
              ))}
            </div>

            {/* Ndërruesi i paraqitjes */}
            <div className="flex items-center gap-1 border border-border bg-card p-1">
              {(
                [
                  { value: 'editorial-grid', label: 'Kolona' },
                  { value: 'chronicle-list', label: 'Indeks' },
                  { value: 'masonry', label: 'Mozaik' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReaderLayoutOverride(opt.value)}
                  className={`whitespace-nowrap shrink-0 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    activeVariant === opt.value
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gjendja bosh */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-2xl text-foreground">Ende nuk ka rrëfime të botuara në këtë kapitull.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Zgjidhni një periudhë tjetër më lart ose publikoni një kujtim të ri nga Studio e Autorit.
            </p>
          </div>
        ) : null}

        {/* Paraqitja 1: Kolona Gazetareske (pa kuti SaaS të rrumbullakosura) */}
        {filtered.length > 0 && activeVariant === 'editorial-grid' && (
          <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((story, idx) => {
              const cover = getMedia(story.coverImageId);
              return (
                <motion.article
                  key={story.id}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.28, delay: idx * 0.04 }}
                  className="group flex flex-col border-t border-foreground/20 pt-6"
                >
                  <button
                    type="button"
                    onClick={() => onSelectStory(story)}
                    className="flex h-full flex-col text-left cursor-pointer"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden border border-border">
                      <ArchivalImage
                        src={cover?.url}
                        alt={cover?.alt || story.title}
                        title={story.title}
                        className="h-full w-full"
                        imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="mt-5 flex flex-1 flex-col">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span>{story.eraLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{story.publishedDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{story.readingMinutes} min</span>
                      </div>
                      <h3 className="mt-2.5 font-serif text-2xl font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
                        {story.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 font-serif text-base leading-relaxed text-muted-foreground">
                        {story.subtitle}
                      </p>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-semibold uppercase tracking-wider text-primary">
                        Lexo rrëfimin
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </button>
                </motion.article>
              );
            })}
          </div>
        )}

        {/* Paraqitja 2: Indeks Letrar */}
        {filtered.length > 0 && activeVariant === 'chronicle-list' && (
          <div className="mt-6 divide-y divide-border border-b border-border">
            {filtered.map((story, idx) => {
              const cover = getMedia(story.coverImageId);
              return (
                <article key={story.id} className="py-8">
                  <button
                    type="button"
                    onClick={() => onSelectStory(story)}
                    className="group grid w-full grid-cols-1 items-center gap-6 text-left md:grid-cols-12 cursor-pointer"
                  >
                    <div className="hidden md:block md:col-span-1">
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="md:col-span-3">
                      <div className="aspect-[4/3] overflow-hidden border border-border">
                        <ArchivalImage
                          src={cover?.url}
                          alt={cover?.alt || story.title}
                          title={story.title}
                          className="h-full w-full"
                          imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-6">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span>{story.eraLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{story.publishedDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{story.readingMinutes} min lexim</span>
                      </div>
                      <h3 className="mt-2 font-serif text-3xl font-medium text-foreground group-hover:text-primary transition-colors">
                        {story.title}
                      </h3>
                      <p className="mt-2 font-serif text-lg leading-relaxed text-muted-foreground">
                        {story.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center md:col-span-2 md:justify-end">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        Lexo
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {/* Paraqitja 3: Mozaik Pllakash */}
        {filtered.length > 0 && activeVariant === 'masonry' && (
          <div className="mt-10 columns-1 gap-8 space-y-8 md:columns-2 lg:columns-3">
            {filtered.map((story, idx) => {
              const cover = getMedia(story.coverImageId);
              const tallAspect = idx % 2 === 0 ? 'aspect-[3/4]' : 'aspect-[4/3]';
              return (
                <article
                  key={story.id}
                  className="break-inside-avoid border-b border-border pb-7"
                >
                  <button
                    type="button"
                    onClick={() => onSelectStory(story)}
                    className="group flex w-full flex-col text-left cursor-pointer"
                  >
                    <div className={`${tallAspect} w-full overflow-hidden border border-border`}>
                      <ArchivalImage
                        src={cover?.url}
                        alt={cover?.alt || story.title}
                        title={story.title}
                        className="h-full w-full"
                        imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="pt-5">
                      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span>{story.eraLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>{story.publishedDate}</span>
                      </div>
                      <h3 className="mt-2 font-serif text-2xl font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
                        {story.title}
                      </h3>
                      <p className="mt-2 font-serif text-base leading-relaxed text-muted-foreground">
                        {story.subtitle}
                      </p>
                      {story.pullQuote && (
                        <blockquote className="mt-4 border-t border-border pt-3 font-serif text-base italic text-foreground/80">
                          “{story.pullQuote}”
                        </blockquote>
                      )}
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
