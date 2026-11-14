import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import type { BookSpread, MediaAsset } from '@/src/types/cms';

interface BookSpotlightSectionProps {
  id?: string;
  heading: string;
  subheading: string;
  bookTitle: string;
  bookSubtitle: string;
  coverImage?: MediaAsset;
  spreads: BookSpread[];
  onOpenBook: () => void;
}

export function BookSpotlightSection({
  id,
  heading,
  subheading,
  bookTitle,
  bookSubtitle,
  coverImage,
  spreads,
  onOpenBook,
}: BookSpotlightSectionProps) {
  return (
    <section id={id} className="border-b border-border bg-secondary/45 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <button
              type="button"
              onClick={onOpenBook}
              className="group mx-auto block w-full max-w-sm overflow-hidden border border-foreground/20 bg-card shadow-sm cursor-pointer"
            >
              <div className="aspect-[3/4]">
                <ArchivalImage
                  src={coverImage?.url}
                  alt={coverImage?.alt || bookTitle}
                  title={bookTitle}
                  className="h-full w-full"
                  imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </button>
          </div>

          <div className="lg:col-span-7">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {heading}
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium leading-tight text-foreground lg:text-5xl">
              {bookTitle}
            </h2>
            <p className="mt-2 font-serif text-xl italic text-muted-foreground">{bookSubtitle}</p>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/85">
              {subheading}. Shfletoni {spreads.length} fleta dyshe ({spreads.length * 2} faqe) në librin fizik 3D me kthim faqesh me maus ose prekje.
            </p>

            <div className="mt-8 divide-y divide-border border-y border-border">
              {spreads.slice(0, 5).map((sp) => (
                <div key={sp.id} className="flex items-baseline justify-between gap-4 py-3 text-base">
                  <span className="truncate font-serif text-foreground">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground mr-3">
                      {sp.chapterLabel}
                    </span>
                    {sp.spreadTitle}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                    f. {sp.leftPageNumber}–{sp.rightPageNumber}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Button size="lg" onClick={onOpenBook} className="gap-2.5">
                <BookOpen className="h-4 w-4" />
                <span>Hap Librin Fizik 3D</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
