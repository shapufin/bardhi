import configPromise from '@payload-config';
import { getPayload } from 'payload';
import type { CmsState } from '@/src/types/cms';
import { DEFAULT_CMS_STATE } from '@/src/lib/defaultData';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cms-data.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function ensureStorage(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2), 'utf-8');
  }
}

export async function getPayloadClient() {
  return await getPayload({ config: configPromise });
}

export async function getCmsState(): Promise<CmsState> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CmsState>;
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

export async function saveCmsState(next: CmsState): Promise<CmsState> {
  await ensureStorage();
  const stamped: CmsState = {
    ...next,
    locale: 'sq',
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(DATA_FILE, JSON.stringify(stamped, null, 2), 'utf-8');
  return stamped;
}
