import { NextResponse } from 'next/server';
import { getCmsState } from '@/src/lib/payloadClient';

export async function GET() {
  try {
    const state = await getCmsState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Gabim gjate leximit te arkivit:', error);
    return NextResponse.json(
      { error: 'Nuk u arrit te ngarkohen te dhenat e arkivit.' },
      { status: 500 }
    );
  }
}
