import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import type { MediaAsset } from '@/src/types/cms';

interface MasonryGallerySectionProps {
  id?: string;
  heading: string;
  subheading: string;
  media: MediaAsset[];
}

export function MasonryGallerySection({
  id,
  heading,
  subheading,
  media,
}: MasonryGallerySectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex !== null ? media[activeIndex] : null;

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev !== null && prev < media.length - 1 ? prev + 1 : prev));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, media.length]);

  const aspectClass = (ratio: MediaAsset['aspectRatio']) => {
    switch (ratio) {
      case '3:4':
        return 'aspect-[3/4]';
      case '16:9':
        return 'aspect-[16/10]';
      case '1:1':
        return 'aspect-square';
      default:
        return 'aspect-[4/3]';
    }
  };

  return (
    <section id={id} className="border-b border-border bg-background py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="border-b border-foreground/15 pb-6">
          <h2 className="font-serif text-4xl font-medium tracking-tight text-foreground lg:text-5xl">
            {heading}
          </h2>
          {subheading && (
            <p className="mt-2 font-serif text-lg italic text-muted-foreground">{subheading}</p>
          )}
        </div>

        {/* Mozaik Muzeal pa Kuti te Rrumbullakosura */}
        <div className="mt-10 columns-1 gap-8 space-y-8 sm:columns-2 lg:columns-3">
          {media.map((item, idx) => (
            <figure
              key={item.id}
              className="group break-inside-avoid border-b border-border pb-5"
            >
              <button
                type="button"
                onClick={() => setActiveIndex(idx)}
                className="relative block w-full text-left cursor-pointer"
              >
                <div className={`${aspectClass(item.aspectRatio)} w-full overflow-hidden border border-foreground/15`}>
                  <ArchivalImage
                    src={item.url}
                    alt={item.alt}
                    title={item.title}
                    className="h-full w-full"
                    imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <span className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center bg-stone-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Expand className="h-4 w-4" />
                </span>
                <figcaption className="pt-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-serif text-lg font-medium text-foreground">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mr-2">
                        Tab. {String(idx + 1).padStart(2, '0')}
                      </span>
                      {item.title}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                      {item.year}
                    </span>
                  </div>
                  {item.caption && (
                    <p className="mt-1 font-serif text-sm italic leading-relaxed text-muted-foreground">
                      {item.caption}
                    </p>
                  )}
                </figcaption>
              </button>
            </figure>
          ))}
        </div>
      </div>

      {/* Dritarja e Zmadhimit (Lightbox) */}
      <Dialog open={activeIndex !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        <DialogContent className="max-w-4xl bg-card p-6 sm:p-8">
          {activePhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{activePhoto.title}</DialogTitle>
                <DialogDescription>
                  {activePhoto.year}
                  {activePhoto.caption ? ` — ${activePhoto.caption}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 max-h-[62vh] overflow-hidden border border-border bg-secondary/40">
                <img
                  src={activePhoto.url}
                  alt={activePhoto.alt}
                  referrerPolicy="no-referrer"
                  className="mx-auto max-h-[62vh] w-auto object-contain"
                />
              </div>

              <div className="mt-5 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((prev) => (prev !== null ? prev - 1 : null))}
                  className="gap-1.5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>E Mëparshmja</span>
                </Button>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {(activeIndex ?? 0) + 1} / {media.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex === media.length - 1}
                  onClick={() => setActiveIndex((prev) => (prev !== null ? prev + 1 : null))}
                  className="gap-1.5"
                >
                  <span>Tjetra</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
