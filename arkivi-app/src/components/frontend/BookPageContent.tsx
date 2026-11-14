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
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#faf7ef] text-[#171614] select-none ${
        compact ? 'px-5 py-5 sm:px-7 sm:py-6' : 'px-7 py-6 lg:px-10 lg:py-8'
      }`}
    >
      {/* Tekstura e letres dhe hija e kurrizit te librit */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 w-14 ${
          side === 'left'
            ? 'right-0 bg-gradient-to-l from-[#171614]/[0.11] via-[#171614]/[0.03] to-transparent'
            : 'left-0 bg-gradient-to-r from-[#171614]/[0.11] via-[#171614]/[0.03] to-transparent'
        }`}
      />

      {/* Kreu i faqes */}
      <div className="relative z-10 flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-[#dcd6c8] pb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#635d55] sm:text-[11px]">
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
                  <div className="aspect-[4/3] w-full overflow-hidden border border-[#d3ccb8] bg-[#ebe6da] p-1">
                    <ArchivalImage
                      src={asset?.url}
                      alt={asset?.alt || block.content}
                      title={asset?.title}
                      className="h-full w-full"
                    />
                  </div>
                  {(block.caption || asset?.caption) && (
                    <figcaption className="font-serif text-xs italic leading-snug text-[#5c554c] sm:text-sm">
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
                  className="border-y border-[#d5cebf] py-3.5 text-center font-serif text-lg italic leading-relaxed text-[#171614] sm:text-xl"
                >
                  {block.content}
                  {block.caption && (
                    <footer className="mt-2 font-sans text-[11px] not-italic uppercase tracking-[0.16em] text-[#635d55]">
                      — {block.caption}
                    </footer>
                  )}
                </blockquote>
              );
            }

            if (block.type === 'handwritten-note') {
              return (
                <div
                  key={block.id}
                  className="border border-[#d5cebf] bg-[#f2ede1] px-4 py-3.5"
                >
                  {block.heading && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#1b3b2b]">
                      {block.heading}
                    </p>
                  )}
                  <p className="mt-1.5 whitespace-pre-line font-serif text-base italic leading-relaxed text-[#262320]">
                    {block.content}
                  </p>
                </div>
              );
            }

            return (
              <div key={block.id} className="space-y-2">
                {block.heading && (
                  <h2 className="font-serif text-xl font-semibold leading-snug text-[#171614] sm:text-2xl">
                    {block.heading}
                  </h2>
                )}
                <p
                  className={`whitespace-pre-line font-serif text-[15px] leading-[1.72] text-[#24211d] sm:text-[17px] lg:text-[18px] ${
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
        className={`relative z-10 mt-3 border-t border-[#e7e1d3] pt-2 font-mono text-[11px] tabular-nums text-[#635d55] ${
          side === 'left' ? 'text-left' : 'text-right'
        }`}
      >
        {String(pageNumber).padStart(2, '0')}
      </div>
    </div>
  );
}
