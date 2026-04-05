// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentLabels } from './useDocumentLabels';
import type { DocumentSummary } from '@/lib/documents-table';

function createDocumentSummary(
  id: number,
  number: number,
  overrides: Partial<DocumentSummary> = {},
): DocumentSummary {
  return {
    id,
    number,
    date: Date.UTC(2025, 0, 1),
    category: 'MU',
    name: `Tosite ${number}`,
    code: `MU-${number}`,
    debitTotal: 100,
    netTotal: 100,
    description: `Kuvaus ${number}`,
    entryCount: 1,
    accountNames: ['1910 Pankki'],
    entries: [
      {
        id: id * 10 + 1,
        account_id: 1,
        account_number: '1910',
        account_name: 'Pankki',
        description: `Rivi ${number}`,
        debit: true,
        amount: 100,
        row_number: 1,
        isVatEntry: false,
      },
    ],
    hasReceiptPdf: false,
    receiptPath: null,
    receiptSource: null,
    bankStatementLinks: [],
    ...overrides,
  };
}

describe('useDocumentLabels', () => {
  it('resolves saved labels from document state', () => {
    const docs = [
      createDocumentSummary(1, 1, { category: 'MY', name: 'Lasku' }),
    ];

    const { result } = renderHook(() => useDocumentLabels(docs, {}, {}));

    const saved = result.current.savedLabelsByDocumentId.get(1);
    expect(saved).toBeDefined();
    expect(saved!.category).toBe('MY');
    expect(saved!.name).toBe('Lasku');
    expect(saved!.code).toBe('MY-1');
  });

  it('resolves draft labels with overridden category and name', () => {
    const docs = [
      createDocumentSummary(1, 1, { category: 'MU', name: 'Alkup' }),
    ];

    const { result } = renderHook(() =>
      useDocumentLabels(docs, { 1: 'OS' }, { 1: 'Uusi nimi' }),
    );

    const draft = result.current.draftLabelsByDocumentId.get(1);
    expect(draft).toBeDefined();
    expect(draft!.category).toBe('OS');
    expect(draft!.name).toBe('Uusi nimi');
    expect(draft!.code).toBe('OS-1');

    const saved = result.current.savedLabelsByDocumentId.get(1);
    expect(saved!.category).toBe('MU');
    expect(saved!.name).toBe('Alkup');
  });

  it('enriches documentsWithResolvedLabels', () => {
    const docs = [
      createDocumentSummary(1, 1, { category: 'MY', name: 'Lasku A' }),
      createDocumentSummary(2, 2, { category: 'OS', name: 'Osto B' }),
    ];

    const { result } = renderHook(() => useDocumentLabels(docs, {}, {}));

    const enriched = result.current.documentsWithResolvedLabels;
    expect(enriched).toHaveLength(2);

    expect(enriched[0].code).toBe('MY-1');
    expect(enriched[0].description).toBe('Lasku A');
    expect(enriched[0].category).toBe('MY');

    expect(enriched[1].code).toBe('OS-1');
    expect(enriched[1].description).toBe('Osto B');
    expect(enriched[1].category).toBe('OS');
  });
});
