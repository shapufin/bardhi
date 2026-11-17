import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type {
  BookSpread,
  CmsState,
  HeroSettings,
  MediaAsset,
  PageSectionConfig,
  SiteConfig,
  Story,
  TimelineEntry,
} from '@/src/types/cms';

interface CmsContextValue {
  cms: CmsState | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSavedAt: string | null;
  getMedia: (id?: string) => MediaAsset | undefined;
  refreshCms: () => Promise<void>;
  updateSite: (patch: Partial<SiteConfig>) => Promise<void>;
  updateHero: (patch: Partial<HeroSettings>) => Promise<void>;
  updateLayout: (sections: PageSectionConfig[], quoteBand?: CmsState['quoteBand']) => Promise<void>;
  saveStory: (story: Story) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;
  saveBook: (payload: {
    bookTitle?: string;
    bookSubtitle?: string;
    bookCoverImageId?: string;
    bookSpreads?: BookSpread[];
  }) => Promise<void>;
  saveTimeline: (timeline: TimelineEntry[]) => Promise<void>;
  uploadMedia: (payload: {
    title: string;
    caption?: string;
    year?: string;
    alt?: string;
    dataUrl: string;
    aspectRatio?: MediaAsset['aspectRatio'];
  }) => Promise<MediaAsset | null>;
  updateMedia: (id: string, patch: Partial<MediaAsset>) => Promise<void>;
  deleteMedia: (id: string) => Promise<void>;
}

const CmsContext = createContext<CmsContextValue | null>(null);

export function CmsProvider({
  children,
  initialCms = null,
}: {
  children: React.ReactNode;
  /** Server-rendered state; when given, no client fetch is needed for the first paint. */
  initialCms?: CmsState | null;
}) {
  const [cms, setCms] = useState<CmsState | null>(initialCms);
  const [loading, setLoading] = useState(!initialCms);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const refreshCms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/cms');
      if (!res.ok) throw new Error('Nuk u arrit të ngarkohej arkivi përkujtimor.');
      const data = (await res.json()) as CmsState;
      setCms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim në lidhjen me serverin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCms) void refreshCms();
  }, [refreshCms, initialCms]);

  // Keep browser document.title synced with Site Title edited in Admin GUI
  useEffect(() => {
    if (cms?.site.siteTitle) {
      document.title = `${cms.site.siteTitle} · Arkivi & Libri Përkujtimor`;
    }
  }, [cms?.site.siteTitle]);

  const mutate = useCallback(
    async (url: string, method: 'PUT' | 'POST' | 'DELETE', body?: unknown, successMessage?: string) => {
      try {
        setSaving(true);
        const res = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || 'Ndryshimet nuk u ruajtën.');
        }
        const updated = (await res.json()) as CmsState;
        setCms(updated);
        setLastSavedAt(new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }));
        if (successMessage) {
          toast.success(successMessage);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Ruajtja dështoi.');
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const updateSite = useCallback(
    (patch: Partial<SiteConfig>) => mutate('/api/site', 'PUT', patch, 'Identiteti dhe menyja e faqes u ruajtën'),
    [mutate]
  );

  const updateHero = useCallback(
    (patch: Partial<HeroSettings>) => mutate('/api/hero', 'PUT', patch, 'Kryefaqja kryesore u përditësua'),
    [mutate]
  );

  const updateLayout = useCallback(
    (sections: PageSectionConfig[], quoteBand?: CmsState['quoteBand']) =>
      mutate('/api/layout', 'PUT', { sections, quoteBand }, 'Renditja e faqes kryesore u ruajt'),
    [mutate]
  );

  const saveStory = useCallback(
    (story: Story) =>
      mutate(
        '/api/stories',
        'POST',
        story,
        story.status === 'published' ? 'Rrëfimi u publikua' : 'Drafti u ruajt'
      ),
    [mutate]
  );

  const deleteStory = useCallback(
    (id: string) => mutate(`/api/stories/${id}`, 'DELETE', undefined, 'Rrëfimi u fshi'),
    [mutate]
  );

  const saveBook = useCallback(
    (payload: {
      bookTitle?: string;
      bookSubtitle?: string;
      bookCoverImageId?: string;
      bookSpreads?: BookSpread[];
    }) => mutate('/api/book/spreads', 'PUT', payload, 'Faqet e librit u ruajtën'),
    [mutate]
  );

  const saveTimeline = useCallback(
    (timeline: TimelineEntry[]) => mutate('/api/timeline', 'PUT', { timeline }, 'Kronologjia u përditësua'),
    [mutate]
  );

  const uploadMedia = useCallback(
    async (payload: {
      title: string;
      caption?: string;
      year?: string;
      alt?: string;
      dataUrl: string;
      aspectRatio?: MediaAsset['aspectRatio'];
    }): Promise<MediaAsset | null> => {
      try {
        setSaving(true);
        const res = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || 'Nuk u arrit të ngarkohej fotografia.');
        }
        const data = (await res.json()) as { asset: MediaAsset; state: CmsState };
        setCms(data.state);
        setLastSavedAt(new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }));
        toast.success('Fotografia u shtua në album');
        return data.asset;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Ngarkimi dështoi.');
        return null;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const updateMedia = useCallback(
    (id: string, patch: Partial<MediaAsset>) =>
      mutate(`/api/media/${id}`, 'PUT', patch, 'Shënimet e fotografisë u ruajtën'),
    [mutate]
  );

  const deleteMedia = useCallback(
    (id: string) => mutate(`/api/media/${id}`, 'DELETE', undefined, 'Fotografia u hoq nga albumi'),
    [mutate]
  );

  const getMedia = useCallback(
    (id?: string) => {
      if (!cms || !id) return undefined;
      return cms.media.find((m) => m.id === id);
    },
    [cms]
  );

  return (
    <CmsContext.Provider
      value={{
        cms,
        loading,
        saving,
        error,
        lastSavedAt,
        getMedia,
        refreshCms,
        updateSite,
        updateHero,
        updateLayout,
        saveStory,
        deleteStory,
        saveBook,
        saveTimeline,
        uploadMedia,
        updateMedia,
        deleteMedia,
      }}
    >
      {children}
    </CmsContext.Provider>
  );
}

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error('useCms duhet të përdoret brenda CmsProvider');
  return ctx;
}
