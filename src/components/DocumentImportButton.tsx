'use client';

import { useState } from 'react';
import { FileText, FolderOpen, Upload, X } from 'lucide-react';
import { useModalA11y } from '@/hooks/useModalA11y';
import { useDocumentImport } from '@/components/DocumentImportProvider';

interface Props {
  periodId: number;
  periodLocked: boolean;
}

interface SelectedImportFile {
  key: string;
  file: File;
  label: string;
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

function DocumentImportModal({
  periodId,
  onClose,
}: {
  periodId: number;
  onClose: () => void;
}) {
  const { startImport } = useDocumentImport();
  const [selectedFiles, setSelectedFiles] = useState<SelectedImportFile[]>([]);
  const [error, setError] = useState('');
  const { containerRef, handleKeyDown } = useModalA11y(onClose);

  const handleFileSelection = (files: FileList | null) => {
    if (!files) return;
    const nextFiles = [...files];
    const pdfFiles = nextFiles.filter(isPdfFile);

    setSelectedFiles((current) => mergeSelectedFiles(current, pdfFiles));
    setError(
      pdfFiles.length === 0
        ? 'Valituista tiedostoista ei löytynyt PDF:iä.'
        : '',
    );
  };

  const removeSelectedFile = (key: string) => {
    setSelectedFiles((current) => current.filter((file) => file.key !== key));
  };

  const handleImport = () => {
    if (selectedFiles.length === 0) {
      setError('Valitse tuotavat PDF-tiedostot tai kansio.');
      return;
    }

    startImport({
      periodId,
      files: selectedFiles.map((selectedFile) => selectedFile.file),
    });
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/70 p-4 md:p-8"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tuo tositteita PDF:stä"
        className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-4 py-3">
          <div>
            <div className="text-sm font-medium text-text-primary">
              Tuo tositteita PDF:stä
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              PDF:t parsitaan GPT:llä ja niistä luodaan automaattisesti
              tositteet liitteineen.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Sulje tositetuonti"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="rounded-xl border border-border-subtle bg-surface-2/30 p-4 text-sm text-text-secondary">
            Tuonti siirtyy taustalle heti kun käynnistät sen. Tila näkyy oikeassa
            alakulmassa toastina ja uudet tositteet ilmestyvät listaan sitä
            mukaa kun ne valmistuvat, joten voit jatkaa työskentelyä samaan
            aikaan.
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-2/30 p-4 text-sm text-text-secondary">
            Tuonti käyttää valitun tilikauden nykyistä tilikarttaa. Jos PDF:n
            päiväys ei tunnistu luotettavasti, tuonti käyttää valitun kauden
            päivää fallbackina. Jos GPT ei löydä tasapainoista vientiä,
            tiedosto ohitetaan virheellä.
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
                            <span className="truncate">{selectedFile.label}</span>
                          </div>
                          <div className="mt-1 text-xs text-text-muted">
                            {(selectedFile.file.size / 1024).toFixed(1)} kB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(selectedFile.key)}
                          className="rounded p-1 text-text-muted transition-colors hover:text-text-primary"
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
                  Valitse tuotavat tosite-PDF:t tai koko kansio.
                </div>
              )}
            </div>
          </div>

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
            className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2"
          >
            Sulje
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={selectedFiles.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-text-muted"
          >
            <Upload className="h-4 w-4" />
            Käynnistä tuonti taustalla
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentImportButton({ periodId, periodLocked }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={periodLocked}
        className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-3 disabled:cursor-not-allowed disabled:text-text-muted"
      >
        <Upload className="h-3.5 w-3.5" />
        Tuo tositteita
      </button>

      {showModal ? (
        <DocumentImportModal
          periodId={periodId}
          onClose={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
