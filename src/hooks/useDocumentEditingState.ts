'use client';

import { useEffect, useState } from 'react';
import { formatAmountInputValue } from '@/lib/amount-input';
import { getDateInputValue } from '@/lib/date-input';
import {
  normalizeDocumentSummary,
  type DocumentSummary,
} from '@/lib/documents-table';

interface UseDocumentEditingStateParams {
  documents: DocumentSummary[];
  periodId: number;
}

export function useDocumentEditingState({
  documents,
  periodId,
}: UseDocumentEditingStateParams) {
  const [documentsState, setDocumentsState] = useState(() =>
    documents.map(normalizeDocumentSummary),
  );
  const [dateValues, setDateValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      documents.map((doc) => [doc.id, getDateInputValue(doc.date)]),
    ),
  );
  const [savingId, setSavingId] = useState<number | null>(null);
  const [dateErrors, setDateErrors] = useState<Record<number, string>>({});
  const [savedId, setSavedId] = useState<number | null>(null);
  const [categoryValues, setCategoryValues] = useState<Record<number, string>>(
    () => Object.fromEntries(documents.map((doc) => [doc.id, doc.category])),
  );
  const [nameValues, setNameValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(documents.map((doc) => [doc.id, doc.name])),
  );
  const [savingMetadataDocumentId, setSavingMetadataDocumentId] = useState<
    number | null
  >(null);
  const [metadataErrors, setMetadataErrors] = useState<Record<number, string>>(
    {},
  );
  const [savedMetadataDocumentId, setSavedMetadataDocumentId] = useState<
    number | null
  >(null);
  const [amountValues, setAmountValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      documents.flatMap((doc) =>
        doc.entries.map((entry) => [
          entry.id,
          formatAmountInputValue(entry.amount),
        ]),
      ),
    ),
  );
  const [savingAmountsDocumentId, setSavingAmountsDocumentId] = useState<
    number | null
  >(null);
  const [amountErrors, setAmountErrors] = useState<Record<number, string>>({});
  const [savedAmountsDocumentId, setSavedAmountsDocumentId] = useState<
    number | null
  >(null);
  const [deletedEntryIdsByDocument, setDeletedEntryIdsByDocument] = useState<
    Record<number, number[]>
  >({});
  const [duplicatingDocumentId, setDuplicatingDocumentId] = useState<
    number | null
  >(null);
  const [duplicateErrors, setDuplicateErrors] = useState<
    Record<number, string>
  >({});
  const [duplicatedDocumentId, setDuplicatedDocumentId] = useState<
    number | null
  >(null);
  const [deleteErrors, setDeleteErrors] = useState<Record<number, string>>({});

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const nextDocuments = documents.map(normalizeDocumentSummary);

    setDocumentsState(nextDocuments);
    setDateValues(
      Object.fromEntries(
        nextDocuments.map((doc) => [doc.id, getDateInputValue(doc.date)]),
      ),
    );
    setCategoryValues(
      Object.fromEntries(nextDocuments.map((doc) => [doc.id, doc.category])),
    );
    setNameValues(
      Object.fromEntries(nextDocuments.map((doc) => [doc.id, doc.name])),
    );
    setAmountValues(
      Object.fromEntries(
        nextDocuments.flatMap((doc) =>
          doc.entries.map((entry) => [
            entry.id,
            formatAmountInputValue(entry.amount),
          ]),
        ),
      ),
    );

    setSavingId(null);
    setDateErrors({});
    setSavedId(null);
    setSavingMetadataDocumentId(null);
    setMetadataErrors({});
    setSavedMetadataDocumentId(null);
    setSavingAmountsDocumentId(null);
    setAmountErrors({});
    setSavedAmountsDocumentId(null);
    setDeletedEntryIdsByDocument({});
    setDuplicatingDocumentId(null);
    setDuplicateErrors({});
    setDuplicatedDocumentId(null);
    setDeleteErrors({});
  }, [documents, periodId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateDateValue = (id: number, value: string) => {
    setDateValues((prev) => ({ ...prev, [id]: value }));
    setDateErrors((prev) => ({ ...prev, [id]: '' }));
    setSavedId((current) => (current === id ? null : current));
  };

  const updateCategoryValue = (id: number, value: string) => {
    setCategoryValues((prev) => ({ ...prev, [id]: value }));
    setMetadataErrors((prev) => ({ ...prev, [id]: '' }));
    setSavedMetadataDocumentId((current) => (current === id ? null : current));
  };

  const updateNameValue = (id: number, value: string) => {
    setNameValues((prev) => ({ ...prev, [id]: value }));
    setMetadataErrors((prev) => ({ ...prev, [id]: '' }));
    setSavedMetadataDocumentId((current) => (current === id ? null : current));
  };

  const updateAmountValue = (
    documentId: number,
    entryId: number,
    value: string,
  ) => {
    setAmountValues((prev) => ({ ...prev, [entryId]: value }));
    setAmountErrors((prev) => ({ ...prev, [documentId]: '' }));
    setSavedAmountsDocumentId((current) =>
      current === documentId ? null : current,
    );
  };

  const markEntryForDeletion = (documentId: number, entryId: number) => {
    setDeletedEntryIdsByDocument((prev) => {
      const current = prev[documentId] ?? [];
      if (current.includes(entryId)) return prev;
      return { ...prev, [documentId]: [...current, entryId] };
    });
    setAmountErrors((prev) => ({ ...prev, [documentId]: '' }));
    setSavedAmountsDocumentId((current) =>
      current === documentId ? null : current,
    );
  };

  const clearPendingDeletions = (documentId: number) => {
    setDeletedEntryIdsByDocument((prev) => {
      if (!(documentId in prev)) return prev;
      const next = { ...prev };
      delete next[documentId];
      return next;
    });
    setAmountErrors((prev) => ({ ...prev, [documentId]: '' }));
    setSavedAmountsDocumentId((current) =>
      current === documentId ? null : current,
    );
  };

  return {
    documentsState,
    setDocumentsState,
    dateValues,
    setDateValues,
    updateDateValue,
    savingId,
    setSavingId,
    dateErrors,
    setDateErrors,
    savedId,
    setSavedId,
    categoryValues,
    updateCategoryValue,
    setCategoryValues,
    nameValues,
    updateNameValue,
    setNameValues,
    savingMetadataDocumentId,
    setSavingMetadataDocumentId,
    metadataErrors,
    setMetadataErrors,
    savedMetadataDocumentId,
    setSavedMetadataDocumentId,
    amountValues,
    updateAmountValue,
    setAmountValues,
    savingAmountsDocumentId,
    setSavingAmountsDocumentId,
    amountErrors,
    setAmountErrors,
    savedAmountsDocumentId,
    setSavedAmountsDocumentId,
    deletedEntryIdsByDocument,
    markEntryForDeletion,
    clearPendingDeletions,
    setDeletedEntryIdsByDocument,
    duplicatingDocumentId,
    setDuplicatingDocumentId,
    duplicateErrors,
    setDuplicateErrors,
    duplicatedDocumentId,
    setDuplicatedDocumentId,
    deleteErrors,
    setDeleteErrors,
  };
}
