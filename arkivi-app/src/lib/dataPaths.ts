import { existsSync } from 'node:fs';
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


/**
 * Resolves the Payload DB URL to an absolute, cwd-independent location.
 * - unset            -> file:<DATA_DIR>/arkivi.db
 * - file:./relative  -> resolved against APP_ROOT (not process.cwd())
 * - anything else (absolute file:, libsql://, ...) is returned unchanged.
 */
export function resolveDatabaseUrl(
  raw: string | undefined,
  appRoot: string = APP_ROOT,
  dataDir: string = DATA_DIR
): string {
  const toUrl = (p: string) => `file:${p.split(path.sep).join('/')}`;
  const value = raw?.trim();
  if (!value) return toUrl(path.join(dataDir, 'arkivi.db'));
  if (!value.startsWith('file:')) return value;
  const filePath = value.slice('file:'.length);
  if (!filePath || filePath.startsWith('//')) return value;
  if (path.isAbsolute(filePath) || /^[a-zA-Z]:[\/]/.test(filePath)) return value;
  return toUrl(path.resolve(appRoot, filePath));
}
