import React from 'react';
import { cookies } from 'next/headers';
import { AdminStudioWrapper } from '@/src/components/admin/AdminStudioWrapper';
import { StudioLogin } from '@/src/components/admin/StudioLogin';
import { STUDIO_COOKIE, verifySessionToken } from '@/src/lib/studioAuth';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const store = await cookies();
  const session = store.get(STUDIO_COOKIE)?.value;
  if (!verifySessionToken(session)) {
    return <StudioLogin />;
  }
  return <AdminStudioWrapper />;
}
