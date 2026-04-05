// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDocumentEditing } from './useDocumentEditing';
import type { DocumentSummary } from '@/lib/documents-table';
import type { AccountOption } from '@/lib/types';

vi.mock('@/hooks/useDocumentLabels', () => ({
  useDocumentLabels: (
    documentsState: DocumentSummary[],
    categoryValues: Record<number, string>,
    nameValues: Record<number, string>,
  ) => ({
    documentsWithResolvedLabels: documentsState.map((doc) => ({
      ...doc,
      category: categoryValues[doc.id] ?? doc.category,
      name: nameValues[doc.id] ?? doc.name,
    })),
    draftLabelsByDocumentId: new Map(),
  }),
}));

vi.mock('@/hooks/useDocumentAccountPicker', () => ({
  useDocumentAccountPicker: () => ({
    accountPicker: {
      isOpen: false,
      entryId: null,
      selectedAccountId: null,
      selectedAccount: null,
      sortedAccounts: [],
      setSelectedAccountId: vi.fn(),
      open: vi.fn(),
      close: vi.fn(),
    },
    accountPickerDocumentId: null,
    accountSearch: '',
    setAccountSearch: vi.fn(),
    filteredAccounts: [],
    accountPickerEntry: null,
    savingAccountEntryId: null,
    accountModalError: '',
    openAccountPicker: vi.fn(),
    closeAccountPicker: vi.fn(),
    handleEntryAccountChange: vi.fn(),
    cleanupForDeletedDocument: vi.fn(),
  }),
}));

function createDocument(
  id: number,
  number: number,
  date: number,
): DocumentSummary {
  return {
    id,
    number,
    date,
    category: 'MU',
    name: `Tosite ${number}`,
    code: `MU-${number}`,
    debitTotal: 10,
    netTotal: 10,
    description: `Kuvaus ${number}`,
    entryCount: 2,
    accountNames: ['1910 Pankki'],
    entries: [
      {
        id: id * 10 + 1,
        account_id: 1,
        account_number: '1910',
        account_name: 'Pankki',
        description: `Debet ${number}`,
        debit: true,
        amount: 10,
        row_number: 1,
        isVatEntry: false,
      },
      {
        id: id * 10 + 2,
        account_id: 2,
        account_number: '6990',
        account_name: 'Kulut',
        description: `Kredit ${number}`,
        debit: false,
        amount: 10,
        row_number: 2,
        isVatEntry: false,
      },
    ],
    hasReceiptPdf: false,
    receiptPath: null,
    receiptSource: null,
    bankStatementLinks: [],
  };
}

describe('useDocumentEditing', () => {
  it('resets local state when documents change between periods', () => {
    const accounts: AccountOption[] = [
      { id: 1, number: '1910', name: 'Pankki', type: 0, vat_percentage: 0 },
      { id: 2, number: '6990', name: 'Kulut', type: 8, vat_percentage: 0 },
    ];
    const periodOneDocuments = [createDocument(1, 1, Date.UTC(2025, 11, 31))];
    const periodTwoDocuments = [createDocument(2, 46, Date.UTC(2026, 0, 1))];

    const { result, rerender } = renderHook(
      ({
        documents,
        periodId,
      }: {
        documents: DocumentSummary[];
        periodId: number;
      }) =>
        useDocumentEditing({
          documents,
          periodId,
          accounts,
          activeDocumentId: null,
          setExpandedDocumentId: vi.fn(),
        }),
      {
        initialProps: {
          documents: periodOneDocuments,
          periodId: 1,
        },
      },
    );

    expect(result.current.documentsState.map((doc) => doc.id)).toEqual([1]);
    expect(result.current.dateValues[1]).toBe('2025-12-31');

    rerender({
      documents: periodTwoDocuments,
      periodId: 2,
    });

    expect(result.current.documentsState.map((doc) => doc.id)).toEqual([2]);
    expect(result.current.documentsState[0]?.number).toBe(46);
    expect(result.current.dateValues[2]).toBe('2026-01-01');
    expect(result.current.dateValues[1]).toBeUndefined();
    expect(result.current.amountValues[21]).toBe('10,00');
    expect(result.current.amountValues[11]).toBeUndefined();
  });
});
