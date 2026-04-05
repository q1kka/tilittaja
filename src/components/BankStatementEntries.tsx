'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, FileText, Loader2, Unlink } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/accounting';
import {
  createBankStatementDocumentsAction,
  updateBankStatementEntryDocumentAction,
} from '@/actions/app-actions';
import { buildDocumentListHref } from '@/lib/document-links';
import { buildPdfPreviewSrc } from '@/lib/pdf-preview';
import type { AccountOption } from '@/lib/types';
import DocumentPickerModal from '@/components/DocumentPickerModal';
import type { DocumentOption } from '@/components/DocumentPickerModal';

interface EntryData {
  id: number;
  entry_date: number;
  counterparty: string;
  reference: string | null;
  message: string | null;
  payment_type: string;
  amount: number;
  document_id: number | null;
  document_number: number | null;
  counterpart_account_id: number | null;
  counterpart_account_number: string | null;
  counterpart_account_name: string | null;
}

interface Props {
  statementId: number;
  periodId: number;
  periodLocked: boolean;
  entries: EntryData[];
  accounts?: AccountOption[];
  documents: DocumentOption[];
}

export default function BankStatementEntries({
  statementId,
  periodId,
  periodLocked,
  entries,
  documents,
}: Props) {
  const router = useRouter();
  const [selectedAccountIds, setSelectedAccountIds] = useState<
    Map<number, number | null>
  >(() => {
    const map = new Map<number, number | null>();
    entries.forEach((e) => {
      map.set(e.id, e.counterpart_account_id);
    });
    return map;
  });
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(() => {
    return new Set(entries.filter((e) => !e.document_id).map((e) => e.id));
  });
  const [creating, setCreating] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<
    Map<number, number | null>
  >(() => {
    const map = new Map<number, number | null>();
    entries.forEach((e) => {
      map.set(e.id, e.document_id);
    });
    return map;
  });
  const [linkingEntryId, setLinkingEntryId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [documentPickerEntryId, setDocumentPickerEntryId] = useState<
    number | null
  >(null);
  const [documentSearch, setDocumentSearch] = useState('');
  const [modalSelectedDocumentId, setModalSelectedDocumentId] = useState<
    number | null
  >(null);

  useEffect(() => {
    setSelectedAccountIds(() => {
      const map = new Map<number, number | null>();
      entries.forEach((entry) => {
        map.set(entry.id, entry.counterpart_account_id);
      });
      return map;
    });

    setSelectedDocumentIds(() => {
      const map = new Map<number, number | null>();
      entries.forEach((entry) => {
        map.set(entry.id, entry.document_id);
      });
      return map;
    });

    setSelectedEntries(
      new Set(
        entries
          .filter((entry) => entry.document_id == null)
          .map((entry) => entry.id),
      ),
    );
  }, [entries]);

  const getCurrentDocumentId = (
    entryId: number,
    fallbackDocumentId: number | null,
  ) => selectedDocumentIds.get(entryId) ?? fallbackDocumentId;

  const unprocessedEntryIds = entries
    .filter(
      (entry) => getCurrentDocumentId(entry.id, entry.document_id) == null,
    )
    .map((entry) => entry.id);

  const unprocessedCount = unprocessedEntryIds.length;

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => b.number - a.number);
  }, [documents]);

  const currentPickerDocumentId = useMemo(() => {
    if (documentPickerEntryId == null) return null;
    return selectedDocumentIds.get(documentPickerEntryId) ?? null;
  }, [documentPickerEntryId, selectedDocumentIds]);

  const availableDocuments = useMemo(() => {
    const reservedDocumentIds = new Set<number>();

    selectedDocumentIds.forEach((selectedDocumentId, entryId) => {
      if (selectedDocumentId == null) return;
      if (entryId === documentPickerEntryId) return;
      reservedDocumentIds.add(selectedDocumentId);
    });

    return sortedDocuments.filter(
      (document) =>
        !reservedDocumentIds.has(document.id) ||
        document.id === currentPickerDocumentId,
    );
  }, [
    currentPickerDocumentId,
    documentPickerEntryId,
    selectedDocumentIds,
    sortedDocuments,
  ]);

  const filteredDocuments = useMemo(() => {
    const query = documentSearch.trim().toLowerCase();
    if (!query) return availableDocuments;

    return availableDocuments.filter((document) =>
      [
        String(document.number),
        formatDate(document.date),
        document.description,
        document.receiptPath ?? '',
        document.receiptSource === 'manual'
          ? 'kasin'
          : document.receiptSource === 'automatic'
            ? 'automaattinen'
            : 'ei liitetta',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [availableDocuments, documentSearch]);

  const documentPickerEntry = useMemo(() => {
    if (documentPickerEntryId == null) return null;
    return entries.find((entry) => entry.id === documentPickerEntryId) ?? null;
  }, [documentPickerEntryId, entries]);

  const selectedModalDocument = useMemo(() => {
    if (modalSelectedDocumentId == null) return null;
    return (
      filteredDocuments.find(
        (document) => document.id === modalSelectedDocumentId,
      ) ??
      sortedDocuments.find(
        (document) => document.id === modalSelectedDocumentId,
      ) ??
      null
    );
  }, [filteredDocuments, modalSelectedDocumentId, sortedDocuments]);

  const selectedModalPreviewSrc = selectedModalDocument?.receiptPath
    ? buildPdfPreviewSrc(
        `/api/receipts/pdf?documentId=${selectedModalDocument.id}`,
      )
    : null;

  useEffect(() => {
    if (documentPickerEntryId == null) return;

    if (
      modalSelectedDocumentId != null &&
      filteredDocuments.some(
        (document) => document.id === modalSelectedDocumentId,
      )
    ) {
      return;
    }

    const currentDocumentId = currentPickerDocumentId;
    if (
      currentDocumentId != null &&
      filteredDocuments.some((document) => document.id === currentDocumentId)
    ) {
      setModalSelectedDocumentId(currentDocumentId);
      return;
    }

    setModalSelectedDocumentId(filteredDocuments[0]?.id ?? null);
  }, [
    currentPickerDocumentId,
    documentPickerEntryId,
    filteredDocuments,
    modalSelectedDocumentId,
  ]);

  const handleDocumentChange = async (
    entryId: number,
    documentId: number | null,
  ): Promise<boolean> => {
    if (periodLocked) {
      return false;
    }

    const previousDocumentId = selectedDocumentIds.get(entryId) ?? null;
    const previousSelectedEntries = new Set(selectedEntries);
    setActionError('');
    setSelectedDocumentIds((prev) => new Map(prev).set(entryId, documentId));
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (documentId == null) next.add(entryId);
      else next.delete(entryId);
      return next;
    });
    setLinkingEntryId(entryId);

    try {
      await updateBankStatementEntryDocumentAction(statementId, {
        entryId,
        documentId,
      });
      return true;
    } catch (error) {
      setSelectedDocumentIds((prev) =>
        new Map(prev).set(entryId, previousDocumentId),
      );
      setSelectedEntries(previousSelectedEntries);
      setActionError(
        error instanceof Error
          ? error.message
          : 'Tositteen liitos epäonnistui.',
      );
      return false;
    } finally {
      setLinkingEntryId(null);
    }
  };

  const openDocumentPicker = (entryId: number) => {
    setActionError('');
    setDocumentSearch('');
    const currentDocumentId = selectedDocumentIds.get(entryId) ?? null;
    const reservedDocumentIds = new Set<number>();

    selectedDocumentIds.forEach((selectedId, selectedEntryId) => {
      if (selectedId == null) return;
      if (selectedEntryId === entryId) return;
      reservedDocumentIds.add(selectedId);
    });

    const firstAvailableDocumentId =
      sortedDocuments.find(
        (document) =>
          !reservedDocumentIds.has(document.id) ||
          document.id === currentDocumentId,
      )?.id ?? null;

    setModalSelectedDocumentId(currentDocumentId ?? firstAvailableDocumentId);
    setDocumentPickerEntryId(entryId);
  };

  const closeDocumentPicker = () => {
    setDocumentPickerEntryId(null);
    setDocumentSearch('');
    setModalSelectedDocumentId(null);
  };

  const handleLinkSelectedDocument = async () => {
    if (documentPickerEntryId == null || modalSelectedDocumentId == null)
      return;

    const success = await handleDocumentChange(
      documentPickerEntryId,
      modalSelectedDocumentId,
    );
    if (success) {
      closeDocumentPicker();
    }
  };

  const handleMarkUnprocessed = async (entryId: number) => {
    await handleDocumentChange(entryId, null);
  };

  const toggleEntry = (id: number) => {
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allSelected = unprocessedEntryIds.every((id) =>
      selectedEntries.has(id),
    );
    if (allSelected) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(unprocessedEntryIds));
    }
  };

  const handleCreateDocuments = async () => {
    if (periodLocked) {
      return;
    }

    const idsWithAccounts = [...selectedEntries].filter((id) => {
      const accountId = selectedAccountIds.get(id);
      return accountId != null;
    });

    if (idsWithAccounts.length === 0) return;

    setCreating(true);
    try {
      await createBankStatementDocumentsAction({
        statementId,
        entryIds: idsWithAccounts,
      });
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const readyToCreate = [...selectedEntries].filter((id) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry || getCurrentDocumentId(entry.id, entry.document_id) != null)
      return false;
    return selectedAccountIds.get(id) != null;
  }).length;

  return (
    <div>
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-rose-300">
          {actionError}
        </div>
      )}

      {periodLocked ? (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          Tilikausi on lukittu. Tilioterivien linkitys ja tositteiden luonti
          ovat vain luku -tilassa.
        </div>
      ) : null}

      {unprocessedCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-text-secondary">
            {readyToCreate} / {unprocessedCount} valittu luotavaksi
          </div>
          <button
            onClick={handleCreateDocuments}
            disabled={periodLocked || creating || readyToCreate === 0}
            className="flex items-center gap-2 bg-accent hover:bg-amber-700 disabled:bg-surface-3 disabled:text-text-muted text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Luo tositteet ({readyToCreate})
          </button>
        </div>
      )}

      <div className="bg-surface-2/50 border border-border-subtle rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              {unprocessedCount > 0 && (
                <th className="w-10 px-3 py-2">
                  <label className="inline-flex min-h-[32px] min-w-[32px] cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={
                        unprocessedEntryIds.length > 0 &&
                        unprocessedEntryIds.every((id) => selectedEntries.has(id))
                      }
                      onChange={toggleAll}
                      className="rounded border-border-subtle bg-surface-0/60 text-accent focus:ring-accent/20"
                      aria-label="Valitse kaikki rivit"
                    />
                  </label>
                </th>
              )}
              <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2 w-24">
                Pvm
              </th>
              <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Vastapuoli / Viesti
              </th>
              <th className="text-right text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2 w-28">
                Summa
              </th>
              <th className="text-right text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Tosite
              </th>
            </tr>
          </thead>
          <tbody className="table-divide">
            {entries.map((entry) => {
              const currentDocumentId = getCurrentDocumentId(
                entry.id,
                entry.document_id,
              );
              const isProcessed = currentDocumentId != null;
              const description = [entry.message, entry.reference]
                .filter(Boolean)
                .join(' | ');

              return (
                <tr
                  key={entry.id}
                  className={`transition-colors ${isProcessed ? 'opacity-60' : 'hover:bg-surface-3/40'}`}
                >
                  {unprocessedCount > 0 && (
                    <td className="px-3 py-1.5">
                      {!isProcessed && (
                        <label className="inline-flex min-h-[32px] min-w-[32px] cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedEntries.has(entry.id)}
                            onChange={() => toggleEntry(entry.id)}
                            className="rounded border-border-subtle bg-surface-0/60 text-accent focus:ring-accent/20"
                            aria-label={`Valitse rivi: ${entry.counterparty || 'tiliotevienti'}`}
                          />
                        </label>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-xs text-text-secondary tabular-nums whitespace-nowrap">
                    {formatDate(entry.entry_date)}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="text-xs text-text-primary truncate">
                      {entry.counterparty}
                    </div>
                    {description && (
                      <div className="text-[11px] text-text-muted truncate">
                        {description}
                      </div>
                    )}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-xs text-right font-mono tabular-nums ${
                      entry.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {entry.amount > 0 ? '+' : ''}
                    {formatCurrency(entry.amount)}
                  </td>
                  <td className="px-3 py-1.5">
                    {isProcessed ? (
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={buildDocumentListHref(
                            currentDocumentId,
                            periodId,
                          )}
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3 h-3" />#
                          {entry.document_number ?? currentDocumentId}
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleMarkUnprocessed(entry.id)}
                          disabled={periodLocked || linkingEntryId === entry.id}
                          className="inline-flex items-center gap-1 rounded border border-border-subtle bg-transparent px-2 py-1 text-xs text-text-secondary hover:bg-surface-3 hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-muted"
                          aria-label="Poista tositelinkki"
                        >
                          {linkingEntryId === entry.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Unlink className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => openDocumentPicker(entry.id)}
                          disabled={periodLocked}
                          className="w-full rounded-md border border-border-subtle bg-surface-0/60 px-2 py-1 text-left text-xs text-text-primary hover:bg-surface-0/80"
                        >
                          {currentDocumentId
                            ? `#${entry.document_number ?? currentDocumentId}`
                            : 'Liitä'}
                        </button>
                        {linkingEntryId === entry.id && (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-accent animate-spin" />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            Ei tapahtumia
          </div>
        )}
      </div>

      {documentPickerEntry && (
        <DocumentPickerModal
          entry={documentPickerEntry}
          periodId={periodId}
          documentSearch={documentSearch}
          onDocumentSearchChange={setDocumentSearch}
          filteredDocuments={filteredDocuments}
          availableDocumentCount={availableDocuments.length}
          modalSelectedDocumentId={modalSelectedDocumentId}
          onSelectDocument={setModalSelectedDocumentId}
          selectedDocument={selectedModalDocument}
          previewSrc={selectedModalPreviewSrc}
          linking={linkingEntryId === documentPickerEntry.id}
          onLink={handleLinkSelectedDocument}
          onClose={closeDocumentPicker}
        />
      )}
    </div>
  );
}
