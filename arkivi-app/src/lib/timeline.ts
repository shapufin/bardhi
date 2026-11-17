import type { TimelineEntry } from '@/src/types/cms';

export function newTimelineEntry(now: number = Date.now()): TimelineEntry {
  return { id: `timeline-${now}-${Math.random().toString(36).slice(2, 8)}`, year: '', title: '', description: '' };
}

export function moveEntry<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function removeEntry<T>(list: T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/** Entries without a title are dropped on save (an empty row is never useful publicly). */
export function cleanTimeline(list: TimelineEntry[]): TimelineEntry[] {
  return list.filter((e) => e.title.trim().length > 0);
}
