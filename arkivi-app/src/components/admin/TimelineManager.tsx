'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input, Textarea } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { useCms } from '@/src/context/CmsContext';
import { cleanTimeline, moveEntry, newTimelineEntry, removeEntry } from '@/src/lib/timeline';
import type { TimelineEntry } from '@/src/types/cms';

export function TimelineManager() {
  const { cms, saving, saveTimeline } = useCms();
  const [entries, setEntries] = useState<TimelineEntry[]>(cms?.timeline ?? []);

  useEffect(() => {
    setEntries(cms?.timeline ?? []);
  }, [cms?.timeline]);

  const update = (index: number, patch: Partial<TimelineEntry>) =>
    setEntries((list) => list.map((e, i) => (i === index ? { ...e, ...patch } : e)));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-foreground">Kronologjia</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Datat dhe ngjarjet e rëndësishme të jetës së tij, sipas radhës që shfaqen në faqe.
        </p>
      </div>

      {entries.length === 0 && (
        <p className="border border-border bg-card p-6 text-base text-muted-foreground">
          Ende nuk ka asnjë datë. Shtyp &quot;Shto Datë të Re&quot; për të nisur.
        </p>
      )}

      <ol className="space-y-4">
        {entries.map((entry, index) => (
          <li key={entry.id} className="border border-border bg-card p-5">
            <div className="grid gap-4 md:grid-cols-[10rem_1fr]">
              <div className="space-y-2">
                <Label htmlFor={`tl-year-${entry.id}`} className="text-base">Viti</Label>
                <Input
                  id={`tl-year-${entry.id}`}
                  value={entry.year}
                  maxLength={50}
                  onChange={(e) => update(index, { year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`tl-title-${entry.id}`} className="text-base">Titulli</Label>
                <Input
                  id={`tl-title-${entry.id}`}
                  value={entry.title}
                  maxLength={300}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor={`tl-desc-${entry.id}`} className="text-base">Përshkrimi</Label>
              <Textarea
                id={`tl-desc-${entry.id}`}
                value={entry.description}
                maxLength={5000}
                onChange={(e) => update(index, { description: e.target.value })}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={index === 0} onClick={() => setEntries((l) => moveEntry(l, index, -1))} className="gap-2">
                <ArrowUp className="h-4 w-4" /> Ngjit
              </Button>
              <Button type="button" variant="outline" disabled={index === entries.length - 1} onClick={() => setEntries((l) => moveEntry(l, index, 1))} className="gap-2">
                <ArrowDown className="h-4 w-4" /> Zbrit
              </Button>
              <Button type="button" variant="outline" onClick={() => setEntries((l) => removeEntry(l, index))} className="gap-2">
                <Trash2 className="h-4 w-4" /> Fshij Datën
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => setEntries((l) => [...l, newTimelineEntry()])} className="gap-2">
          <Plus className="h-4 w-4" /> Shto Datë të Re
        </Button>
        <Button type="button" disabled={saving} onClick={() => void saveTimeline(cleanTimeline(entries))}>
          {saving ? 'Po ruhet...' : 'Ruaj Kronologjinë'}
        </Button>
      </div>
    </section>
  );
}
