import configPromise from '@payload-config';
import { getPayload } from 'payload';
import type { CmsState } from '@/src/types/cms';
import { DEFAULT_CMS_STATE } from '@/src/lib/defaultData';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves the absolute directory of `arkivi-app` regardless of whether the
 * command or process was launched from workspace root (`.../BARDHI`) or
 * from the app folder (`.../BARDHI/arkivi-app`) or any external / nested subdirectory.
 */
export function getAppRoot(): string {
  // 1. Anchor resolution to the physical module location of payloadClient.ts
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const candidate = path.resolve(path.dirname(currentFile), '..', '..');
    if (existsSync(path.join(candidate, 'package.json'))) {
      return candidate;
    }
  } catch {}

  const cwd = process.cwd();

  // 2. If cwd contains an arkivi-app folder with package.json (e.g. workspace root)
  const nestedAppPkg = path.join(cwd, 'arkivi-app', 'package.json');
  if (existsSync(nestedAppPkg)) {
    return path.join(cwd, 'arkivi-app');
  }

  // 3. If cwd itself is arkivi-app
  const directPkg = path.join(cwd, 'package.json');
  if (
    existsSync(directPkg) &&
    (path.basename(cwd) === 'arkivi-app' || existsSync(path.join(cwd, 'src', 'payload.config.ts')))
  ) {
    return cwd;
  }

  // 4. If running from a subfolder inside arkivi-app (e.g. tests/, src/, etc.)
  let current = cwd;
  while (current !== path.dirname(current)) {
    if (
      existsSync(path.join(current, 'package.json')) &&
      (path.basename(current) === 'arkivi-app' || existsSync(path.join(current, 'src', 'payload.config.ts')))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  // 5. Fallback candidate if exists
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const candidate = path.resolve(path.dirname(currentFile), '..', '..');
    if (existsSync(candidate)) {
      return candidate;
    }
  } catch {}

  return cwd;
}

export const APP_ROOT = getAppRoot();
// ARKIVI_DATA_ROOT relocates data/ and public/uploads (used by tests so they never touch live data).
export const DATA_ROOT = process.env.ARKIVI_DATA_ROOT ? path.resolve(process.env.ARKIVI_DATA_ROOT) : APP_ROOT;
export const DATA_DIR = path.resolve(DATA_ROOT, 'data');
export const DATA_FILE = path.join(DATA_DIR, 'cms-data.json');
export const UPLOADS_DIR = path.join(DATA_ROOT, 'public', 'uploads');

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

  try {
    const parsed = JSON.parse(raw) as Partial<CmsState>;
    if (parsed.locale !== 'sq' || !parsed.site?.navMenu) {
      // Create backup of incomplete state before repairing
      try {
        const backupPath = `${DATA_FILE}.${Date.now()}.corrupt.bak`;
        await fs.writeFile(backupPath, raw, 'utf-8');
      } catch {}
      await atomicWriteFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2));
      return DEFAULT_CMS_STATE;
    }
    return parsed as CmsState;
  } catch {
    // Corrupt JSON: create backup before replacing with defaults
    try {
      const backupPath = `${DATA_FILE}.${Date.now()}.corrupt.bak`;
      await fs.writeFile(backupPath, raw, 'utf-8');
    } catch {}
    await atomicWriteFile(DATA_FILE, JSON.stringify(DEFAULT_CMS_STATE, null, 2));
    return DEFAULT_CMS_STATE;
  }
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
