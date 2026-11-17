/**
 * Merge helper for PUT routes that accept partial text updates.
 * - field absent / not a string  -> keep `current`
 * - empty string + allowEmpty    -> clear the field (optional content)
 * - empty string, required field -> keep `current` (never blank a required title)
 */
export function mergeText(value: unknown, max: number, current: string, allowEmpty = false): string {
  if (typeof value !== 'string') return current;
  const clipped = value.trim().slice(0, max);
  if (!clipped && !allowEmpty) return current;
  return clipped;
}
