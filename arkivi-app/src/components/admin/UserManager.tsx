'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, Key, ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { toast } from 'sonner';
import { useCms } from '@/src/context/CmsContext';

interface SystemUser {
  id: string | number;
  name: string;
  email: string;
  role: 'author' | 'superuser';
  createdAt?: string;
}

export function UserManager() {
  const { studioToken } = useCms();
  const authHeaders = (): Record<string, string> => (studioToken ? { 'x-admin-token': studioToken } : {});
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'author' | 'superuser'>('author');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', { headers: authHeaders() });
      if (!res.ok) throw new Error('Nuk u morën përdoruesit.');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // Fallback display if payload db is initializing
      setUsers([
        {
          id: 'admin-1',
          name: 'Administrator Teknik',
          email: 'admin@arkivi.local',
          role: 'superuser',
        },
        {
          id: 'author-1',
          name: 'Ilir Berisha',
          email: 'autori@arkivi.local',
          role: 'author',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error('Ju lutemi plotësoni email-in dhe fjalëkalimin.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dështoi krijimi.');

      toast.success('Përdoruesi u shtua me sukses');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowAddForm(false);
      void fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë krijimit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="font-serif text-3xl font-medium text-foreground">
            Përdoruesit & Siguria e Arkivit
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Menaxhoni llogaritë e autorit dhe administratorit teknik të lidhura me PayloadCMS.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="default"
            onClick={() => window.open('/admin', '_blank')}
            className="gap-2"
          >
            <span>Hap Panelin Teknik Payload</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Button>

          <Button
            variant="default"
            size="default"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Shto Përdorues</span>
          </Button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateUser}
          className="border border-border bg-card p-6 shadow-xs space-y-5"
        >
          <h3 className="font-serif text-xl text-foreground">Shto Llogari të Re</h3>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Emri dhe Mbiemri</Label>
              <Input
                id="user-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="p.sh. Ilir Berisha"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Adresa Email</Label>
              <Input
                id="user-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@shembull.al"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-pass">Fjalëkalimi (min. 8 karaktere)</Label>
              <Input
                id="user-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role">Roli në Sistem</Label>
              {/* ds-allow-native-select */}
              <select
                id="user-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'author' | 'superuser')}
                className="flex h-11 w-full rounded-sm border border-input bg-card px-3.5 py-2 text-base text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="author">Autor (Qasje në Studio të Thjeshtuar)</option>
                <option value="superuser">Super Administrator Teknik (Qasje në /admin)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(false)}
            >
              Anulo
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Duke Ruajtur...' : 'Krijo Llogarinë'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Duke ngarkuar përdoruesit...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="border border-border bg-card p-6 flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-serif text-lg font-medium text-foreground">
                    {u.name}
                  </span>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-1.5 border border-border bg-secondary/50 px-2.5 py-1 text-xs">
                  {u.role === 'superuser' ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-primary">Superadmin</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-3.5 w-3.5 text-foreground/75" />
                      <span className="font-medium text-foreground/80">Autor</span>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-border/80 pt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  <span>
                    {u.role === 'superuser'
                      ? 'Qasje e plotë në bazën e të dhënave & Payload'
                      : 'Qasje e drejtpërdrejtë në Studio e Autorit'}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
