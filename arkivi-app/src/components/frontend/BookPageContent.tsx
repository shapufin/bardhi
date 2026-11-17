import React from 'react';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import type { BookBlock, BookSpread, MediaAsset } from '@/src/types/cms';

interface BookPageContentProps {
  side: 'left' | 'right';
  blocks: BookBlock[];
  pageNumber: number;
  spread: BookSpread;
  bookTitle: string;
  getMedia: (id?: string) => MediaAsset | undefined;
  compact?: boolean;
  staticSnapshot?: boolean;
}

export function BookPageContent({
  side,
  blocks,
  pageNumber,
  spread,
  bookTitle,
  getMedia,
  compact = false,
  staticSnapshot = false,
}: BookPageContentProps) {
  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden bg-[color:var(--book-paper)] text-[color:var(--foreground)] select-none ${
        compact ? 'px-5 py-5 sm:px-7 sm:py-6' : 'px-7 py-6 lg:px-10 lg:py-8'
      }`}
    >
      {/* Tekstura e letres dhe hija e kurrizit te librit */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 w-14 ${
          side === 'left'
            ? 'right-0 bg-gradient-to-l from-[color:var(--foreground)]/[0.11] via-[color:var(--foreground)]/[0.03] to-transparent'
            : 'left-0 bg-gradient-to-r from-[color:var(--foreground)]/[0.11] via-[color:var(--foreground)]/[0.03] to-transparent'
        }`}
      />

      {/* Kreu i faqes */}
      <div className="relative z-10 flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--muted-foreground)] sm:text-[11px]">
          <span className="truncate">
            {side === 'left' ? bookTitle : spread.spreadTitle}
          </span>
          <span className="shrink-0">{spread.chapterLabel}</span>
        </div>

        {/* Permbajtja e blloqeve */}
        <div
          className={`mt-4 flex-1 pr-1 ${
            staticSnapshot ? 'overflow-hidden' : 'overflow-y-auto'
          } ${compact ? 'space-y-3.5' : 'space-y-4 lg:space-y-5'}`}
        >
          {blocks.map((block) => {
            if (block.type === 'photo') {
              const asset = getMedia(block.imageId);
              return (
                <figure key={block.id} className="space-y-2">
                  <div className="aspect-[4/3] w-full overflow-hidden border border-[color:var(--book-rule)] bg-[color:var(--book-shade-3)] p-1">
                    <ArchivalImage
                      src={asset?.url}
                      alt={asset?.alt || block.content}
                      title={asset?.title}
                      className="h-full w-full"
                    />
                  </div>
                  {(block.caption || asset?.caption) && (
                    <figcaption className="font-serif text-xs italic leading-snug text-[color:var(--book-ink-muted)] sm:text-sm">
                      {block.caption || asset?.caption}
                    </figcaption>
                  )}
                </figure>
              );
            }

            if (block.type === 'quote') {
              return (
                <blockquote
                  key={block.id}
                  className="border-y border-[color:var(--book-rule-soft)] py-3.5 text-center font-serif text-lg italic leading-relaxed text-[color:var(--foreground)] sm:text-xl"
                >
                  {block.content}
                  {block.caption && (
                    <footer className="mt-2 font-sans text-[11px] not-italic uppercase tracking-[0.16em] text-[color:var(--muted-foreground)]">
                      · {block.caption}
                    </footer>
                  )}
                </blockquote>
              );
            }

            if (block.type === 'handwritten-note') {
              return (
                <div
                  key={block.id}
                  className="border border-[color:var(--book-rule-soft)] bg-[color:var(--book-shade-1)] px-4 py-3.5"
                >
                  {block.heading && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--primary)]">
                      {block.heading}
                    </p>
                  )}
                  <p className="mt-1.5 whitespace-pre-line font-serif text-base italic leading-relaxed text-[color:var(--book-ink-3)]">
                    {block.content}
                  </p>
                </div>
              );
            }

            return (
              <div key={block.id} className="space-y-2">
                {block.heading && (
                  <h2 className="font-serif text-xl font-semibold leading-snug text-[color:var(--foreground)] sm:text-2xl">
                    {block.heading}
                  </h2>
                )}
                <p
                  className={`whitespace-pre-line font-serif text-[15px] leading-[1.72] text-[color:var(--book-ink-2)] sm:text-[17px] lg:text-[18px] ${
                    block.dropCap ? 'archival-drop-cap' : ''
                  }`}
                >
                  {block.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Numri i faqes */}
      <div
        className={`relative z-10 mt-3 border-t border-[color:var(--book-shade-5)] pt-2 font-mono text-[11px] tabular-nums text-[color:var(--muted-foreground)] ${
          side === 'left' ? 'text-left' : 'text-right'
        }`}
      >
        {String(pageNumber).padStart(2, '0')}
      </div>
    </div>
  );
}
