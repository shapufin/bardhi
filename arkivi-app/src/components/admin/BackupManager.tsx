'use client';

import React, { useState, useRef } from 'react';
import { Download, Upload, RotateCcw, Shield, AlertTriangle, CheckCircle2, Loader2, HardDrive } from 'lucide-react';
import { Button } from '@/src/components/ui/button';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface RestoreResult {
  success: boolean;
  timestamp?: string;
  counts?: { stories: number; bookSpreads: number; media: number };
  message?: string;
  error?: string;
}

export function BackupManager() {
  const [backupStatus, setBackupStatus] = useState<Status>('idle');
  const [restoreStatus, setRestoreStatus] = useState<Status>('idle');
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string>('');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleBackup() {
    setBackupStatus('loading');
    try {
      const res = await fetch('/api/backup', { method: 'GET' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') || '';
      const filenameMatch = /filename="([^"]+)"/.exec(disposition);
      const filename = filenameMatch ? filenameMatch[1] : `backup-${Date.now()}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus('success');
      setTimeout(() => setBackupStatus('idle'), 4000);
    } catch (err) {
      setBackupStatus('error');
      setTimeout(() => setBackupStatus('idle'), 5000);
      console.error('Backup error:', err);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setRestoreResult(null);
    setRestoreError('');
    setConfirmRestore(false);
  }

  async function handleRestore() {
    if (!selectedFile) return;
    setRestoreStatus('loading');
    setRestoreResult(null);
    setRestoreError('');

    try {
      const formData = new FormData();
      formData.append('archive', selectedFile, selectedFile.name);

      const res = await fetch('/api/restore', { method: 'POST', body: formData });
      const json: RestoreResult = await res.json().catch(() => ({ success: false, error: 'Përgjigje e pavlefshme nga serveri.' }));

      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setRestoreResult(json);
      setRestoreStatus('success');
      setSelectedFile(null);
      setConfirmRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Reload page after 3s to reflect restored data
      setTimeout(() => window.location.reload(), 3000);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Rivendosja dështoi.');
      setRestoreStatus('error');
    }
  }

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h2 className="font-serif text-2xl font-medium text-foreground mb-1">
          Rezervim &amp; Rivendosje
        </h2>
        <p className="text-sm text-muted-foreground">
          Rezervoni të gjitha të dhënat dhe fotografitë për migrim pa humbje, ose rivendosni nga një arkiv i mëparshëm.
        </p>
      </div>

      {/* Backup Section */}
      <div className="border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
          <div>
            <h3 className="font-medium text-base text-foreground">Krijo Kopje Rezervë</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Shkarkon një arkiv ZIP që përmban bazën e të dhënave SQLite, gjendjen CMS (cms-data.json)
              dhe të gjitha fotografitë e ngarkuara. I gjithë arkivi vërtetohet me SHA-256.
            </p>
          </div>
        </div>

        <Button
          onClick={handleBackup}
          disabled={backupStatus === 'loading'}
          className="gap-2 w-full sm:w-auto"
        >
          {backupStatus === 'loading' ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Duke krijuar kopjen rezervë...</>
          ) : backupStatus === 'success' ? (
            <><CheckCircle2 className="h-4 w-4" /> U shkarkua me sukses!</>
          ) : backupStatus === 'error' ? (
            <><AlertTriangle className="h-4 w-4" /> Gabim — provoni sërish</>
          ) : (
            <><Download className="h-4 w-4" /> Shkarko Kopjen Rezervë</>
          )}
        </Button>

        {backupStatus === 'success' && (
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            Kopja rezervë u krijua dhe u shkarkua me sukses.
          </p>
        )}
      </div>

      {/* Restore Section */}
      <div className="border border-border bg-card p-6 space-y-5">
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
          <div>
            <h3 className="font-medium text-base text-foreground">Rivendos nga Arkivi</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ngarko një arkiv ZIP backup për të rikthyer plotësisht bazën e të dhënave,
              gjendjen CMS, dhe fotografitë. Kontrollet SHA-256 verifikohen para çdo ndryshimi.
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Kujdes:</strong> Rivendosja do të zëvendësojë të gjitha të dhënat aktuale me ato nga arkivi.
            Faqja do të rindizet automatikisht pas rivendosjes.
          </span>
        </div>

        {/* File picker */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Zgjidhni arkivin ZIP të kopjes rezervë
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="block w-full text-sm text-foreground border border-border bg-background px-3 py-2 cursor-pointer
              file:mr-3 file:py-1 file:px-3 file:border file:border-border file:text-sm file:font-medium
              file:bg-secondary file:text-foreground hover:file:bg-secondary/80 file:cursor-pointer"
          />
          {selectedFile && (
            <p className="text-xs text-muted-foreground">
              Zgjedhur: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {/* Confirmation checkbox */}
        {selectedFile && (
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-foreground">
            <input
              type="checkbox"
              checked={confirmRestore}
              onChange={(e) => setConfirmRestore(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            Kuptoj që të dhënat aktuale do të zëvendësohen. Vazhdoni.
          </label>
        )}

        <Button
          onClick={handleRestore}
          disabled={!selectedFile || !confirmRestore || restoreStatus === 'loading'}
          variant={restoreStatus === 'error' ? 'destructive' : 'default'}
          className="gap-2 w-full sm:w-auto"
        >
          {restoreStatus === 'loading' ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Duke rivendosur...</>
          ) : restoreStatus === 'success' ? (
            <><CheckCircle2 className="h-4 w-4" /> U rivendos me sukses!</>
          ) : (
            <><Upload className="h-4 w-4" /> Rivendos nga Arkivi</>
          )}
        </Button>

        {/* Success result */}
        {restoreStatus === 'success' && restoreResult && (
          <div className="border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-700 p-4 space-y-1 text-sm">
            <div className="flex items-center gap-2 font-medium text-green-800 dark:text-green-300">
              <Shield className="h-4 w-4" />
              Rivendosja u krye me sukses — integritet 100%
            </div>
            {restoreResult.timestamp && (
              <p className="text-green-700 dark:text-green-400">
                Arkivi nga: {new Date(restoreResult.timestamp).toLocaleString('sq-AL')}
              </p>
            )}
            {restoreResult.counts && (
              <p className="text-green-700 dark:text-green-400">
                U rikthyen: {restoreResult.counts.stories} rrëfime ·{' '}
                {restoreResult.counts.media} fotografi ·{' '}
                {restoreResult.counts.bookSpreads} faqe libri
              </p>
            )}
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              Duke rifreskuar faqen...
            </p>
          </div>
        )}

        {/* Error result */}
        {restoreStatus === 'error' && restoreError && (
          <div className="flex items-start gap-2 border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700 p-3 text-sm text-red-800 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span><strong>Gabim:</strong> {restoreError}</span>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Të gjitha arkivat verifikohen me kontroll SHA-256 para rivendosjes.
          Sistemi ruan automatikisht gjendjen e mëparshme dhe e rivendos atë nëse rivendosja dështon.
        </span>
      </div>
    </div>
  );
}
