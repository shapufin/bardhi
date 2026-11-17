import { NextResponse } from 'next/server';
import { getCmsState, saveCmsState, serialized } from '@/src/lib/payloadClient';
import { verifyAdminAuth } from '@/src/lib/adminAuth';
import type { CmsState, TimelineEntry } from '@/src/types/cms';

const MAX_ENTRIES = 500;

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function putHandler(req: Request) {
  const auth = verifyAdminAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'I paautorizuar: Ruajtja e kronologjisë kërkon autorizim administratori.' },
      { status: auth.status }
    );
  }

  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Kërkesa tejkalon madhësinë e lejuar.' }, { status: 413 });
    }

    const raw = await req.json();
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Të dhëna të pavlefshme.' }, { status: 400 });
    }

    const current = await getCmsState();
    const body = raw as { timeline?: unknown };

    const timeline: TimelineEntry[] = Array.isArray(body.timeline)
      ? body.timeline.slice(0, MAX_ENTRIES).map((entry, index) => {
          const e = (entry && typeof entry === 'object' ? entry : {}) as Partial<TimelineEntry>;
          return {
            id: clip(e.id, 100) || `timeline-${Date.now()}-${index}`,
            year: clip(e.year, 50),
            title: clip(e.title, 300),
            description: clip(e.description, 5000),
          };
        })
      : current.timeline;

    const updated = await saveCmsState({
      ...current,
      timeline,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së kronologjisë:', error);
    return NextResponse.json({ error: 'Nuk u ruajt kronologjia.' }, { status: 500 });
  }
}

export const PUT = serialized(putHandler);
