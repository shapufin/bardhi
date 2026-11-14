import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import type { HeroSettings, MediaAsset, SiteConfig } from '@/src/types/cms';

interface HeroSectionProps {
  site: SiteConfig;
  hero: HeroSettings;
  heroImage?: MediaAsset;
  publishedStoriesCount: number;
  spreadsCount: number;
  onReadFeatured: () => void;
  onOpenBook: () => void;
}

export function HeroSection({
  site,
  hero,
  heroImage,
  publishedStoriesCount,
  spreadsCount,
  onReadFeatured,
  onOpenBook,
}: HeroSectionProps) {
  const prefersReduced = useReducedMotion();
  const shouldAnimate = hero.animationEnabled && hero.animationStyle !== 'none' && !prefersReduced;
  const isGentleDrift = shouldAnimate && hero.animationStyle === 'gentle-drift';

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 pb-14 pt-10 lg:pb-20 lg:pt-16">
        {/* Shiriti i sipërm i botimit arkivor */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/15 pb-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {hero.kicker}
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
            {site.honoreeName} · {site.yearsLabel}
          </p>
        </div>

        {/* Përbërja asimetrike e Ballinës (Monografi pa kuti SaaS) */}
        <div className="mt-10 grid grid-cols-1 items-stretch gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-between lg:col-span-7"
          >
            <div>
              <h1 className="font-serif text-[clamp(2.4rem,4.5vw,4.15rem)] font-medium leading-[1.06] tracking-tight text-foreground">
                {hero.headline}
              </h1>

              <p className="mt-7 max-w-xl font-serif text-xl leading-relaxed text-muted-foreground">
                {hero.subheadline}
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-border pt-7">
              <Button size="lg" onClick={onReadFeatured} className="gap-2.5">
                <span>{hero.primaryCtaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={onOpenBook} className="gap-2.5">
                <BookOpen className="h-4 w-4" />
                <span>{hero.secondaryCtaLabel}</span>
              </Button>
            </div>
          </motion.div>

          {/* Pllaka e Portretit */}
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <figure className="flex h-full flex-col">
              <div className="relative aspect-[3/4] w-full overflow-hidden border border-foreground/15 bg-secondary/40 lg:aspect-auto lg:h-full lg:min-h-[470px]">
                <motion.div
                  className="h-full w-full"
                  animate={isGentleDrift ? { scale: [1, 1.035, 1] } : { scale: 1 }}
                  transition={
                    isGentleDrift
                      ? { duration: 18, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.3 }
                  }
                >
                  <ArchivalImage
                    src={heroImage?.url}
                    alt={heroImage?.alt || `Portreti i ${site.honoreeName}`}
                    title={heroImage?.title || site.honoreeName}
                    className="h-full w-full"
                  />
                </motion.div>
              </div>
              {heroImage?.caption && (
                <figcaption className="mt-3 flex items-baseline justify-between gap-4 font-serif text-sm italic text-muted-foreground">
                  <span>{heroImage.caption}</span>
                  <span className="font-mono text-xs not-italic tabular-nums shrink-0">
                    {heroImage.year}
                  </span>
                </figcaption>
              )}
            </figure>
          </motion.div>
        </div>

        {/* Rreshti Arkivor Poshtë Ballinës */}
        <div className="mt-14 grid grid-cols-1 gap-6 border-t border-foreground/15 pt-7 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Në Kujtim të
            </p>
            <p className="mt-1.5 font-serif text-lg font-medium text-foreground">
              {site.honoreeName} ({site.yearsLabel})
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Kujdeset dhe Shkruan
            </p>
            <p className="mt-1.5 font-serif text-lg text-foreground">
              {site.authorName} · {site.authorRelation}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Arkivi i Shkruar
            </p>
            <p className="mt-1.5 font-mono text-sm tabular-nums text-foreground">
              {publishedStoriesCount} Rrëfime · {spreadsCount * 2} Faqe Libri
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Kushtimi
            </p>
            <p className="mt-1.5 font-serif text-base italic text-muted-foreground line-clamp-2">
              {site.dedicationLine}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
