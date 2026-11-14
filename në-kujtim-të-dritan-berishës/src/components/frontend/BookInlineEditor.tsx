import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Image as ImageIcon,
  PenLine,
  Plus,
  Quote,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input, Textarea } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Switch } from '@/src/components/ui/switch';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import { MediaPickerDialog } from '@/src/components/admin/MediaLibrary';
import type { BookBlock, BookBlockType, BookSpread, MediaAsset } from '@/src/types/cms';

interface BookInlineEditorProps {
  bookTitle: string;
  bookSubtitle: string;
  bookCoverImageId?: string;
  spreads: BookSpread[];
  spreadIndex: number;
  mediaList: MediaAsset[];
  getMedia: (id?: string) => MediaAsset | undefined;
  saving: boolean;
  onChangeBookTitle: (v: string) => void;
  onChangeBookSubtitle: (v: string) => void;
  onChangeCoverImageId: (id: string) => void;
  onChangeSpreads: (next: BookSpread[]) => void;
  onSelectSpreadIndex: (idx: number) => void;
  onSave: () => Promise<void>;
  onCloseEdit: () => void;
}

export function BookInlineEditor({
  bookTitle,
  bookSubtitle,
  bookCoverImageId,
  spreads,
  spreadIndex,
  mediaList,
  getMedia,
  saving,
  onChangeBookTitle,
  onChangeBookSubtitle,
  onChangeCoverImageId,
  onChangeSpreads,
  onSelectSpreadIndex,
  onSave,
  onCloseEdit,
}: BookInlineEditorProps) {
  const [pickerTarget, setPickerTarget] = useState<{
    kind: 'cover' | 'block';
    side?: 'left' | 'right';
    blockId?: string;
    currentId?: string;
  } | null>(null);

  const safeIdx = Math.min(spreadIndex, Math.max(0, spreads.length - 1));
  const activeSpread = spreads[safeIdx];
  if (!activeSpread) return null;

  const updateSpread = (patch: Partial<BookSpread>) => {
    onChangeSpreads(
      spreads.map((sp, i) => (i === safeIdx ? { ...sp, ...patch } : sp))
    );
  };

  const addSpread = () => {
    const num = spreads.length + 1;
    const created: BookSpread = {
      id: `spread-${Date.now()}`,
      chapterLabel: `Kapitulli ${num}`,
      spreadTitle: 'Faqe e Re Kujtimesh',
      leftPageNumber: spreads.length * 2 + 1,
      rightPageNumber: spreads.length * 2 + 2,
      leftBlocks: [
        {
          id: `blk-${Date.now()}-l`,
          type: 'prose',
          heading: 'Titulli i Faqes së Re',
          content: 'Shkruani kujtimin ose letrën këtu...',
          dropCap: true,
        },
      ],
      rightBlocks: [
        {
          id: `blk-${Date.now()}-r`,
          type: 'photo',
          imageId: mediaList[0]?.id || '',
          content: 'Pllakë Fotografike',
          caption: 'Përshkruani këtë fotografi...',
        },
      ],
    };
    const next = [...spreads, created];
    onChangeSpreads(next);
    onSelectSpreadIndex(next.length - 1);
  };

  const deleteActiveSpread = () => {
    if (spreads.length <= 1) return;
    const remaining = spreads
      .filter((_, i) => i !== safeIdx)
      .map((sp, idx) => ({
        ...sp,
        leftPageNumber: idx * 2 + 1,
        rightPageNumber: idx * 2 + 2,
      }));
    onChangeSpreads(remaining);
    onSelectSpreadIndex(Math.max(0, safeIdx - 1));
  };

  const addBlock = (side: 'left' | 'right', type: BookBlockType) => {
    const newBlock: BookBlock =
      type === 'photo'
        ? {
            id: `blk-${Date.now()}`,
            type: 'photo',
            imageId: mediaList[0]?.id || '',
            content: 'Pllakë Fotografike',
            caption: 'Shënimi poshtë fotografisë...',
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
                content: 'Shkruani një shënim personal...',
              }
            : {
                id: `blk-${Date.now()}`,
                type: 'prose',
                heading: '',
                content: 'Shkruani një paragraf të ri këtu...',
                dropCap: false,
              };

    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    updateSpread({ [key]: [...activeSpread[key], newBlock] });
  };

  const updateBlock = (side: 'left' | 'right', blockId: string, patch: Partial<BookBlock>) => {
    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    updateSpread({
      [key]: activeSpread[key].map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    });
  };

  const removeBlock = (side: 'left' | 'right', blockId: string) => {
    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    updateSpread({ [key]: activeSpread[key].filter((b) => b.id !== blockId) });
  };

  const moveBlock = (side: 'left' | 'right', index: number, dir: -1 | 1) => {
    const key = side === 'left' ? 'leftBlocks' : 'rightBlocks';
    const arr = [...activeSpread[key]];
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= arr.length) return;
    const [item] = arr.splice(index, 1);
    arr.splice(nextIdx, 0, item);
    updateSpread({ [key]: arr });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      {/* Shiriti i sipërm i Modalitetit Edit */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-primary/40 bg-[#faf7ef] p-4 shadow-sm sm:p-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
            Modaliteti Edit Direkt në Libër
          </p>
          <p className="font-serif text-lg text-foreground sm:text-xl">
            Po redaktoni fletën {safeIdx + 1} nga {spreads.length} ({activeSpread.chapterLabel})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={addSpread} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Shto Fletë të Re</span>
          </Button>
          {spreads.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={deleteActiveSpread}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Fshij Fletën</span>
            </Button>
          )}
          <Button type="button" size="sm" disabled={saving} onClick={() => void onSave()} className="gap-1.5">
            <Save className="h-4 w-4" />
            <span>{saving ? 'Po ruhet...' : 'Ruaj Librin'}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCloseEdit} className="gap-1.5">
            <Check className="h-4 w-4" />
            <span>Shiko 3D</span>
          </Button>
        </div>
      </div>

      {/* Të dhënat kryesore të Fletës dhe Librit */}
      <div className="grid grid-cols-1 gap-4 border border-border bg-[#fcfbf7] p-5 md:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Titulli i Librit</Label>
          <Input value={bookTitle} onChange={(e) => onChangeBookTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Nëntitulli i Librit</Label>
          <Input value={bookSubtitle} onChange={(e) => onChangeBookSubtitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Emërtimi i Kapitullit</Label>
          <Input
            value={activeSpread.chapterLabel}
            onChange={(e) => updateSpread({ chapterLabel: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Titulli i Kësaj Flete</Label>
          <Input
            value={activeSpread.spreadTitle}
            onChange={(e) => updateSpread({ spreadTitle: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Kopertina e Librit</Label>
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

      {/* Dy faqet e hapura të Librit për Redaktim Direkt */}
      <div className="grid grid-cols-1 border-2 border-[#1b3b2b]/40 bg-[#faf7ef] shadow-lg lg:grid-cols-2">
        {(
          [
            { side: 'left' as const, label: 'Faqja e Majtë', num: activeSpread.leftPageNumber, blocks: activeSpread.leftBlocks },
            { side: 'right' as const, label: 'Faqja e Djathtë', num: activeSpread.rightPageNumber, blocks: activeSpread.rightBlocks },
          ] as const
        ).map((col, colIdx) => (
          <div
            key={col.side}
            className={`flex flex-col justify-between p-6 sm:p-8 ${
              colIdx === 0 ? 'border-b border-[#dcd6c8] lg:border-b-0 lg:border-r' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b border-[#dcd6c8] pb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                <span>{col.label}</span>
                <span>Faqja {String(col.num).padStart(2, '0')}</span>
              </div>

              <div className="mt-5 space-y-5">
                {col.blocks.map((block, bIdx) => {
                  const media = block.imageId ? getMedia(block.imageId) : undefined;
                  return (
                    <div key={block.id} className="border border-border bg-[#fcfbf7] p-4 shadow-xs">
                      <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-2.5">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {block.type === 'prose'
                            ? 'Paragraf'
                            : block.type === 'photo'
                              ? 'Fotografi'
                              : block.type === 'quote'
                                ? 'Thënie'
                                : 'Shënim'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={bIdx === 0}
                            onClick={() => moveBlock(col.side, bIdx, -1)}
                            className="h-7 w-7"
                            aria-label="Ngjite lart"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={bIdx === col.blocks.length - 1}
                            onClick={() => moveBlock(col.side, bIdx, 1)}
                            className="h-7 w-7"
                            aria-label="Zbrite poshtë"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBlock(col.side, block.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            aria-label="Fshij bllokun"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                        {(block.type === 'prose' || block.type === 'handwritten-note') && (
                          <Input
                            value={block.heading || ''}
                            onChange={(e) => updateBlock(col.side, block.id, { heading: e.target.value })}
                            placeholder="Titull sipas dëshirës..."
                          />
                        )}

                        {block.type === 'photo' ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-4">
                              <div className="h-24 w-32 shrink-0 overflow-hidden border border-border">
                                <ArchivalImage
                                  src={media?.url}
                                  alt={media?.alt || block.content}
                                  className="h-full w-full"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPickerTarget({
                                    kind: 'block',
                                    side: col.side,
                                    blockId: block.id,
                                    currentId: block.imageId,
                                  })
                                }
                                className="gap-1.5"
                              >
                                <ImageIcon className="h-4 w-4" />
                                <span>Ndrysho Fotografinë</span>
                              </Button>
                            </div>
                            <Input
                              value={block.caption || ''}
                              onChange={(e) => updateBlock(col.side, block.id, { caption: e.target.value })}
                              placeholder="Shënimi poshtë fotografisë..."
                            />
                          </div>
                        ) : (
                          <Textarea
                            value={block.content}
                            onChange={(e) => updateBlock(col.side, block.id, { content: e.target.value })}
                            className="min-h-[115px] font-serif text-lg leading-relaxed"
                          />
                        )}

                        {block.type === 'quote' && (
                          <Input
                            value={block.caption || ''}
                            onChange={(e) => updateBlock(col.side, block.id, { caption: e.target.value })}
                            placeholder="Kush e tha ose viti..."
                          />
                        )}

                        {block.type === 'prose' && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-muted-foreground">
                              Shkronjë e madhe fillestare (Drop Cap)
                            </span>
                            <Switch
                              checked={Boolean(block.dropCap)}
                              onCheckedChange={(checked) =>
                                updateBlock(col.side, block.id, { dropCap: checked })
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {col.blocks.length === 0 && (
                  <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Kjo faqe është bosh. Shtoni një paragraf ose fotografi më poshtë.
                  </p>
                )}
              </div>
            </div>

            {/* Shto bllok të ri drejtpërdrejt në këtë faqe */}
            <div className="mt-6 flex flex-wrap gap-2 border-t border-[#dcd6c8] pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock(col.side, 'prose')} className="gap-1.5">
                <PenLine className="h-3.5 w-3.5" />
                <span>+ Paragraf</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock(col.side, 'photo')} className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>+ Fotografi</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock(col.side, 'quote')} className="gap-1.5">
                <Quote className="h-3.5 w-3.5" />
                <span>+ Thënie</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock(col.side, 'handwritten-note')}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Shënim</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <MediaPickerDialog
        open={pickerTarget !== null}
        selectedId={pickerTarget?.currentId}
        onOpenChange={(o) => !o && setPickerTarget(null)}
        onSelect={(mediaId) => {
          if (!pickerTarget) return;
          if (pickerTarget.kind === 'cover') {
            onChangeCoverImageId(mediaId);
          } else if (pickerTarget.side && pickerTarget.blockId) {
            updateBlock(pickerTarget.side, pickerTarget.blockId, { imageId: mediaId });
          }
          setPickerTarget(null);
        }}
      />
    </div>
  );
}
