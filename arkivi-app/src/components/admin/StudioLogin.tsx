'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui/button';

export function StudioLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/studio/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim() || undefined,
          password,
        }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || 'Fjalëkalimi i pasaktë.');
    } catch {
      setError('Gabim lidhjeje. Provo sërish.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-border bg-card p-8 shadow-sm"
      >
        <h1 className="font-serif text-3xl text-foreground">Studio e Autorit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fut fjalëkalimin ose të dhënat e autorit për të hapur arkivin.
        </p>

        <label htmlFor="studio-identifier" className="mt-6 block text-sm text-foreground">
          Email ose Emri <span className="text-xs text-muted-foreground">(opsionale)</span>
        </label>
        <input
          id="studio-identifier"
          type="text"
          autoComplete="username"
          placeholder="p.sh. bardhi@admin.com ose bosh"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mt-2 w-full border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
        />

        <label htmlFor="studio-password" className="mt-4 block text-sm text-foreground">
          Fjalëkalimi
        </label>
        <input
          id="studio-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground"
        />

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className="mt-6 w-full">
          {loading ? 'Duke u kyçur...' : 'Hyr'}
        </Button>
      </form>
    </div>
  );
}
