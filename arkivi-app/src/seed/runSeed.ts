import configPromise from '@payload-config';
import { getPayload } from 'payload';
import { DEFAULT_CMS_STATE } from '../lib/defaultData';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

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
    const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@arkivi.local').trim();
    const isProduction = process.env.NODE_ENV === 'production';
    let adminPassword = process.env.INITIAL_ADMIN_PASSWORD?.trim() || '';
    if (!adminPassword) {
      // In production never fall back to a known password — generate a random one and log it once.
      adminPassword = isProduction
        ? crypto.randomBytes(12).toString('hex')
        : 'Arkivi2026!';
      if (isProduction) {
        console.log(`[SEED] INITIAL_ADMIN_PASSWORD nuk u caktua në .env — u gjenerua fjalëkalim i rastësishëm për ${adminEmail}: ${adminPassword}`);
        console.log('[SEED] Ruajeni këtë fjalëkalim dhe fshini logun e nisjes.');
      }
    }
    const adminName = (process.env.INITIAL_ADMIN_NAME || 'Administrator Teknik').trim();

    console.log(`[SEED] Po krijohet administratori teknik fillestar (${adminEmail})...`);
    await payload.create({
      collection: 'users',
      data: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: 'superuser',
      },
    });
    console.log(`[SEED] Administratori u krijua me sukses: ${adminEmail} (superuser)`);
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
