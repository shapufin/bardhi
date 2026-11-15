import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input, Textarea } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import { MediaPickerDialog } from '@/src/components/admin/MediaLibrary';
import { useCms } from '@/src/context/CmsContext';
import type { HeroAnimationStyle, PageSectionConfig, StoriesLayoutVariant } from '@/src/types/cms';

export function HomeHeroEditor() {
  const { cms, getMedia, updateHero, updateLayout, updateSite } = useCms();

  const [siteDraft, setSiteDraft] = useState(cms?.site ?? null);
  const [heroDraft, setHeroDraft] = useState(cms?.hero ?? null);
  const [sectionsDraft, setSectionsDraft] = useState<PageSectionConfig[]>(cms?.sections ?? []);
  const [quoteDraft, setQuoteDraft] = useState(cms?.quoteBand ?? { quote: '', attribution: '' });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (cms) {
      setSiteDraft(cms.site);
      setHeroDraft(cms.hero);
      setSectionsDraft(cms.sections);
      setQuoteDraft(cms.quoteBand);
    }
  }, [cms]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!cms || !siteDraft || !heroDraft) return null;

  const publishedStories = cms.stories.filter((s) => s.status === 'published');
  const heroMedia = getMedia(heroDraft.heroImageId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSectionsDraft((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id);
        const newIdx = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= sectionsDraft.length) return;
    setSectionsDraft((items) => arrayMove(items, idx, nextIdx));
  };

  return (
    <div className="space-y-12">
      {/* 1. Titulli i Faqes, Identiteti & Menaxhimi i Menysë */}
      <section className="border-b border-border pb-10">
        <div className="flex flex-col gap-3 border-b border-foreground/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-medium text-foreground">
              Titulli i Faqes &amp; Menyja Kryesore
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              Ndryshoni titullin kryesor të faqes dhe zgjidhni cilat lidhje të menysë shfaqen lart.
            </p>
          </div>
          <Button size="lg" onClick={() => void updateSite(siteDraft)}>
            Ruaj Titullin &amp; Menynë
          </Button>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="site-title" className="text-base">Titulli i Faqes (shfaqet në krye)</Label>
            <Input
              id="site-title"
              value={siteDraft.siteTitle}
              onChange={(e) => setSiteDraft({ ...siteDraft, siteTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="honoree-name" className="text-base">Emri i të Nderuarit</Label>
            <Input
              id="honoree-name"
              value={siteDraft.honoreeName}
              onChange={(e) => setSiteDraft({ ...siteDraft, honoreeName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="years-label" className="text-base">Vitet (Lindja · Rënia)</Label>
            <Input
              id="years-label"
              value={siteDraft.yearsLabel}
              onChange={(e) => setSiteDraft({ ...siteDraft, yearsLabel: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author-name" className="text-base">Emri i Autorit (Babai)</Label>
            <Input
              id="author-name"
              value={siteDraft.authorName}
              onChange={(e) => setSiteDraft({ ...siteDraft, authorName: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="dedication-line" className="text-base">Fjalia e Kushtimit</Label>
            <Input
              id="dedication-line"
              value={siteDraft.dedicationLine}
              onChange={(e) => setSiteDraft({ ...siteDraft, dedicationLine: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="footer-note" className="text-base">Shënimi në Fund të Faqes</Label>
            <Input
              id="footer-note"
              value={siteDraft.footerNote}
              onChange={(e) => setSiteDraft({ ...siteDraft, footerNote: e.target.value })}
            />
          </div>
        </div>

        {/* Kontrolli i Lidhjeve të Menysë (Fsheh / Shfaq / Riemërto) */}
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-serif text-xl font-medium text-foreground">
            Lidhjet e Menysë së Sipërme
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Fikni çdo buton të menysë që nuk ju nevojitet ose ndryshoni emrin e tij.
          </p>

          <div className="mt-4 divide-y divide-border border border-border bg-card">
            {siteDraft.navMenu.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="flex flex-1 items-center gap-4 min-w-[220px]">
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      setSiteDraft({
                        ...siteDraft,
                        navMenu: siteDraft.navMenu.map((m) =>
                          m.id === item.id ? { ...m, label: e.target.value } : m
                        ),
                      })
                    }
                    className="max-w-xs"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {item.enabled ? 'Shfaqet në menu' : 'E fshehur'}
                  </span>
                  <Switch
                    checked={item.enabled}
                    onCheckedChange={(checked) =>
                      setSiteDraft({
                        ...siteDraft,
                        navMenu: siteDraft.navMenu.map((m) =>
                          m.id === item.id ? { ...m, enabled: checked } : m
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Seksioni Kryesor (Hero) & Animacioni */}
      <section className="border-b border-border pb-10">
        <div className="flex flex-col gap-3 border-b border-foreground/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-medium text-foreground">
              Ballina Kryesore &amp; Rrëfimi i Veçuar
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              Pamja e parë që shohin vizitorët kur hapin faqen përkujtimore.
            </p>
          </div>
          <Button size="lg" onClick={() => void updateHero(heroDraft)}>
            Ruaj Ballinën
          </Button>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <div className="space-y-2">
              <Label htmlFor="hero-kicker" className="text-base">Shiriti i Sipërm</Label>
              <Input
                id="hero-kicker"
                value={heroDraft.kicker}
                onChange={(e) => setHeroDraft({ ...heroDraft, kicker: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-headline" className="text-base">Titulli Kryesor i Ballinës</Label>
              <Input
                id="hero-headline"
                value={heroDraft.headline}
                onChange={(e) => setHeroDraft({ ...heroDraft, headline: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-subheadline" className="text-base">Fjala Hyrëse</Label>
              <Textarea
                id="hero-subheadline"
                value={heroDraft.subheadline}
                onChange={(e) => setHeroDraft({ ...heroDraft, subheadline: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-base">Rrëfimi i Lidhur Kryesor</Label>
                {/* ds-allow-native-select */}
                <Select
                  value={heroDraft.featuredStoryId}
                  onValueChange={(val) => setHeroDraft({ ...heroDraft, featuredStoryId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zgjidhni një rrëfim" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishedStories.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hero-cta" className="text-base">Teksti i Butonit Kryesor</Label>
                <Input
                  id="hero-cta"
                  value={heroDraft.primaryCtaLabel}
                  onChange={(e) => setHeroDraft({ ...heroDraft, primaryCtaLabel: e.target.value })}
                />
              </div>
            </div>

            {/* Kontrolli i Animacionit te Ballines */}
            <div className="border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <Label htmlFor="hero-motion-switch" className="text-base font-medium">
                      Animacion i Qetë në Ballinë
                    </Label>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Shton një lëvizje të ngadaltë e të qetë te portreti dhe teksti hyrës. Fikeni për pamje plotësisht statike.
                  </p>
                </div>
                <Switch
                  id="hero-motion-switch"
                  checked={heroDraft.animationEnabled}
                  onCheckedChange={(checked) =>
                    setHeroDraft({
                      ...heroDraft,
                      animationEnabled: checked,
                      animationStyle:
                        checked && heroDraft.animationStyle === 'none'
                          ? 'gentle-drift'
                          : heroDraft.animationStyle,
                    })
                  }
                />
              </div>

              {heroDraft.animationEnabled && (
                <div className="mt-4 max-w-xs space-y-2 border-t border-border pt-4">
                  <Label className="text-sm">Lloji i Animacionit</Label>
                  {/* ds-allow-native-select */}
                  <Select
                    value={heroDraft.animationStyle}
                    onValueChange={(val) =>
                      setHeroDraft({ ...heroDraft, animationStyle: val as HeroAnimationStyle })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gentle-drift">Lëvizje e Ngadaltë e Portretit</SelectItem>
                      <SelectItem value="soft-fade">Shfaqje e Butë Hyrëse</SelectItem>
                      <SelectItem value="none">Pa Animacion (Statike)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Fotoja e Portretit */}
          <div className="space-y-4 lg:col-span-5">
            <Label className="text-base">Fotografia e Portretit në Ballinë</Label>
            <div className="aspect-[3/4] max-h-[390px] w-full overflow-hidden border border-border bg-card">
              <ArchivalImage
                src={heroMedia?.url}
                alt={heroMedia?.alt || 'Portreti i ballinës'}
                title={heroMedia?.title}
                className="h-full w-full"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setPickerOpen(true)}
              className="w-full gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Ndrysho Fotografinë e Ballinës</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 3. Renditja dhe Fshehja e Seksioneve te Faqes */}
      <section className="pb-6">
        <div className="flex flex-col gap-3 border-b border-foreground/15 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-medium text-foreground">
              Renditja e Seksioneve të Faqes
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              Tërhiqni seksionet për t’i renditur, fikni çdo seksion që nuk doni, ose ndryshoni mënyrën si shfaqen rrëfimet.
            </p>
          </div>
          <Button size="lg" onClick={() => void updateLayout(sectionsDraft, quoteDraft)}>
            Ruaj Renditjen e Faqes
          </Button>
        </div>

        <div className="mt-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionsDraft} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sectionsDraft.map((section, idx) => (
                  <SortableSectionRow
                    key={section.id}
                    section={section}
                    index={idx}
                    total={sectionsDraft.length}
                    onMove={(dir) => moveSection(idx, dir)}
                    onChange={(patch) =>
                      setSectionsDraft((prev) =>
                        prev.map((item) => (item.id === section.id ? { ...item, ...patch } : item))
                      )
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Teksti i Thenies Perkujtimore */}
        <div className="mt-8 border border-border bg-card p-6">
          <h3 className="font-serif text-xl font-medium text-foreground">
            Teksti i Thënies Përkujtimore
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm">Thënia</Label>
              <Input
                value={quoteDraft.quote}
                onChange={(e) => setQuoteDraft({ ...quoteDraft, quote: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Burimi / Autori</Label>
              <Input
                value={quoteDraft.attribution}
                onChange={(e) => setQuoteDraft({ ...quoteDraft, attribution: e.target.value })}
              />
            </div>
          </div>
        </div>
      </section>

      <MediaPickerDialog
        open={pickerOpen}
        selectedId={heroDraft.heroImageId}
        onOpenChange={setPickerOpen}
        onSelect={(mediaId) => setHeroDraft({ ...heroDraft, heroImageId: mediaId })}
      />
    </div>
  );
}

function SortableSectionRow({
  section,
  index,
  total,
  onMove,
  onChange,
}: {
  section: PageSectionConfig;
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onChange: (patch: Partial<PageSectionConfig>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border p-5 transition-colors ${
        isDragging
          ? 'border-primary bg-secondary shadow-lg'
          : section.enabled
            ? 'border-border bg-card'
            : 'border-border/60 bg-secondary/40 opacity-75'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Tërhiq ${section.label}`}
            className="inline-flex h-10 w-10 items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div>
            <p className="font-serif text-xl font-medium text-foreground">{section.label}</p>
            <p className="text-xs text-muted-foreground">
              {section.enabled ? 'Shfaqet në faqen kryesore' : 'E fshehur për vizitorët'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Ngjite lart"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Zbrite poshtë"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 pl-2">
            <span className="text-sm font-medium text-foreground">
              {section.enabled ? 'Shfaqet' : 'Fshehur'}
            </span>
            <Switch
              checked={section.enabled}
              onCheckedChange={(checked) => onChange({ enabled: checked })}
            />
          </div>
        </div>
      </div>

      {section.type !== 'hero' && section.type !== 'quote-band' && (
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Titulli i Seksionit</Label>
            <Input
              value={section.heading}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nëntitulli</Label>
            <Input
              value={section.subheading}
              onChange={(e) => onChange({ subheading: e.target.value })}
            />
          </div>
          {section.type === 'stories-feed' && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pamja e Rrëfimeve</Label>
              {/* ds-allow-native-select */}
              <Select
                value={section.storiesVariant || 'editorial-grid'}
                onValueChange={(val) => onChange({ storiesVariant: val as StoriesLayoutVariant })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editorial-grid">Kolona Gazetareske (Rrjetë)</SelectItem>
                  <SelectItem value="chronicle-list">Indeks Letrar (Listë)</SelectItem>
                  <SelectItem value="masonry">Mozaik Pllakash (Masonry)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
