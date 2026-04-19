// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

import { useDocumentAccountPicker } from './useDocumentAccountPicker';
import type { AccountOption } from '@/lib/types';
import type { DocumentSummary } from '@/lib/documents-table';

const { updateEntryAccountAction } = vi.hoisted(() => ({
  updateEntryAccountAction: vi.fn(),
}));

vi.mock('@/actions/app-actions', () => ({
  updateEntryAccountAction,
}));

const accounts: AccountOption[] = [
  { id: 1, number: '1000', name: 'Kassa', type: 0, vat_percentage: 0 },
  { id: 2, number: '3000', name: 'Myynti', type: 3, vat_percentage: 0 },
  { id: 3, number: '2000', name: 'Pankki', type: 0, vat_percentage: 0 },
];

function makeDocumentsState(): DocumentSummary[] {
  return [
    {
      id: 10,
      number: 1,
      date: Date.UTC(2025, 0, 1),
      category: 'MU',
      name: 'Testi',
      code: 'MU-1',
      debitTotal: 100,
      netTotal: 100,
      description: 'Testi',
      entryCount: 2,
      accountNames: ['1000 Kassa', '3000 Myynti'],
      entries: [
        {
          id: 100,
          account_id: 1,
          account_number: '1000',
          account_name: 'Kassa',
          description: 'Debet',
          debit: true,
          amount: 100,
          row_number: 1,
          isVatEntry: false,
        },
        {
          id: 101,
          account_id: 2,
          account_number: '3000',
          account_name: 'Myynti',
          description: 'Kredit',
          debit: false,
          amount: 100,
          row_number: 2,
          isVatEntry: false,
        },
      ],
      hasReceiptPdf: false,
      receiptPath: null,
      receiptSource: null,
      bankStatementLinks: [],
    },
  ];
}

describe('useDocumentAccountPicker', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with picker closed and no errors', () => {
    const setDocumentsState = vi.fn();
    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    expect(result.current.accountPicker.isOpen).toBe(false);
    expect(result.current.accountPickerDocumentId).toBeNull();
    expect(result.current.accountModalError).toBe('');
    expect(result.current.savingAccountEntryId).toBeNull();
  });

  it('opens the picker for a specific document and entry', () => {
    const setDocumentsState = vi.fn();
    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    act(() => {
      result.current.openAccountPicker(10, 100, 1);
    });

    expect(result.current.accountPicker.isOpen).toBe(true);
    expect(result.current.accountPicker.entryId).toBe(100);
    expect(result.current.accountPickerDocumentId).toBe(10);
    expect(result.current.accountPicker.selectedAccountId).toBe(1);
  });

  it('filters accounts by search query', () => {
    const setDocumentsState = vi.fn();
    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    expect(result.current.filteredAccounts).toHaveLength(3);

    act(() => {
      result.current.setAccountSearch('kassa');
    });

    expect(result.current.filteredAccounts).toHaveLength(1);
    expect(result.current.filteredAccounts[0].name).toBe('Kassa');
  });

  it('resolves accountPickerEntry from documents state', () => {
    const setDocumentsState = vi.fn();
    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    expect(result.current.accountPickerEntry).toBeNull();

    act(() => {
      result.current.openAccountPicker(10, 100, 1);
    });

    expect(result.current.accountPickerEntry).not.toBeNull();
    expect(result.current.accountPickerEntry!.doc.id).toBe(10);
    expect(result.current.accountPickerEntry!.entry.id).toBe(100);
  });

  it('handles successful account change', async () => {
    const setDocumentsState = vi.fn();
    updateEntryAccountAction.mockResolvedValue({
      id: 100,
      accountId: 3,
      accountNumber: '2000',
      accountName: 'Pankki',
    });

    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    act(() => {
      result.current.openAccountPicker(10, 100, 1);
    });

    act(() => {
      result.current.accountPicker.setSelectedAccountId(3);
    });

    await act(async () => {
      await result.current.handleEntryAccountChange();
    });

    expect(updateEntryAccountAction).toHaveBeenCalledWith(100, { accountId: 3 });
    expect(setDocumentsState).toHaveBeenCalled();
    expect(result.current.accountPicker.isOpen).toBe(false);
    expect(result.current.accountModalError).toBe('');
  });

  it('shows error on failed account change', async () => {
    const setDocumentsState = vi.fn();
    updateEntryAccountAction.mockRejectedValue(new Error('Lukittu tilikausi'));

    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    act(() => {
      result.current.openAccountPicker(10, 100, 1);
    });

    act(() => {
      result.current.accountPicker.setSelectedAccountId(3);
    });

    await act(async () => {
      await result.current.handleEntryAccountChange();
    });

    expect(result.current.accountModalError).toBe('Lukittu tilikausi');
    expect(result.current.accountPicker.isOpen).toBe(true);
  });

  it('closes picker and resets state', () => {
    const setDocumentsState = vi.fn();
    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    act(() => {
      result.current.openAccountPicker(10, 100, 1);
    });

    act(() => {
      result.current.closeAccountPicker();
    });

    expect(result.current.accountPicker.isOpen).toBe(false);
    expect(result.current.accountPickerDocumentId).toBeNull();
    expect(result.current.accountSearch).toBe('');
    expect(result.current.accountModalError).toBe('');
  });

  it('cleanupForDeletedDocument resets picker when matching', () => {
    const setDocumentsState = vi.fn();
    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    act(() => {
      result.current.openAccountPicker(10, 100, 1);
    });

    act(() => {
      result.current.cleanupForDeletedDocument(10, new Set([100, 101]));
    });

    expect(result.current.accountPicker.isOpen).toBe(false);
    expect(result.current.accountPickerDocumentId).toBeNull();
  });

  it('cleanupForDeletedDocument does nothing for non-matching document', () => {
    const setDocumentsState = vi.fn();
    const { result } = renderHook(() =>
      useDocumentAccountPicker({
        accounts,
        documentsState: makeDocumentsState(),
        setDocumentsState,
      }),
    );

    act(() => {
      result.current.openAccountPicker(10, 100, 1);
    });

    act(() => {
      result.current.cleanupForDeletedDocument(999, new Set([500]));
    });

    expect(result.current.accountPicker.isOpen).toBe(true);
  });
});
