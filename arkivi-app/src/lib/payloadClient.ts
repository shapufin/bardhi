import configPromise from '@payload-config';
import { getPayload } from 'payload';
import type { CmsState } from '@/src/types/cms';
import { DEFAULT_CMS_STATE } from '@/src/lib/defaultData';
import fs from 'node:fs/promises';
import path from 'node:path';

import { APP_ROOT, DATA_ROOT, DATA_DIR, DATA_FILE, UPLOADS_DIR, getAppRoot } from '@/src/lib/dataPaths';
export { APP_ROOT, DATA_ROOT, DATA_DIR, DATA_FILE, UPLOADS_DIR, getAppRoot };

async function atomicWriteFile(targetPath: string, content: string): Promise<void> {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = path.join(
    dir,
    `.${path.basename(targetPath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );
  await fs.writeFile(tempPath, content, 'utf-8');

  let written = false;
  try {
    const maxRetries = 8;
    let delay = 25;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await fs.rename(tempPath, targetPath);
        written = true;
        break;
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        const isTransient = error && (error.code === 'EPERM' || error.code === 'EBUSY' || error.code === 'EACCES');
        if (isTransient && attempt < maxRetries) {
          try {
            await fs.copyFile(tempPath, targetPath);
            written = true;
            break;
          } catch {}
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          try {
            await fs.copyFile(tempPath, targetPath);
            written = true;
            break;
          } catch {
            throw err;
          }
        }
      }
    }
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}

export async function ensureStorage(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  try {
    const stat = await fs.stat(DATA_FILE);
    if (stat.size === 0) {
      await atomicWriteFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2));
    }
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException;
    if (error?.code === 'ENOENT') {
      await atomicWriteFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2));
    }
  }
}

export async function getPayloadClient() {
  return await getPayload({ config: configPromise });
}

export async function getCmsState(): Promise<CmsState> {
  await ensureStorage();
  let raw: string | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      raw = await fs.readFile(DATA_FILE, 'utf-8');
      break;
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error?.code === 'ENOENT') {
        await atomicWriteFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2));
        return DEFAULT_CMS_STATE;
      }
      const isTransient = error && (error.code === 'EPERM' || error.code === 'EBUSY');
      if (isTransient && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        continue;
      }
      throw err;
    }
  }

  if (!raw || raw.trim().length === 0) {
    await atomicWriteFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2));
    return DEFAULT_CMS_STATE;
  }

  // A non-empty file that is unreadable or malformed is NEVER overwritten with defaults:
  // that would silently destroy the author's content. Fail loudly and keep the file for recovery.
  let parsed: Partial<CmsState>;
  try {
    parsed = JSON.parse(raw) as Partial<CmsState>;
  } catch {
    throw await corruptStateError(raw, 'JSON i pavlefshëm');
  }
  if (!parsed || parsed.locale !== 'sq' || !parsed.site?.navMenu) {
    throw await corruptStateError(raw, 'struktura e papritur (locale ose site.navMenu mungon)');
  }
  return parsed as CmsState;
}

export class CmsStateCorruptError extends Error {
  constructor(reason: string) {
    super(`cms-data.json është i dëmtuar: ${reason}. Rikthejeni nga një kopje rezervë.`);
    this.name = 'CmsStateCorruptError';
  }
}

async function corruptStateError(raw: string, reason: string): Promise<CmsStateCorruptError> {
  try {
    await fs.writeFile(`${DATA_FILE}.${Date.now()}.corrupt.bak`, raw, 'utf-8');
  } catch {}
  console.error(`[CMS] ${DATA_FILE} u refuzua (${reason}); skedari mbeti i paprekur.`);
  return new CmsStateCorruptError(reason);
}

let writeMutex = Promise.resolve<any>(undefined);

export async function saveCmsState(next: CmsState): Promise<CmsState> {
  const executeSave = async (): Promise<CmsState> => {
    await ensureStorage();
    const stamped: CmsState = {
      ...next,
      locale: 'sq',
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteFile(DATA_FILE, JSON.stringify(stamped, null, 2));
    return stamped;
  };

  const task = writeMutex.then(executeSave, executeSave);
  writeMutex = task.catch(() => {});
  return task;
}
