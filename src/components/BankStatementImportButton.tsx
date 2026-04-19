'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';

interface BankAccountOption {
  id: number;
  number: string;
  name: string;
}

interface ImportResult {
  id: number;
  created: number;
  skipped: number;
}

interface SelectedImportFile {
  key: string;
  file: File;
  label: string;
}

interface ImportOutcome {
  key: string;
  fileName: string;
  status: 'success' | 'error';
  statementId?: number;
  created?: number;
  skipped?: number;
  error?: string;
}

interface Props {
  bankAccounts: BankAccountOption[];
}

const folderInputProps = {
  directory: '',
  webkitdirectory: '',
} as unknown as React.InputHTMLAttributes<HTMLInputElement>;

function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

function getFileLabel(file: File): string {
  return file.webkitRelativePath || file.name;
}

function createSelectedImportFile(file: File): SelectedImportFile {
  const label = getFileLabel(file);
  return {
    key: `${label}:${file.size}:${file.lastModified}`,
    file,
    label,
  };
}

function mergeSelectedFiles(
  currentFiles: SelectedImportFile[],
  nextFiles: File[],
): SelectedImportFile[] {
  const merged = new Map(currentFiles.map((file) => [file.key, file]));

  nextFiles
    .filter(isPdfFile)
    .map(createSelectedImportFile)
    .forEach((file) => merged.set(file.key, file));

  return [...merged.values()].sort((a, b) =>
    a.label.localeCompare(b.label, 'fi'),
  );
}

