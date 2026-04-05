'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  ExternalLink,
  Loader2,
  Paperclip,
  Upload,
  Unlink,
  X,
} from 'lucide-react';
import {
  updateDocumentReceiptAction,
  uploadDocumentReceiptAction,
} from '@/actions/app-actions';
import { buildPdfPreviewSrc } from '@/lib/pdf-preview';
import type { ReceiptSource } from '@/lib/receipt-pdfs';

interface Props {
  documentId: number;
  documentNumber: number;
  documentCode?: string;
  readOnly?: boolean;
  initialReceiptPath: string | null;
  initialReceiptSource: ReceiptSource;
  onReceiptChange?: (
    nextPath: string | null,
    nextSource: ReceiptSource,
  ) => void;
  attachmentLabel?: string;
  attachButtonLabel?: string;
  replaceButtonLabel?: string;
  emptyStateText?: string;
  modalTitle?: string;
}

function sourceLabel(source: ReceiptSource): string {
  if (source === 'manual') return 'Valittu kasin';
  if (source === 'automatic') return 'Automaattinen';
  return 'Ei tositetta';
}

interface ReceiptPayload {
  receiptPath: string | null;
  receiptSource: ReceiptSource;
}

function isReceiptPayload(payload: unknown): payload is ReceiptPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  const { receiptPath, receiptSource } = candidate;
  const hasValidPath = typeof receiptPath === 'string' || receiptPath === null;
  const hasValidSource =
    receiptSource === 'manual' ||
    receiptSource === 'automatic' ||
    receiptSource === null;

  return hasValidPath && hasValidSource;
}

