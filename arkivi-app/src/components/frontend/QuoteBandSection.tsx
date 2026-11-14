import React from 'react';

interface QuoteBandSectionProps {
  id?: string;
  quote: string;
  attribution: string;
}

export function QuoteBandSection({ id, quote, attribution }: QuoteBandSectionProps) {
  return (
    <section id={id} className="border-b border-border bg-card py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <blockquote className="font-serif text-2xl italic leading-relaxed text-foreground lg:text-3xl">
          {quote}
        </blockquote>
        <p className="mt-5 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {attribution}
        </p>
      </div>
    </section>
  );
}
