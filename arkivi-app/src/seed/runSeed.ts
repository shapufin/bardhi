import configPromise from '@payload-config';
import { getPayload } from 'payload';
import { DEFAULT_CMS_STATE } from '../lib/defaultData';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms-data.json');

export async function runSeed() {
  console.log('[SEED] Po inicializohet baza e të dhënave PayloadCMS dhe Arkivi...');

  // 1. Siguro skedarin JSON të arkivit
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
    console.log('[SEED] cms-data.json ekziston.');
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2), 'utf-8');
    console.log('[SEED] cms-data.json u krijua me të dhënat fillestare.');
  }

  // 2. Inicializo Payload Client
  const payload = await getPayload({ config: configPromise });

  // 3. Kontrollo dhe krijo Super Administratorin Teknik
  const existingUsers = await payload.find({
    collection: 'users',
    limit: 1,
  });

  if (existingUsers.totalDocs === 0) {
    console.log('[SEED] Po krijohet administratori teknik fillestar...');
    await payload.create({
      collection: 'users',
      data: {
        email: 'admin@arkivi.local',
        password: 'Arkivi2026!',
        name: 'Administrator Teknik',
        role: 'superuser',
      },
    });
    console.log('[SEED] Administratori u krijua: admin@arkivi.local / Arkivi2026!');
  } else {
    console.log(`[SEED] Ekzistojnë ${existingUsers.totalDocs} përdorues në Payload.`);
  }

  // 4. Kontrollo dhe inicializo tregimet në SQLite nëse është bosh
  const existingStories = await payload.find({
    collection: 'stories',
    limit: 1,
  });

  if (existingStories.totalDocs === 0) {
    console.log('[SEED] Po inicializohen tregimet në Payload SQLite...');
    for (const story of DEFAULT_CMS_STATE.stories) {
      try {
        await payload.create({
          collection: 'stories',
          data: {
            title: story.title,
            subtitle: story.subtitle,
            eraLabel: story.eraLabel,
            publishedDate: story.publishedDate,
            readingMinutes: story.readingMinutes,
            bodyParagraphs: story.bodyParagraphs.map((p) => ({ text: p })),
            pullQuote: story.pullQuote || '',
            status: story.status,
            featured: story.featured,
          },
        });
      } catch (err) {
        console.warn(`[SEED] Paralajmërim gjatë krijimit të tregimit ${story.title}:`, err);
      }
    }
    console.log('[SEED] Tregimet u inicializuan në Payload SQLite.');
  }

  console.log('[SEED] Inicializimi përfundoi me sukses.');
}

// Ekzekuto direkt nëse thirret nga CLI
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED] Gabim:', err);
      process.exit(1);
    });
}
