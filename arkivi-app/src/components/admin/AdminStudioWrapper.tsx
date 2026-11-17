'use client';

import React from 'react';
import { AdminStudio } from './AdminStudio';
import { CmsProvider, useCms } from '@/src/context/CmsContext';
import { Toaster } from 'sonner';
import { Button } from '@/src/components/ui/button';

function StudioContent({ onExit }: { onExit: () => void }) {
  const { cms, loading, error, refreshCms } = useCms();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="space-y-2 text-center">
          <p className="font-serif text-3xl text-foreground">Po hapet Studio e Autorit...</p>
          <p className="text-sm text-muted-foreground">Duke ngarkuar të dhënat e arkivit nga PayloadCMS.</p>
        </div>
      </div>
    );
  }

  if (error || !cms) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md border border-border bg-card p-8 text-center">
          <h1 className="font-serif text-2xl text-foreground">Studio nuk u hap dot</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'Të dhënat nuk u ngarkuan.'}</p>
          <Button onClick={() => void refreshCms()} className="mt-6">
            Provo Përsëri
          </Button>
        </div>
      </div>
    );
  }

  return <AdminStudio onExitStudio={onExit} />;
}

export function AdminStudioWrapper() {
  const handleExit = () => {
    window.location.href = '/';
  };

  return (
    <CmsProvider>
      <Toaster position="bottom-right" richColors />
      <StudioContent onExit={handleExit} />
    </CmsProvider>
  );
}

export default AdminStudioWrapper;
