import React, { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input, Textarea } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import { MediaPickerDialog } from '@/src/components/admin/MediaLibrary';
import { useCms } from '@/src/context/CmsContext';
import type { Story, StoryStatus } from '@/src/types/cms';

export function StoryManager() {
  const { cms, getMedia, saveStory, deleteStory } = useCms();
  const [filter, setFilter] = useState<'all' | StoryStatus>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Story | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!cms) return null;

  const openEditor = (story: Story) => {
    setEditing({ ...story });
    setBodyText(story.bodyParagraphs.join('\n\n'));
  };

  const createNewStory = () => {
    const defaultImage = cms.media[0]?.id || '';
    const newStory: Story = {
      id: `story-${Date.now()}`,
      title: '',
      subtitle: '',
      eraLabel: 'Kujtime Familjare',
      publishedDate: 'Nëntor 2024',
      readingMinutes: 4,
      coverImageId: defaultImage,
      galleryImageIds: defaultImage ? [defaultImage] : [],
      bodyParagraphs: [''],
      pullQuote: '',
      status: 'draft',
      featured: false,
    };
    openEditor(newStory);
  };

  const handleSave = async (targetStatus: StoryStatus) => {
    if (!editing) return;
    const paragraphs = bodyText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    const words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
    const estimatedMins = Math.max(1, Math.round(words / 180));

    const payload: Story = {
      ...editing,
      title: editing.title.trim() || 'Rrëfim pa Titull',
      bodyParagraphs: paragraphs.length > 0 ? paragraphs : [''],
      readingMinutes: estimatedMins,
      status: targetStatus,
    };

    await saveStory(payload);
    setEditing(null);
  };

  if (editing) {
    const cover = getMedia(editing.coverImageId);
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-foreground/15 pb-5">
          <Button variant="outline" size="lg" onClick={() => setEditing(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Kthehu te Rrëfimet</span>
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="lg" onClick={() => void handleSave('draft')}>
              Ruaj si Draft
            </Button>
            <Button size="lg" onClick={() => void handleSave('published')}>
              Publiko Rrëfimin
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="space-y-2">
              <Label htmlFor="story-title" className="text-base">Titulli i Rrëfimit</Label>
              <Input
                id="story-title"
                className="h-12 font-serif text-2xl"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Shkruani një titull të qartë për këtë kujtim..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="story-subtitle" className="text-base">Përmbledhje e Shkurtër</Label>
              <Input
                id="story-subtitle"
                value={editing.subtitle}
                onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                placeholder="Një fjali se kur ose ku ndodhi ky kujtim..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="story-body" className="text-base">
                Teksti i Rrëfimit (lini një rresht bosh ndërmjet paragrafëve)
              </Label>
              <Textarea
                id="story-body"
                className="min-h-[360px] font-serif text-xl leading-relaxed"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Filloni të shkruani këtu..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="story-quote" className="text-base">Thënie e Veçuar (sipas dëshirës)</Label>
              <Input
                id="story-quote"
                value={editing.pullQuote || ''}
                onChange={(e) => setEditing({ ...editing, pullQuote: e.target.value })}
                placeholder="Një fjali që dëshironi të dalë e veçuar me shkrim të pjerrët..."
              />
            </div>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <div className="border border-border bg-card p-5 space-y-4">
              <Label className="text-base">Fotografia Kryesore</Label>
              <div className="aspect-[4/3] overflow-hidden border border-border">
                <ArchivalImage
                  src={cover?.url}
                  alt={cover?.alt || 'Fotografia e rrëfimit'}
                  title={cover?.title}
                  className="h-full w-full"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPickerOpen(true)}
                className="w-full gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Zgjidh Fotografi</span>
              </Button>
            </div>

            <div className="border border-border bg-card p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="story-era" className="text-base">Periudha / Kapitulli</Label>
                <Input
                  id="story-era"
                  value={editing.eraLabel}
                  onChange={(e) => setEditing({ ...editing, eraLabel: e.target.value })}
                  placeholder="p.sh., Fëmijëria, Vitet e Shërbimit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="story-date" className="text-base">Data e Shkrimit</Label>
                <Input
                  id="story-date"
                  value={editing.publishedDate}
                  onChange={(e) => setEditing({ ...editing, publishedDate: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <Label htmlFor="story-featured" className="text-sm font-medium">
                    Veço në Kryefaqe
                  </Label>
                  <p className="text-sm text-muted-foreground">Shfaqe si kujtim kryesor</p>
                </div>
                <Switch
                  id="story-featured"
                  checked={editing.featured}
                  onCheckedChange={(checked) => setEditing({ ...editing, featured: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        <MediaPickerDialog
          open={pickerOpen}
          selectedId={editing.coverImageId}
          onOpenChange={setPickerOpen}
          onSelect={(mediaId) =>
            setEditing({
              ...editing,
              coverImageId: mediaId,
              galleryImageIds: Array.from(new Set([mediaId, ...editing.galleryImageIds])),
            })
          }
        />
      </div>
    );
  }

  const filtered = cms.stories.filter((s) => {
    const matchesStatus = filter === 'all' || s.status === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || s.title.toLowerCase().includes(q) || s.eraLabel.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-foreground/15 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl font-medium text-foreground">Rrëfimet &amp; Letrat</h2>
          <p className="mt-1 text-base text-muted-foreground">
            Shkruani kujtime të reja ose përpunoni ato ekzistuese. Draftet mbeten private derisa t’i publikoni.
          </p>
        </div>
        <Button size="lg" onClick={createNewStory} className="gap-2">
          <Plus className="h-5 w-5" />
          <span>Shkruaj Rrëfim të Ri</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 border border-border bg-card p-1">
          {(
            [
              { id: 'all', label: `Të Gjitha (${cms.stories.length})` },
              {
                id: 'published',
                label: `Të Publikuara (${cms.stories.filter((s) => s.status === 'published').length})`,
              },
              {
                id: 'draft',
                label: `Drafte (${cms.stories.filter((s) => s.status === 'draft').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`whitespace-nowrap shrink-0 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                filter === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kërko një rrëfim..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="divide-y divide-border border-y border-border bg-card">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-serif text-xl text-foreground">Nuk u gjet asnjë rrëfim me këtë filtër.</p>
          </div>
        ) : (
          filtered.map((story) => {
            const cover = getMedia(story.coverImageId);
            return (
              <div
                key={story.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="h-20 w-28 shrink-0 overflow-hidden border border-border">
                    <ArchivalImage
                      src={cover?.url}
                      alt={cover?.alt || story.title}
                      title={story.title}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-sm text-muted-foreground">
                      <span
                        className={`font-medium ${
                          story.status === 'published' ? 'text-primary' : 'text-amber-800'
                        }`}
                      >
                        {story.status === 'published' ? 'I Publikuar' : 'Draft Privat'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{story.eraLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{story.publishedDate}</span>
                    </div>
                    <h3 className="mt-1 font-serif text-2xl font-medium text-foreground">
                      {story.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                      {story.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="default" onClick={() => openEditor(story)}>
                    Ndrysho
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Fshij ${story.title}`}
                    onClick={() => void deleteStory(story.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