function BankStatementImportModal({
  bankAccounts,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    bankAccounts[0]?.id ?? null,
  );
  const [selectedFiles, setSelectedFiles] = useState<SelectedImportFile[]>([]);
  const [results, setResults] = useState<ImportOutcome[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState('');
  const { containerRef, handleKeyDown } = useModalA11y(() => {
    if (!isImporting) onClose();
  });

  const selectedAccount = useMemo(
    () =>
      bankAccounts.find((account) => account.id === selectedAccountId) ?? null,
    [bankAccounts, selectedAccountId],
  );

  const successCount = results.filter(
    (result) => result.status === 'success',
  ).length;
  const errorCount = results.filter(
    (result) => result.status === 'error',
  ).length;

  const handleFileSelection = (files: FileList | null) => {
    if (!files) return;
    const nextFiles = [...files];
    const pdfFiles = nextFiles.filter(isPdfFile);

    setSelectedFiles((current) => mergeSelectedFiles(current, pdfFiles));
    setResults([]);
    setError(
      pdfFiles.length === 0
        ? 'Valituista tiedostoista ei löytynyt PDF:iä.'
        : '',
    );
  };

  const removeSelectedFile = (key: string) => {
    setSelectedFiles((current) => current.filter((file) => file.key !== key));
    setResults((current) => current.filter((result) => result.key !== key));
  };

  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      setError('Valitse tuotavat PDF-tiedostot tai kansio.');
      return;
    }

    if (selectedAccountId == null) {
      setError('Valitse pankkitili.');
      return;
    }

    setIsImporting(true);
    setError('');
    setResults([]);
    setProgress({ completed: 0, total: selectedFiles.length });

    try {
      const nextResults: ImportOutcome[] = [];

      for (let index = 0; index < selectedFiles.length; index++) {
        const selectedFile = selectedFiles[index];
        const formData = new FormData();
        formData.append('file', selectedFile.file);
        formData.append('accountId', String(selectedAccountId));

        try {
          const response = await fetch('/api/bank-statements/import-pdf', {
            method: 'POST',
            body: formData,
          });
          const payload = (await response.json().catch(() => null)) as
            | ({ error?: string } & Partial<ImportResult>)
            | null;

          if (!response.ok || !payload?.id) {
            throw new Error(
              payload?.error || 'Tiliotteen PDF-tuonti epäonnistui.',
            );
          }

          nextResults.push({
            key: selectedFile.key,
            fileName: selectedFile.label,
            status: 'success',
            statementId: payload.id,
            created: payload.created,
            skipped: payload.skipped,
          });
        } catch (importError) {
          nextResults.push({
            key: selectedFile.key,
            fileName: selectedFile.label,
            status: 'error',
            error:
              importError instanceof Error
                ? importError.message
                : 'Tiliotteen PDF-tuonti epäonnistui.',
          });
        }

        setResults([...nextResults]);
        setProgress({ completed: index + 1, total: selectedFiles.length });
      }

      router.refresh();
      const successfulImports = nextResults.filter(
        (result) => result.status === 'success' && result.statementId,
      );
      const failedImports = nextResults.filter(
        (result) => result.status === 'error',
      );

      if (selectedFiles.length === 1 && successfulImports.length === 1) {
        router.push(`/bank-statements/${successfulImports[0].statementId}`);
        return;
      }

      if (failedImports.length > 0) {
        setError(
          `${failedImports.length} / ${selectedFiles.length} tiliotteen tuonti epäonnistui.`,
        );
      }
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : 'Tiliotteen PDF-tuonti epäonnistui.',
      );
      setIsImporting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/70 p-4 md:p-8"
      onClick={() => {
        if (!isImporting) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tuo tiliote PDF:stä"
        className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-3">
          <div>
            <div className="text-sm font-medium text-text-primary">
              Tuo tiliote PDF:stä
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              PDF lähetetään GPT 5.4 miniin low reasoning -asetuksella ja
              luodaan automaattisesti tiliotteeksi.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Sulje tiliotteen tuonti"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="rounded-xl border border-border-subtle bg-surface-2/40 p-4">
            <div className="mb-2 text-sm font-medium text-text-primary">
              Kohdepankkitili
            </div>
            <select
              value={selectedAccountId ?? ''}
              onChange={(event) =>
                setSelectedAccountId(Number(event.target.value))
              }
              className="w-full rounded-lg border border-border-subtle bg-surface-0/60 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              disabled={isImporting || bankAccounts.length === 0}
            >
              {bankAccounts.length === 0 ? (
                <option value="">Ei pankkitilejä</option>
              ) : null}
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number} {account.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-text-muted">
              Valitse kirjanpidon pankkitili, jolle tuotu tiliote tallennetaan.
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-border-subtle bg-surface-2/20 p-5">
            <div className="mb-3 block text-sm font-medium text-text-primary">
              PDF-tiedostot
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-lg border border-border-subtle bg-surface-0/50 px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-surface-0/80">
                <div className="mb-2 flex items-center gap-2 font-medium text-text-primary">
                  <Upload className="h-4 w-4 text-accent-light" />
                  Valitse PDF:t
                </div>
                <div className="text-xs text-text-muted">
                  Voit valita yhden tai useamman PDF:n samalla kertaa.
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  disabled={isImporting}
                  onChange={(event) => handleFileSelection(event.target.files)}
                  className="sr-only"
                />
              </label>

              <label className="rounded-lg border border-border-subtle bg-surface-0/50 px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-surface-0/80">
                <div className="mb-2 flex items-center gap-2 font-medium text-text-primary">
                  <FolderOpen className="h-4 w-4 text-accent-light" />
                  Valitse kansio
                </div>
                <div className="text-xs text-text-muted">
                  Kaikki kansion PDF:t lisätään jonoon tuotavaksi.
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  disabled={isImporting}
                  onChange={(event) => handleFileSelection(event.target.files)}
                  className="sr-only"
                  {...folderInputProps}
                />
              </label>
            </div>
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface-0/40 px-4 py-3">
              {selectedFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-text-primary">
                    {selectedFiles.length} PDF-tiedostoa valittu tuotavaksi
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {selectedFiles.map((selectedFile) => (
                      <div
                        key={selectedFile.key}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border-subtle/70 bg-surface-2/30 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-sm text-text-primary">
                            <FileText className="h-4 w-4 shrink-0 text-accent-light" />
                            <span className="truncate">
                              {selectedFile.label}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {(selectedFile.file.size / 1024).toFixed(1)} kB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(selectedFile.key)}
                          disabled={isImporting}
                          className="rounded p-1 text-text-muted transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Poista tiedosto ${selectedFile.label}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-text-muted">
                  Valitse pankin PDF-tiliotteet tai koko kansio tuotavaksi.
                </div>
              )}
            </div>
          </div>

          {selectedAccount ? (
            <div className="rounded-xl border border-border-subtle bg-surface-2/30 p-4 text-sm text-text-secondary">
              Tiliote luodaan tilille{' '}
              <span className="font-medium text-text-primary">
                {selectedAccount.number} {selectedAccount.name}
              </span>
              . Yksi tiedosto avataan tuonnin jälkeen suoraan, useamman
              tiedoston tuonnissa lista vain päivittyy.
            </div>
          ) : null}

          {isImporting || progress.total > 0 ? (
            <div className="rounded-xl border border-border-subtle bg-surface-2/30 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-text-primary">Tuonnin eteneminen</span>
                <span className="text-text-secondary">
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width:
                      progress.total > 0
                        ? `${(progress.completed / progress.total) * 100}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="rounded-xl border border-border-subtle bg-surface-2/30 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-text-primary">
                  Tuonnin tulokset
                </span>
                <span className="text-emerald-300">
                  {successCount} onnistui
                </span>
                <span className="text-rose-300">{errorCount} epäonnistui</span>
              </div>
              <div className="mt-3 max-h-60 space-y-2 overflow-y-auto pr-1">
                {results.map((result) => (
                  <div
                    key={result.key}
                    className="rounded-lg border border-border-subtle/70 bg-surface-0/40 px-3 py-2"
                  >
                    <div className="flex items-start gap-2 text-sm">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-text-primary">
                          {result.fileName}
                        </div>
                        {result.status === 'success' ? (
                          <div className="mt-1 text-xs text-text-secondary">
                            Tiliote #{result.statementId} luotu ·{' '}
                            {result.created ?? 0} riviä tuotu
                            {(result.skipped ?? 0) > 0
                              ? ` · ${result.skipped} riviä ohitettu`
                              : ''}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-rose-300">
                            {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Peruuta
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={
              isImporting ||
              selectedFiles.length === 0 ||
              selectedAccountId == null
            }
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-text-muted"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isImporting ? 'Tuodaan...' : 'Tuo tiliotteet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BankStatementImportButton({ bankAccounts }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-amber-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Lisää tiliote
      </button>

      {showModal ? (
        <BankStatementImportModal
          bankAccounts={bankAccounts}
          onClose={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
