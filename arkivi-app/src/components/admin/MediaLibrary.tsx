import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input, Textarea } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog';
import { ArchivalImage } from '@/src/components/ArchivalImage';
import { useCms } from '@/src/context/CmsContext';
import type { MediaAsset } from '@/src/types/cms';

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Skedari nuk u lexua dot.'));
    reader.readAsDataURL(file);
  });
}

export function MediaPickerDialog({
  open,
  selectedId,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  selectedId?: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (mediaId: string) => void;
}) {
  const { cms, uploadMedia } = useCms();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Ju lutemi ngarkoni një fotografi të vlefshme (PNG, JPG, WebP).');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      toast.error('Fotografia është më e madhe se 5MB. Ju lutemi zgjidhni një fotografi më të vogël.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      const created = await uploadMedia({
        title: cleanName || 'Fotografi e Ngarkuar',
        dataUrl,
        year: String(new Date().getFullYear()),
      });
      if (created) {
        onSelect(created.id);
        onOpenChange(false);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle>Zgjidhni një Fotografi</DialogTitle>
          <DialogDescription>
            Zgjidhni një fotografi nga arkivi ose ngarkoni një fotografi të re nga kompjuteri juaj.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex items-center justify-between border-b border-border pb-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="gap-2"
          >
            <ImagePlus className="h-4 w-4" />
            <span>{uploading ? 'Duke ngarkuar...' : 'Ngarko Foto nga Kompjuteri'}</span>
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {cms?.media.length ?? 0} fotografi
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {cms?.media.map((item) => {
            const isSelected = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onOpenChange(false);
                }}
                className={`group relative overflow-hidden border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <ArchivalImage src={item.url} alt={item.alt} title={item.title} className="h-full w-full" />
                </div>
                {isSelected && (
                  <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                <div className="p-2.5">
                  <p className="truncate font-serif text-base font-medium text-foreground">{item.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">{item.year}</p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MediaLibrary() {
  const { cms, uploadMedia, updateMedia, deleteMedia } = useCms();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [year, setYear] = useState('2023');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<MediaAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Ju lutemi ngarkoni një fotografi të vlefshme (PNG, JPG, WebP).');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      toast.error('Fotografia është më e madhe se 5MB. Ju lutemi zgjidhni një fotografi më të vogël.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const fallbackTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      await uploadMedia({
        title: title.trim() || fallbackTitle || 'Fotografi Familjare',
        caption: caption.trim(),
        year: year.trim() || '2024',
        dataUrl,
      });
      setTitle('');
      setCaption('');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!cms) return null;

  return (
    <div className="space-y-10">
      {/* Shtimi i nje fotografie */}
      <section className="border-b border-border pb-8">
        <h2 className="font-serif text-3xl font-medium text-foreground">Shto një Fotografi të Re</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Shkruani një titull të shkurtër dhe vitin, pastaj zgjidhni fotografinë nga kompjuteri juaj.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="upload-title" className="text-base">Titulli i Fotografisë</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p.sh., Vera në Liqen"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-year" className="text-base">Viti</Label>
            <Input
              id="upload-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="p.sh., 2019"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-caption" className="text-base">Përshkrim i Shkurtër</Label>
            <Input
              id="upload-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Shënim kujtimi (sipas dëshirës)"
            />
          </div>
        </div>

        <div className="mt-6">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            size="lg"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="gap-2.5"
          >
            <ImagePlus className="h-5 w-5" />
            <span>{uploading ? 'Duke Ruajtur...' : 'Zgjidh Fotografi nga Kompjuteri'}</span>
          </Button>
        </div>
      </section>

      {/* Albumi i Fotografive */}
      <section>
        <h3 className="font-serif text-2xl font-medium text-foreground">
          Fotografitë e Ruajtura ({cms.media.length})
        </h3>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {cms.media.map((item) => (
            <div key={item.id} className="flex flex-col border-b border-border pb-5">
              <div className="aspect-[4/3] w-full overflow-hidden border border-border">
                <ArchivalImage src={item.url} alt={item.alt} title={item.title} className="h-full w-full" />
              </div>
              <div className="flex flex-1 flex-col pt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-serif text-xl font-medium text-foreground">{item.title}</h4>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{item.year}</span>
                </div>
                <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
                  {item.caption || 'Pa përshkrim ende.'}
                </p>

                <div className="mt-4 flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(item)}>
                    Ndrysho Shënimin
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Fshij ${item.title}`}
                    onClick={() => setDeletingMedia(item)}
                    className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Fshij nga albumi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dritarja per ndryshimin e shenimeve */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg bg-card p-6">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>Ndrysho Shënimet e Fotografisë</DialogTitle>
                <DialogDescription>
                  Përditësoni titullin, vitin ose shënimin që shfaqet poshtë kësaj fotografie.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-base">Titulli</Label>
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Viti</Label>
                  <Input
                    value={editing.year}
                    onChange={(e) => setEditing({ ...editing, year: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">Përshkrimi</Label>
                  <Textarea
                    value={editing.caption}
                    onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>
                    Anulo
                  </Button>
                  <Button
                    onClick={async () => {
                      await updateMedia(editing.id, {
                        title: editing.title,
                        year: editing.year,
                        caption: editing.caption,
                      });
                      setEditing(null);
                    }}
                  >
                    Ruaj Shënimet
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dritarja per konfirmimin e fshirjes se fotografise */}
      <Dialog open={deletingMedia !== null} onOpenChange={(o) => !o && !isDeleting && setDeletingMedia(null)}>
        <DialogContent className="max-w-md bg-card p-6">
          {deletingMedia && (
            <>
              <DialogHeader>
                <DialogTitle>Fshij Fotografinë nga Albumi</DialogTitle>
                <DialogDescription>
                  A jeni i sigurt që dëshironi ta fshini fotografinë &ldquo;{deletingMedia.title}&rdquo; nga albumi? Nëse kjo fotografi përdoret në faqe, kopertinë apo libër, referenca do të hiqet automatikisht.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeletingMedia(null)} disabled={isDeleting}>
                  Anulo
                </Button>
                <Button
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={async () => {
                    try {
                      setIsDeleting(true);
                      await deleteMedia(deletingMedia.id);
                      setDeletingMedia(null);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{isDeleting ? 'Duke fshirë...' : 'Po, Fshij Fotografinë'}</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
