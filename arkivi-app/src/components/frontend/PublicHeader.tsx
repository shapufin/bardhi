import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { NavMenuItem, NavTargetType } from '@/src/types/cms';

export type PublicRoute = 'home' | 'book' | 'story';

interface PublicHeaderProps {
  siteTitle: string;
  navMenu: NavMenuItem[];
  activeRoute: PublicRoute;
  onNavigate: (route: PublicRoute, anchorId?: string) => void;
  onOpenAdmin: () => void;
  isPreview?: boolean;
}

const TARGET_MAP: Record<NavTargetType, { route: PublicRoute; anchor?: string }> = {
  home: { route: 'home' },
  stories: { route: 'home', anchor: 'section-stories-feed' },
  book: { route: 'book' },
  gallery: { route: 'home', anchor: 'section-masonry-gallery' },
  timeline: { route: 'home', anchor: 'section-timeline' },
};

export function PublicHeader({
  siteTitle,
  navMenu,
  activeRoute,
  onNavigate,
  onOpenAdmin,
  isPreview = false,
}: PublicHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleItems = navMenu.filter((item) => item.enabled);

  const handleItemClick = (target: NavTargetType) => {
    setMobileOpen(false);
    const mapped = TARGET_MAP[target];
    onNavigate(mapped.route, mapped.anchor);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        {/* Zona 1: Titulli i Faqes (nje rresht) */}
        <button
          type="button"
          onClick={() => handleItemClick('home')}
          className="font-serif text-2xl font-medium tracking-tight text-foreground whitespace-nowrap shrink-0 hover:text-primary transition-colors cursor-pointer"
        >
          {siteTitle}
        </button>

        {/* Zona 2: Lidhjet e Menuse te kontrolluara nga Admin */}
        <nav
          aria-label="Navigimi kryesor"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground"
        >
          {visibleItems.map((item) => {
            const isActive =
              (item.target === 'home' && activeRoute === 'home') ||
              (item.target === 'book' && activeRoute === 'book');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.target)}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-foreground cursor-pointer ${
                  isActive ? 'text-foreground underline underline-offset-8 decoration-primary' : ''
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zona 3: Nje veprim kryesor */}
        <div className="flex items-center gap-3 shrink-0">
          {!isPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAdmin}
              className="hidden md:inline-flex border-foreground/25 px-4"
            >
              Studio e Autorit
            </Button>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? 'Mbyll menynë' : 'Hap menynë'}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center border border-border bg-card text-foreground md:hidden cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menuja per celular */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-6 py-4 md:hidden">
          <div className="flex flex-col gap-2 text-base">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.target)}
                className="border-b border-border/50 py-2.5 text-left font-medium text-foreground last:border-b-0"
              >
                {item.label}
              </button>
            ))}
            {!isPreview && (
              <Button onClick={onOpenAdmin} className="mt-3 w-full">
                Hap Studion e Autorit
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
