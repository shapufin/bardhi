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

