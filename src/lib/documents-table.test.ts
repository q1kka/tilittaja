import { describe, expect, it } from 'vitest';

import type { DocumentSummary, EntryDetail } from '@/lib/documents-table';
import {
  buildAccountNames,
  getMonthKey,
  getMonthLabel,
  getVatSummary,
  normalizeDocumentSummary,
} from '@/lib/documents-table';

function entryDetail(overrides: Partial<EntryDetail>): EntryDetail {
  return {
    id: 0,
    account_id: 0,
    account_number: '1000',
    account_name: 'Tili',
    description: '',
    debit: true,
    amount: 0,
    row_number: 1,
    isVatEntry: false,
    ...overrides,
  };
}

function docSummary(overrides: Partial<DocumentSummary>): DocumentSummary {
  return {
    id: 1,
    number: 1,
    date: 0,
    category: 'MU',
    name: '',
    code: 'MU-1',
    debitTotal: 0,
    netTotal: 0,
    description: '',
    entryCount: 0,
    accountNames: [],
    entries: [],
    hasReceiptPdf: false,
    receiptPath: null,
    receiptSource: null,
    bankStatementLinks: [],
    ...overrides,
  };
}

describe('getMonthKey', () => {
  it('formats January 2024 as year-month using Europe/Helsinki (fi-FI month part)', () => {
    expect(getMonthKey(Date.UTC(2024, 0, 15))).toBe('2024-01');
  });

  it('formats December 2024 as 2024-12', () => {
    expect(getMonthKey(Date.UTC(2024, 11, 31))).toBe('2024-12');
  });
});

describe('getMonthLabel', () => {
  it('returns capitalized Finnish month name with year', () => {
    expect(getMonthLabel(Date.UTC(2024, 0, 15))).toBe('Tammikuu 2024');
    expect(getMonthLabel(Date.UTC(2024, 5, 1))).toBe('Kesäkuu 2024');
  });
});

describe('getVatSummary', () => {
  it('returns zeros when there are no VAT entries', () => {
    expect(
      getVatSummary([
        entryDetail({ amount: 100, isVatEntry: false }),
        entryDetail({ id: 1, debit: false, amount: 50, isVatEntry: false }),
      ]),
    ).toEqual({
      vatDebitTotal: 0,
      vatCreditTotal: 0,
      reverseChargeVat: false,
      vatAmount: 0,
    });
  });

  it('sums a single VAT debit entry', () => {
    expect(
      getVatSummary([
        entryDetail({ amount: 24, isVatEntry: true, debit: true }),
      ]),
    ).toEqual({
      vatDebitTotal: 24,
      vatCreditTotal: 0,
      reverseChargeVat: false,
      vatAmount: 24,
    });
  });

  it('detects reverse charge and uses min of debit and credit VAT', () => {
    expect(
      getVatSummary([
        entryDetail({ id: 1, amount: 100, isVatEntry: true, debit: true }),
        entryDetail({ id: 2, amount: 80, isVatEntry: true, debit: false }),
      ]),
    ).toEqual({
      vatDebitTotal: 100,
      vatCreditTotal: 80,
      reverseChargeVat: true,
      vatAmount: 80,
    });
  });
});

describe('buildAccountNames', () => {
  it('returns unique account labels in encounter order', () => {
    expect(
      buildAccountNames([
        entryDetail({ account_number: '3000', account_name: 'A' }),
        entryDetail({ id: 1, account_number: '4000', account_name: 'B' }),
        entryDetail({ id: 2, account_number: '3000', account_name: 'A' }),
      ]),
    ).toEqual(['3000 A', '4000 B']);
  });

  it('returns at most three entries', () => {
    expect(
      buildAccountNames([
        entryDetail({ account_number: '1', account_name: 'E1' }),
        entryDetail({ id: 1, account_number: '2', account_name: 'E2' }),
        entryDetail({ id: 2, account_number: '3', account_name: 'E3' }),
        entryDetail({ id: 3, account_number: '4', account_name: 'E4' }),
      ]),
    ).toEqual(['1 E1', '2 E2', '3 E3']);
  });
});

describe('normalizeDocumentSummary', () => {
  it('recomputes debitTotal from debit entries when entries are present', () => {
    const normalized = normalizeDocumentSummary(
      docSummary({
        debitTotal: 999,
        entries: [
          entryDetail({ amount: 50 }),
          entryDetail({ id: 1, amount: 25 }),
          entryDetail({ id: 2, debit: false, amount: 10 }),
        ],
      }),
    );
    expect(normalized.debitTotal).toBe(75);
  });

  it('subtracts VAT from debit total to compute netTotal when VAT is present', () => {
    const normalized = normalizeDocumentSummary(
      docSummary({
        entries: [
          entryDetail({ amount: 100, isVatEntry: false }),
          entryDetail({ id: 1, amount: 24, isVatEntry: true, debit: true }),
        ],
      }),
    );
    expect(normalized.debitTotal).toBe(124);
    expect(normalized.netTotal).toBe(100);
  });

  it('keeps doc.debitTotal when entries are empty', () => {
    const normalized = normalizeDocumentSummary(
      docSummary({
        debitTotal: 42,
        netTotal: 40,
        entries: [],
      }),
    );
    expect(normalized.debitTotal).toBe(42);
  });

  it('coerces isVatEntry to boolean so truthy values count as VAT', () => {
    const raw = {
      ...entryDetail({ amount: 10, isVatEntry: true }),
      isVatEntry: 1,
    };
    const normalized = normalizeDocumentSummary(
      docSummary({
        entries: [raw as unknown as EntryDetail],
      }),
    );
    expect(normalized.entries[0]?.isVatEntry).toBe(true);
    expect(getVatSummary(normalized.entries).vatDebitTotal).toBe(10);
  });

  it('falls back to debitTotal when netTotal is NaN and no VAT entries exist', () => {
    const normalized = normalizeDocumentSummary(
      docSummary({
        debitTotal: 200,
        netTotal: NaN,
        entries: [entryDetail({ amount: 200 })],
      }),
    );
    expect(normalized.netTotal).toBe(200);
  });
});
