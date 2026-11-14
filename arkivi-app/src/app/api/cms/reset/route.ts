import { NextResponse } from 'next/server';
import { saveCmsState } from '@/src/lib/payloadClient';
import { DEFAULT_CMS_STATE } from '@/src/lib/defaultData';

export async function POST() {
  try {
    const updated = await saveCmsState(DEFAULT_CMS_STATE);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Gabim gjate rivendosjes:', error);
    return NextResponse.json({ error: 'Nuk u rivendos arkivi.' }, { status: 500 });
  }
}
