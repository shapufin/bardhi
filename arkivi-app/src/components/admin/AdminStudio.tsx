import React, { useState } from 'react';
import { BookOpen, Eye, FileText, Home, Image as ImageIcon, Users as UsersIcon, ExternalLink, Monitor, Smartphone, HardDrive } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { HomeHeroEditor } from '@/src/components/admin/HomeHeroEditor';
import { StoryManager } from '@/src/components/admin/StoryManager';
import { BookBuilder } from '@/src/components/admin/BookBuilder';
import { MediaLibrary } from '@/src/components/admin/MediaLibrary';
import { UserManager } from '@/src/components/admin/UserManager';
import { BackupManager } from '@/src/components/admin/BackupManager';
import { PublicSite } from '@/src/components/frontend/PublicSite';
import { useCms } from '@/src/context/CmsContext';

interface AdminStudioProps {
  onExitStudio: () => void;
}

type StudioSection = 'home' | 'stories' | 'book' | 'media' | 'users' | 'backup';

export function AdminStudio({ onExitStudio }: AdminStudioProps) {
  const { cms, saving, lastSavedAt } = useCms();
  const [activeTab, setActiveTab] = useState<StudioSection>('home');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  if (!cms) return null;

  const navItems: { id: StudioSection; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Kryefaqja & Menyja',
      hint: 'Titulli, menyja dhe renditja',
      icon: <Home className="h-5 w-5" />,
    },
    {
      id: 'stories',
      label: `Rrëfimet (${cms.stories.length})`,
      hint: 'Shkruaj ose publiko kujtime',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'book',
      label: `Ndërtuesi i Librit (${cms.bookSpreads.length})`,
      hint: 'Faqe me tërheqje (Drag & Drop)',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      id: 'media',
      label: `Albumi i Fotove (${cms.media.length})`,
      hint: 'Ngarko dhe menaxho fotot',
      icon: <ImageIcon className="h-5 w-5" />,
    },
    {
      id: 'users',
      label: 'Përdoruesit & Siguria',
      hint: 'Menaxho llogaritë & qasjen',
      icon: <UsersIcon className="h-5 w-5" />,
    },
    {
      id: 'backup',
      label: 'Rezervim & Rivendosje',
      hint: 'Eksporto ose importo të dhënat',
      icon: <HardDrive className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Shiriti i sipërm i thjeshtuar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-baseline gap-4">
            <h1 className="font-serif text-2xl font-medium text-foreground">
              Studio e Autorit
            </h1>
            <span className="text-xs text-muted-foreground">
              {saving
                ? 'Duke ruajtur ndryshimet...'
                : lastSavedAt
                  ? `Ruajtur në ${lastSavedAt}`
                  : cms.site.siteTitle}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => setPreviewOpen(true)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              <span>Pamje e Drejtpërdrejtë</span>
            </Button>

            <Button variant="default" size="default" onClick={onExitStudio}>
              Shiko Faqen Publike
            </Button>
          </div>
        </div>
      </header>

      {/* Struktura Arkitektonike me Panel Anësor (Payload-inspired) */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:flex-row">
        {/* Menyja Anësore e Madhe e Qartë për Përdorues të Moshuar */}
        <aside className="border-b border-border bg-card lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
          <nav aria-label="Menyja e studios" className="flex gap-1 overflow-x-auto p-4 lg:flex-col lg:gap-2 lg:p-6">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex shrink-0 items-center gap-3.5 border px-4 py-3.5 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-transparent text-foreground hover:bg-secondary/60'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-base font-medium leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`mt-0.5 hidden text-xs lg:block ${
                        active ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      }`}
                    >
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Zona Kryesore e Punës */}
        <main className="flex-1 px-6 py-8 lg:px-12 lg:py-10">
          {activeTab === 'home' && <HomeHeroEditor />}
          {activeTab === 'stories' && <StoryManager />}
          {activeTab === 'book' && <BookBuilder />}
          {activeTab === 'media' && <MediaLibrary />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'backup' && <BackupManager />}
        </main>
      </div>

      {/* Pamje e Drejtpërdrejtë (Desktop & Celular) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col bg-secondary p-0">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-3.5 pr-16">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg">Pamje e Drejtpërdrejtë e Faqes</DialogTitle>
              <DialogDescription className="text-xs">
                Kontrolloni si duket faqja dhe libri për vizitorët në kompjuter dhe celular.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-1 border border-border bg-secondary/60 p-1">
              <Button
                type="button"
                variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('desktop')}
                className="gap-1.5"
              >
                <Monitor className="h-4 w-4" />
                <span>Kompjuter</span>
              </Button>
              <Button
                type="button"
                variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPreviewDevice('mobile')}
                className="gap-1.5"
              >
                <Smartphone className="h-4 w-4" />
                <span>Celular</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div
              className={`mx-auto overflow-hidden border border-border bg-background shadow-lg transition-all ${
                previewDevice === 'mobile' ? 'max-w-[390px]' : 'w-full'
              }`}
            >
              <PublicSite cms={cms} onOpenAdmin={() => setPreviewOpen(false)} isPreview />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
