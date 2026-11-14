import React from 'react';
import type { TimelineEntry } from '@/src/types/cms';

interface TimelineSectionProps {
  id?: string;
  heading: string;
  subheading: string;
  entries: TimelineEntry[];
}

export function TimelineSection({ id, heading, subheading, entries }: TimelineSectionProps) {
  return (
    <section id={id} className="border-b border-border bg-card py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="border-b border-foreground/15 pb-6">
          <h2 className="font-serif text-4xl font-medium tracking-tight text-foreground lg:text-5xl">
            {heading}
          </h2>
          {subheading && (
            <p className="mt-2 font-serif text-lg italic text-muted-foreground">{subheading}</p>
          )}
        </div>

        {/* Kronologji Arkivore me Vija Ndarëse (pa kuti të përsëritura) */}
        <div className="mt-6 divide-y divide-border border-b border-border">
          {entries.map((item, idx) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-4 py-7 md:grid-cols-12 md:items-baseline md:gap-8"
            >
              <div className="flex items-baseline gap-4 md:col-span-3">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="font-serif text-4xl font-medium tabular-nums text-primary">
                  {item.year}
                </span>
              </div>

              <div className="md:col-span-4">
                <h3 className="font-serif text-2xl font-medium text-foreground">{item.title}</h3>
              </div>

              <div className="md:col-span-5">
                <p className="font-serif text-lg leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
