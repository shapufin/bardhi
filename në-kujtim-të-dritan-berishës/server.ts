import express from 'express';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CMS_STATE } from './server/defaultData.ts';
import type {
  BookSpread,
  CmsState,
  HeroSettings,
  MediaAsset,
  PageSectionConfig,
  SiteConfig,
  Story,
} from './src/types/cms.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms-data.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

async function ensureStorage(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2), 'utf-8');
  }
}

async function readCms(): Promise<CmsState> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CmsState>;
    // Upgrade legacy seed data automatically to full Albanian locale + navMenu
    if (parsed.locale !== 'sq' || !parsed.site?.navMenu) {
      await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2), 'utf-8');
      return DEFAULT_CMS_STATE;
    }
    return parsed as CmsState;
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2), 'utf-8');
    return DEFAULT_CMS_STATE;
  }
}

async function writeCms(next: CmsState): Promise<CmsState> {
  const stamped: CmsState = {
    ...next,
    locale: 'sq',
    updatedAt: new Date().toISOString(),
  };
  await ensureStorage();
  await fs.writeFile(DATA_FILE, JSON.stringify(stamped, null, 2), 'utf-8');
  return stamped;
}

async function startServer(): Promise<void> {
  await ensureStorage();
  const app = express();

  app.use(express.json({ limit: '15mb' }));

  app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/cms', async (_req, res) => {
    try {
      const state = await readCms();
      res.json(state);
    } catch (error) {
      console.error('Gabim gjate leximit te arkivit:', error);
      res.status(500).json({ error: 'Nuk u arrit te ngarkohen te dhenat e arkivit.' });
    }
  });

  app.put('/api/site', async (req, res) => {
    try {
      const current = await readCms();
      const sitePatch = req.body as Partial<SiteConfig>;
      const updated = await writeCms({
        ...current,
        site: {
          ...current.site,
          ...sitePatch,
          navMenu: Array.isArray(sitePatch.navMenu) ? sitePatch.navMenu : current.site.navMenu,
        },
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate ruajtjes se identitetit:', error);
      res.status(500).json({ error: 'Nuk u ruajten te dhenat e faqes.' });
    }
  });

  app.put('/api/hero', async (req, res) => {
    try {
      const current = await readCms();
      const heroPatch = req.body as Partial<HeroSettings>;
      const updated = await writeCms({
        ...current,
        hero: { ...current.hero, ...heroPatch },
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate ruajtjes se ballines:', error);
      res.status(500).json({ error: 'Nuk u ruajt seksioni kryesor.' });
    }
  });

  app.put('/api/layout', async (req, res) => {
    try {
      const current = await readCms();
      const body = req.body as {
        sections?: PageSectionConfig[];
        quoteBand?: CmsState['quoteBand'];
      };
      const updated = await writeCms({
        ...current,
        sections: Array.isArray(body.sections) ? body.sections : current.sections,
        quoteBand: body.quoteBand ? body.quoteBand : current.quoteBand,
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate ruajtjes se renditjes:', error);
      res.status(500).json({ error: 'Nuk u ruajt renditja e faqes.' });
    }
  });

  app.post('/api/stories', async (req, res) => {
    try {
      const current = await readCms();
      const incoming = req.body as Story;
      const existingIndex = current.stories.findIndex((s) => s.id === incoming.id);
      let nextStories = [...current.stories];
      if (existingIndex >= 0) {
        nextStories[existingIndex] = incoming;
      } else {
        nextStories = [incoming, ...nextStories];
      }

      if (incoming.featured) {
        nextStories = nextStories.map((s) => ({
          ...s,
          featured: s.id === incoming.id,
        }));
      }

      const updated = await writeCms({
        ...current,
        stories: nextStories,
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate ruajtjes se rrefimit:', error);
      res.status(500).json({ error: 'Nuk u ruajt rrefimi.' });
    }
  });

  app.delete('/api/stories/:id', async (req, res) => {
    try {
      const current = await readCms();
      const id = req.params.id;
      const nextStories = current.stories.filter((s) => s.id !== id);
      const nextHero =
        current.hero.featuredStoryId === id
          ? {
              ...current.hero,
              featuredStoryId: nextStories[0]?.id ?? '',
            }
          : current.hero;

      const updated = await writeCms({
        ...current,
        stories: nextStories,
        hero: nextHero,
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate fshirjes se rrefimit:', error);
      res.status(500).json({ error: 'Nuk u fshi rrefimi.' });
    }
  });

  app.put('/api/book/spreads', async (req, res) => {
    try {
      const current = await readCms();
      const body = req.body as {
        bookTitle?: string;
        bookSubtitle?: string;
        bookCoverImageId?: string;
        bookSpreads?: BookSpread[];
      };

      const normalizedSpreads = Array.isArray(body.bookSpreads)
        ? body.bookSpreads.map((spread, index) => ({
            ...spread,
            leftPageNumber: index * 2 + 1,
            rightPageNumber: index * 2 + 2,
          }))
        : current.bookSpreads;

      const updated = await writeCms({
        ...current,
        bookTitle: body.bookTitle ?? current.bookTitle,
        bookSubtitle: body.bookSubtitle ?? current.bookSubtitle,
        bookCoverImageId: body.bookCoverImageId ?? current.bookCoverImageId,
        bookSpreads: normalizedSpreads,
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate ruajtjes se librit:', error);
      res.status(500).json({ error: 'Nuk u ruajten faqet e librit.' });
    }
  });

  app.put('/api/timeline', async (req, res) => {
    try {
      const current = await readCms();
      const body = req.body as { timeline: CmsState['timeline'] };
      const updated = await writeCms({
        ...current,
        timeline: Array.isArray(body.timeline) ? body.timeline : current.timeline,
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate ruajtjes se kronologjise:', error);
      res.status(500).json({ error: 'Nuk u ruajt kronologjia.' });
    }
  });

  app.post('/api/media', async (req, res) => {
    try {
      const current = await readCms();
      const { title, caption, year, alt, dataUrl, aspectRatio } = req.body as {
        title: string;
        caption?: string;
        year?: string;
        alt?: string;
        dataUrl: string;
        aspectRatio?: MediaAsset['aspectRatio'];
      };

      const match = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i.exec(dataUrl || '');
      if (!match) {
        res.status(400).json({ error: 'Ju lutemi ngarkoni nje fotografi te vlefshme PNG, JPG ose WebP.' });
        return;
      }

      const ext = match[2].toLowerCase() === 'jpeg' ? 'jpg' : match[2].toLowerCase();
      const buffer = Buffer.from(match[3], 'base64');
      const id = `media-${Date.now()}`;
      const filename = `${id}.${ext}`;
      await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

      const newAsset: MediaAsset = {
        id,
        title: title?.trim() || 'Fotografi Familjare',
        url: `/uploads/${filename}`,
        alt: alt?.trim() || title?.trim() || 'Fotografi arkivore familjare',
        caption: caption?.trim() || '',
        year: year?.trim() || String(new Date().getFullYear()),
        aspectRatio: aspectRatio || '4:3',
        isUpload: true,
      };

      const updated = await writeCms({
        ...current,
        media: [newAsset, ...current.media],
      });
      res.json({ asset: newAsset, state: updated });
    } catch (error) {
      console.error('Gabim gjate ngarkimit te fotografise:', error);
      res.status(500).json({ error: 'Nuk u arrit te ruhej fotografia.' });
    }
  });

  app.put('/api/media/:id', async (req, res) => {
    try {
      const current = await readCms();
      const id = req.params.id;
      const patch = req.body as Partial<MediaAsset>;
      const updated = await writeCms({
        ...current,
        media: current.media.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate perditesimit te fotografise:', error);
      res.status(500).json({ error: 'Nuk u perditesuan te dhenat e fotografise.' });
    }
  });

  app.delete('/api/media/:id', async (req, res) => {
    try {
      const current = await readCms();
      const id = req.params.id;
      const target = current.media.find((m) => m.id === id);
      if (target?.isUpload && target.url.startsWith('/uploads/')) {
        const filePath = path.join(UPLOADS_DIR, path.basename(target.url));
        await fs.unlink(filePath).catch(() => undefined);
      }
      const updated = await writeCms({
        ...current,
        media: current.media.filter((m) => m.id !== id),
      });
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate fshirjes se fotografise:', error);
      res.status(500).json({ error: 'Nuk u fshi fotografia.' });
    }
  });

  app.post('/api/cms/reset', async (_req, res) => {
    try {
      const updated = await writeCms(DEFAULT_CMS_STATE);
      res.json(updated);
    } catch (error) {
      console.error('Gabim gjate rivendosjes:', error);
      res.status(500).json({ error: 'Nuk u rivendos arkivi.' });
    }
  });

  const httpServer = http.createServer(app);
  const hmrDisabled = process.env.DISABLE_HMR === 'true';

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveri i arkivit perkujtimor po punon ne http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gabim fatal gjate nisjes se serverit:', err);
  process.exit(1);
});
