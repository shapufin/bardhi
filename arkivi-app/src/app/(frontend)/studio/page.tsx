import React from 'react';
import { AdminStudioWrapper } from '@/src/components/admin/AdminStudioWrapper';
import { getStudioToken } from '@/src/lib/adminAuth';

export default function StudioPage() {
  return <AdminStudioWrapper studioToken={getStudioToken()} />;
}