export default function ReceiptAttachmentPanel({
  documentId,
  documentNumber,
  documentCode,
  readOnly = false,
  initialReceiptPath,
  initialReceiptSource,
  onReceiptChange,
  attachmentLabel = 'Liitetty tosite',
  attachButtonLabel = 'Liitä tosite',
  replaceButtonLabel = 'Vaihda tiedosto',
  emptyStateText = 'Tällä tositteella ei ole tositetta. Lisää PDF kohdasta `Liitä tosite`.',
  modalTitle,
}: Props) {
  const [receiptPath, setReceiptPath] = useState(initialReceiptPath);
  const [receiptSource, setReceiptSource] =
    useState<ReceiptSource>(initialReceiptSource);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pendingAction, setPendingAction] = useState<'link' | 'upload' | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saving = pendingAction !== null;

  useEffect(() => {
    setReceiptPath(initialReceiptPath);
    setReceiptSource(initialReceiptSource);
  }, [initialReceiptPath, initialReceiptSource]);

  const currentPreviewSrc = receiptPath
    ? buildPdfPreviewSrc(`/api/receipts/pdf?documentId=${documentId}`)
    : null;
  const previewKey = receiptPath
    ? `${documentId}:${receiptPath}`
    : `empty:${documentId}`;

  const persistReceiptPath = async (nextReceiptPath: string | null) => {
    setPendingAction('link');
    setActionError('');

    try {
      const payload = await updateDocumentReceiptAction(documentId, {
        receiptPath: nextReceiptPath,
      });

      if (!isReceiptPayload(payload)) {
        throw new Error('Palvelin palautti virheellisen vastauksen.');
      }

      setReceiptPath(payload?.receiptPath ?? null);
      setReceiptSource(payload?.receiptSource ?? null);
      onReceiptChange?.(
        payload?.receiptPath ?? null,
        payload?.receiptSource ?? null,
      );
      if (nextReceiptPath) {
        setIsPickerOpen(false);
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'PDF-linkityksen tallennus epaonnistui.',
      );
    } finally {
      setPendingAction(null);
    }
  };

  const uploadReceipt = async (file: File) => {
    if (!file) return;

    setPendingAction('upload');
    setActionError('');

    try {
      const payload = await uploadDocumentReceiptAction(documentId, file);

      if (!isReceiptPayload(payload)) {
        throw new Error('Palvelin palautti virheellisen vastauksen.');
      }

      setReceiptPath(payload?.receiptPath ?? null);
      setReceiptSource(payload?.receiptSource ?? null);
      onReceiptChange?.(
        payload?.receiptPath ?? null,
        payload?.receiptSource ?? null,
      );
      setIsPickerOpen(false);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'PDF-upload epäonnistui.',
      );
    } finally {
      setPendingAction(null);
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadReceipt(file);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    void uploadReceipt(file);
  };

  const openFileBrowser = () => {
    if (saving || readOnly) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border-subtle bg-surface-1/80 p-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
              {attachmentLabel}
            </h3>
            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                receiptSource === 'manual'
                  ? 'bg-accent-muted text-accent-light'
                  : receiptSource === 'automatic'
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-surface-3/60 text-text-muted'
              }`}
            >
              {sourceLabel(receiptSource)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              disabled={saving || readOnly}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-accent/20 bg-accent-muted px-3 py-2 text-xs font-medium text-accent-light transition-colors hover:border-accent/30 hover:bg-accent/18 hover:text-[#ffd27a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {receiptPath ? replaceButtonLabel : attachButtonLabel}
            </button>

            {receiptPath && (
              <button
                type="button"
                onClick={() => void persistReceiptPath(null)}
                disabled={saving || readOnly}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs font-medium text-rose-200/85 transition hover:border-rose-500/30 hover:bg-rose-500/12 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingAction === 'link' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5" />
                )}
                Poista linkitys
              </button>
            )}
          </div>

          <div className="rounded-lg border border-border-subtle bg-surface-0/40 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
              Nykyinen tiedosto
            </div>
            <div className="mt-2 flex items-start gap-2 font-mono text-xs text-text-primary">
              <span className="min-w-0 flex-1 break-all">
                {receiptPath ?? 'Ei tositetta.'}
              </span>
              {receiptPath && (
                <a
                  href={`/api/receipts/pdf?documentId=${documentId}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Avaa PDF uudessa valilehdessa"
                  title="Avaa PDF"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted transition hover:text-text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {readOnly && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-100">
              Tilikausi on lukittu. Liitteiden muokkaus on poistettu käytöstä.
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {actionError}
        </div>
      )}

      {currentPreviewSrc ? (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-2/70 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.7)]">
          <iframe
            key={previewKey}
            title={`Tosite ${documentNumber} PDF`}
            src={currentPreviewSrc}
            className="aspect-210/297 max-h-[72vh] w-full bg-white"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
          {emptyStateText}
        </div>
      )}

      {isPickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-8"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className="mx-auto flex max-w-2xl flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-1 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-3">
              <div>
                <div className="text-sm text-text-primary">
                  {modalTitle ?? `Lisää PDF tositteelle #${documentNumber}`}
                </div>
                <div className="text-xs text-text-secondary">
                  Pudota tiedosto tähän tai avaa tiedostonvalitsin klikkaamalla
                  aluetta.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Sulje PDF-valitsin"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              <button
                type="button"
                onClick={openFileBrowser}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (
                    event.currentTarget.contains(
                      event.relatedTarget as Node | null,
                    )
                  ) {
                    return;
                  }
                  setIsDragging(false);
                }}
                onDrop={handleDrop}
                disabled={saving || readOnly}
                className={`flex min-h-72 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging
                    ? 'border-accent bg-accent-muted'
                    : 'border-border-medium bg-surface-0/40 hover:border-text-muted hover:bg-surface-2/70'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {saving ? (
                  <>
                    <Loader2 className="mb-4 h-10 w-10 animate-spin text-accent" />
                    <div className="text-sm font-medium text-text-primary">
                      Ladataan PDF:ää...
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="mb-4 h-10 w-10 text-accent" />
                    <div className="text-base font-medium text-text-primary">
                      Pudota PDF tähän tai klikkaa valitaksesi tiedosto
                    </div>
                    <div className="mt-2 max-w-md text-sm text-text-secondary">
                      Tiedosto tallennetaan automaattisesti oikeaan
                      tositekansioon nimellä{' '}
                      {documentCode ?? `MU-${documentNumber}`}.pdf.
                    </div>
                  </>
                )}
              </button>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted">
                <div>Vain PDF-tiedostot ovat sallittuja.</div>
                <div className="font-mono">{receiptPath ?? 'Ei tositetta'}</div>
              </div>

              {actionError && (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  {actionError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
