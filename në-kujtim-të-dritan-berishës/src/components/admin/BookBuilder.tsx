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
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  GripVertical,
  Image as ImageIcon,
  PenLine,
  Plus,
  Quote,
  Trash2,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input, Textarea } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/src/components/ui/dialog';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import { MediaPickerDialog } from '@/src/components/admin/MediaLibrary';
import { PhysicalBookReader } from '@/src/components/frontend/PhysicalBookReader';
import { useCms } from '@/src/context/CmsContext';
import type { BookBlock, BookBlockType, BookSpread } from '@/src/types/cms';

export function BookBuilder() {
  const { cms, getMedia, saveBook } = useCms();

  const [bookTitle, setBookTitle] = useState('');
  const [bookSubtitle, setBookSubtitle] = useState('');
  const [bookCoverImageId, setBookCoverImageId] = useState('');
  const [spreads, setSpreads] = useState<BookSpread[]>([]);
  const [selectedSpreadId, setSelectedSpreadId] = useState<string>('');
  const [pickerTarget, setPickerTarget] = useState<{
    kind: 'cover' | 'block';
    side?: 'left' | 'right';
    blockId?: string;
    currentId?: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (cms) {
      setBookTitle(cms.bookTitle);
      setBookSubtitle(cms.bookSubtitle);
      setBookCoverImageId(cms.bookCoverImageId);
      setSpreads(cms.bookSpreads);
      setSelectedSpreadId((prev) =>
        cms.bookSpreads.some((s) => s.id === prev) ? prev : cms.bookSpreads[0]?.id || ''
      );
    }
  }, [cms]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!cms) return null;

  const activeSpread = spreads.find((s) => s.id === selectedSpreadId) || spreads[0];

  const handleSpreadDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSpreads((items) => {
        const oldIdx = items.findIndex((s) => s.id === active.id);
        const newIdx = items.findIndex((s) => s.id === over.id);
        return arrayMove(items, oldIdx, newIdx).map((sp, i) => ({
          ...sp,
          leftPageNumber: i * 2 + 1,
          rightPageNumber: i * 2 + 2,
        }));
      });
    }
  };

  const addSpread = () => {
    const nextNum = spreads.length + 1;
    const created: BookSpread = {
      id: `spread-${Date.now()}`,
      chapterLabel: `Kapitulli ${nextNum}`,
      spreadTitle: 'Faqe të Reja Kujtimesh',
      leftPageNumber: spreads.length * 2 + 1,
      rightPageNumber: spreads.length * 2 + 2,
      leftBlocks: [
        {
          id: `blk-${Date.now()}-l`,
          type: 'prose',
          heading: 'Titulli i Faqes së Re',
          content: 'Shkruani kujtimin tuaj këtu...',
          dropCap: true,
        },
      ],
      rightBlocks: [
        {
          id: `blk-${Date.now()}-r`,
          type: 'photo',
          imageId: cms.media[0]?.id || '',
          content: 'Pllakë Fotografike',
          caption: 'Përshkruani këtë fotografi...',
        },
      ],
    };
    setSpreads((prev) => [...prev, created]);
    setSelectedSpreadId(created.id);
  };

  const deleteSpread = (id: string) => {
    const remaining = spreads
      .filter((s) => s.id !== id)
      .map((sp, i) => ({
        ...sp,
        leftPageNumber: i * 2 + 1,
        rightPageNumber: i * 2 + 2,
      }));
    setSpreads(remaining);
    if (selectedSpreadId === id) {
      setSelectedSpreadId(remaining[0]?.id || '');
    }
  };

  const updateSpread = (id: string, patch: Partial<BookSpread>) => {
    setSpreads((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addBlock = (side: 'left' | 'right', type: BookBlockType) => {
    if (!activeSpread) return;
    const newBlock: BookBlock =
      type === 'photo'
        ? {
            id: `blk-${Date.now()}`,
            type: 'photo',
            imageId: cms.media[0]?.id || '',
            content: 'Pllakë Fotografike',
            caption: 'Shkruani një shënim poshtë fotografisë...',
          }
        : type === 'quote'
          ? {
              id: `blk-${Date.now()}`,
              type: 'quote',
              content: '“Shkruani një thënie ose fjalë të tij...”',
              caption: 'Dritani',
            }
          : type === 'handwritten-note'
            ? {
                id: `blk-${Date.now()}`,
                type: 'handwritten-note',
                heading: 'Shënim Anësor',
                content: 'Shkruani një shënim të shkurtër personal...',
              }
            : {
                id: `blk-${Date.now()}`,
                type: 'prose',
                heading: '',
                content: 'Shkruani një paragraf të ri për këtë faqe...',
                dropCap: false,
              };

    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    updateSpread(activeSpread.id, {
      [key]: [...activeSpread[key], newBlock],
    });
  };

  const updateBlock = (side: 'left' | 'right', blockId: string, patch: Partial<BookBlock>) => {
    if (!activeSpread) return;
    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    updateSpread(activeSpread.id, {
      [key]: activeSpread[key].map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    });
  };

  const removeBlock = (side: 'left' | 'right', blockId: string) => {
    if (!activeSpread) return;
    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    updateSpread(activeSpread.id, {
      [key]: activeSpread[key].filter((b) => b.id !== blockId),
    });
  };

  const reorderBlocks = (side: 'left' | 'right', oldIdx: number, newIdx: number) => {
    if (!activeSpread) return;
    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    if (newIdx < 0 || newIdx >= activeSpread[key].length) return;
    updateSpread(activeSpread.id, {
      [key]: arrayMove(activeSpread[key], oldIdx, newIdx),
    });
  };

  return (
    <div className="space-y-10">
      {/* Kreu i Librit */}
      <section className="border-b border-border pb-8">
        <div className="flex flex-col gap-4 border-b border-foreground/15 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-medium text-foreground">
              Ndërtuesi Vizual i Librit 3D
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              Tërhiqni fletët për t’i renditur, pastaj shtoni tekst, fotografi ose shënime në Faqen e Majtë dhe të Djathtë.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="lg" onClick={() => setPreviewOpen(true)} className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Provo Librin 3D</span>
            </Button>
            <Button
              size="lg"
              onClick={() =>
                void saveBook({
                  bookTitle,
                  bookSubtitle,
                  bookCoverImageId,
                  bookSpreads: spreads,
                })
              }
            >
              Ruaj Faqet e Librit
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-base">Titulli i Librit</Label>
            <Input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Nëntitulli i Librit</Label>
            <Input value={bookSubtitle} onChange={(e) => setBookSubtitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Fotografia e Kopertinës</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerTarget({ kind: 'cover', currentId: bookCoverImageId })}
              className="h-11 w-full justify-start gap-2"
            >
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{getMedia(bookCoverImageId)?.title || 'Zgjidh Kopertinën'}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 1. Renditja e Fleteve Dyshe */}
      <section className="border-b border-border pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <div>
            <h3 className="font-serif text-2xl font-medium text-foreground">
              1. Tërhiqni për të Renditur Fletët ({spreads.length})
            </h3>
            <p className="text-sm text-muted-foreground">
              Klikoni mbi çdo fletë më poshtë për të redaktuar faqen e majtë dhe të djathtë.
            </p>
          </div>
          <Button variant="outline" onClick={addSpread} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Shto Fletë të Re Dyshe</span>
          </Button>
        </div>

        <div className="mt-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSpreadDragEnd}>
            <SortableContext items={spreads} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {spreads.map((sp) => (
                  <SortableSpreadTile
                    key={sp.id}
                    spread={sp}
                    selected={sp.id === activeSpread?.id}
                    onSelect={() => setSelectedSpreadId(sp.id)}
                    onDelete={() => deleteSpread(sp.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </section>

      {/* 2. Redaktori i Faqes se Majte & te Djathte */}
      {activeSpread && (
        <section>
          <div className="grid grid-cols-1 gap-5 border-b border-border pb-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-base">Emërtimi i Kapitullit</Label>
              <Input
                value={activeSpread.chapterLabel}
                onChange={(e) => updateSpread(activeSpread.id, { chapterLabel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base">Titulli i Fletës</Label>
              <Input
                value={activeSpread.spreadTitle}
                onChange={(e) => updateSpread(activeSpread.id, { spreadTitle: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
            <PageColumnEditor
              title={`Faqja e Majtë (Faqja ${activeSpread.leftPageNumber})`}
              blocks={activeSpread.leftBlocks}
              getMedia={getMedia}
              onAddBlock={(type) => addBlock('left', type)}
              onUpdateBlock={(id, patch) => updateBlock('left', id, patch)}
              onRemoveBlock={(id) => removeBlock('left', id)}
              onReorder={(oldIdx, newIdx) => reorderBlocks('left', oldIdx, newIdx)}
              onPickImage={(blockId, currentId) =>
                setPickerTarget({ kind: 'block', side: 'left', blockId, currentId })
              }
            />

            <PageColumnEditor
              title={`Faqja e Djathtë (Faqja ${activeSpread.rightPageNumber})`}
              blocks={activeSpread.rightBlocks}
              getMedia={getMedia}
              onAddBlock={(type) => addBlock('right', type)}
              onUpdateBlock={(id, patch) => updateBlock('right', id, patch)}
              onRemoveBlock={(id) => removeBlock('right', id)}
              onReorder={(oldIdx, newIdx) => reorderBlocks('right', oldIdx, newIdx)}
              onPickImage={(blockId, currentId) =>
                setPickerTarget({ kind: 'block', side: 'right', blockId, currentId })
              }
            />
          </div>
        </section>
      )}

      <MediaPickerDialog
        open={pickerTarget !== null}
        selectedId={pickerTarget?.currentId}
        onOpenChange={(o) => !o && setPickerTarget(null)}
        onSelect={(mediaId) => {
          if (!pickerTarget) return;
          if (pickerTarget.kind === 'cover') {
            setBookCoverImageId(mediaId);
          } else if (pickerTarget.side && pickerTarget.blockId) {
            updateBlock(pickerTarget.side, pickerTarget.blockId, { imageId: mediaId });
          }
          setPickerTarget(null);
        }}
      />

      {/* Provo Librin 3D */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[90vh] max-h-[90vh] overflow-hidden bg-background p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Pamja e Librit 3D</DialogTitle>
            <DialogDescription>Provoni shfletimin fizik të faqeve të librit tuaj.</DialogDescription>
          </DialogHeader>
          <PhysicalBookReader
            bookTitle={bookTitle}
            bookSubtitle={bookSubtitle}
            authorName={cms.site.authorName}
            bookCoverImageId={bookCoverImageId}
            spreads={spreads}
            getMedia={getMedia}
            onExitBook={() => setPreviewOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableSpreadTile({
  spread,
  selected,
  onSelect,
  onDelete,
}: {
  spread: BookSpread;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: spread.id,
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
      className={`flex items-center gap-3 border p-3.5 transition-colors ${
        selected
          ? 'border-primary bg-secondary/75 ring-1 ring-primary/30'
          : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Tërhiq ${spread.spreadTitle}`}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left cursor-pointer">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {spread.chapterLabel} · f. {spread.leftPageNumber}–{spread.rightPageNumber}
        </p>
        <p className="truncate font-serif text-lg font-medium text-foreground">
          {spread.spreadTitle}
        </p>
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Fshij ${spread.spreadTitle}`}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function PageColumnEditor({
  title,
  blocks,
  getMedia,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onReorder,
  onPickImage,
}: {
  title: string;
  blocks: BookBlock[];
  getMedia: (id?: string) => ReturnType<ReturnType<typeof useCms>['getMedia']>;
  onAddBlock: (type: BookBlockType) => void;
  onUpdateBlock: (id: string, patch: Partial<BookBlock>) => void;
  onRemoveBlock: (id: string) => void;
  onReorder: (oldIdx: number, newIdx: number) => void;
  onPickImage: (blockId: string, currentId?: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = blocks.findIndex((b) => b.id === active.id);
      const newIdx = blocks.findIndex((b) => b.id === over.id);
      onReorder(oldIdx, newIdx);
    }
  };

  return (
    <div className="flex flex-col border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
        <h4 className="font-serif text-2xl font-medium text-foreground">{title}</h4>
        <span className="font-mono text-xs text-muted-foreground">{blocks.length} blloqe</span>
      </div>

      <div className="mt-5 flex-1 space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
            {blocks.map((block, idx) => (
              <SortableBlockCard
                key={block.id}
                block={block}
                index={idx}
                total={blocks.length}
                getMedia={getMedia}
                onChange={(patch) => onUpdateBlock(block.id, patch)}
                onRemove={() => onRemoveBlock(block.id)}
                onMove={(dir) => onReorder(idx, idx + dir)}
                onPickImage={() => onPickImage(block.id, block.imageId)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Kjo faqe është bosh. Përdorni butonat poshtë për të shtuar tekst ose fotografi.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" size="sm" onClick={() => onAddBlock('prose')} className="gap-1.5">
          <PenLine className="h-3.5 w-3.5" />
          <span>+ Paragraf</span>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onAddBlock('photo')} className="gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>+ Fotografi</span>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onAddBlock('quote')} className="gap-1.5">
          <Quote className="h-3.5 w-3.5" />
          <span>+ Thënie</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onAddBlock('handwritten-note')}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Shënim</span>
        </Button>
      </div>
    </div>
  );
}

function SortableBlockCard({
  block,
  index,
  total,
  getMedia,
  onChange,
  onRemove,
  onMove,
  onPickImage,
}: {
  block: BookBlock;
  index: number;
  total: number;
  getMedia: (id?: string) => ReturnType<ReturnType<typeof useCms>['getMedia']>;
  onChange: (patch: Partial<BookBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onPickImage: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 1,
  };

  const typeLabel =
    block.type === 'prose'
      ? 'Paragraf Rrëfimi'
      : block.type === 'photo'
        ? 'Pllakë Fotografike'
        : block.type === 'quote'
          ? 'Thënie e Veçuar'
          : 'Shënim Personal';

  const media = block.imageId ? getMedia(block.imageId) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border bg-background p-4 ${isDragging ? 'border-primary shadow-md' : 'border-border'}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Tërhiq bllokun"
            className="inline-flex h-8 w-8 items-center justify-center border border-border bg-card text-muted-foreground cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {typeLabel}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Ngjite lart"
            className="h-8 w-8"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Zbrite poshtë"
            className="h-8 w-8"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Hiq bllokun"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {(block.type === 'prose' || block.type === 'handwritten-note') && (
          <Input
            value={block.heading || ''}
            onChange={(e) => onChange({ heading: e.target.value })}
            placeholder="Titull sipas dëshirës..."
          />
        )}

        {block.type === 'photo' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-20 w-28 shrink-0 overflow-hidden border border-border">
                <ArchivalImage src={media?.url} alt={media?.alt || block.content} className="h-full w-full" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={onPickImage} className="gap-1.5">
                <ImageIcon className="h-4 w-4" />
                <span>Zgjidh Fotografi</span>
              </Button>
            </div>
            <Input
              value={block.caption || ''}
              onChange={(e) => onChange({ caption: e.target.value })}
              placeholder="Shënimi poshtë fotografisë..."
            />
          </div>
        ) : (
          <Textarea
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="min-h-[95px] font-serif text-lg"
          />
        )}

        {block.type === 'quote' && (
          <Input
            value={block.caption || ''}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Kush e tha ose viti..."
          />
        )}

        {block.type === 'prose' && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">Shkronjë e madhe fillestare (Drop Cap)</span>
            <Switch
              checked={Boolean(block.dropCap)}
              onCheckedChange={(checked) => onChange({ dropCap: checked })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
