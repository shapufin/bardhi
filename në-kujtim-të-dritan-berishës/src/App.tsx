import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { CmsProvider, useCms } from '@/src/context/CmsContext';
import { PublicSite } from '@/src/components/frontend/PublicSite';
import { AdminStudio } from '@/src/components/admin/AdminStudio';
import { Button } from '@/src/components/ui/button';

function MemorialWorkspace() {
  const { cms, loading, error, refreshCms } = useCms();
  const [mode, setMode] = useState<'public' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'public'
  );

  useEffect(() => {
    const onHash = () => {
      setMode(window.location.hash === '#admin' ? 'admin' : 'public');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const switchMode = (next: 'public' | 'admin') => {
    setMode(next);
    window.location.hash = next === 'admin' ? '#admin' : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="space-y-2 text-center">
          <p className="font-serif text-3xl text-foreground">Po hapet Arkivi Përkujtimor...</p>
          <p className="text-sm text-muted-foreground">Duke ngarkuar rrëfimet, fotografitë dhe librin.</p>
        </div>
      </div>
    );
  }

  if (error || !cms) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md border border-border bg-card p-8 text-center">
          <h1 className="font-serif text-2xl text-foreground">Arkivi nuk u hap dot</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || 'Të dhënat e arkivit nuk u ngarkuan.'}
          </p>
          <Button onClick={() => void refreshCms()} className="mt-6">
            Provo Përsëri
          </Button>
        </div>
      </div>
    );
  }

  return mode === 'admin' ? (
    <AdminStudio onExitStudio={() => switchMode('public')} />
  ) : (
    <PublicSite cms={cms} onOpenAdmin={() => switchMode('admin')} />
  );
}

export default function App() {
  return (
    <CmsProvider>
      <Toaster position="bottom-right" richColors />
      <MemorialWorkspace />
    </CmsProvider>
  );
}
