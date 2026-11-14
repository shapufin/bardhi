import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface ArchivalImageProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
  imgClassName?: string;
}

export function ArchivalImage({ src, alt, title, className, imgClassName }: ArchivalImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 bg-secondary/70 border border-border p-6 text-center text-muted-foreground',
          className
        )}
      >
        <ImageIcon className="h-6 w-6 opacity-60" strokeWidth={1.5} />
        <span className="font-serif text-sm italic text-foreground/75">{title || alt}</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-secondary/50', className)}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </div>
  );
}
