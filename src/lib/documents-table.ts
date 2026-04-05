import type { ReceiptSource } from '@/lib/receipt-pdfs';

export interface EntryDetail {
  id: number;
  account_id: number;
  account_number: string;
  account_name: string;
  description: string;
  debit: boolean;
  amount: number;
  row_number: number;
  isVatEntry: boolean;
}

export interface DocumentSummary {
  id: number;
  number: number;
  date: number;
  category: string;
  name: string;
  code: string;
  debitTotal: number;
  netTotal: number;
  description: string;
  entryCount: number;
  accountNames: string[];
  entries: EntryDetail[];
  hasReceiptPdf: boolean;
  receiptPath: string | null;
  receiptSource: ReceiptSource;
  bankStatementLinks: {
    document_id: number;
    bank_statement_id: number;
    bank_statement_period_start: number;
    bank_statement_period_end: number;
    bank_statement_account_number: string;
    bank_statement_account_name: string;
    linked_entry_count: number;
  }[];
}

const MONTH_KEY_FORMATTER = new Intl.DateTimeFormat('fi-FI', {
  year: 'numeric',
  month: '2-digit',
  timeZone: 'Europe/Helsinki',
});

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('fi-FI', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Helsinki',
});

function getMonthParts(timestamp: number): { year: string; month: string } {
  const parts = MONTH_KEY_FORMATTER.formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return { year, month: month.padStart(2, '0') };
}

export function getMonthKey(timestamp: number): string {
  const { year, month } = getMonthParts(timestamp);
  return `${year}-${month}`;
}

export function getMonthLabel(timestamp: number): string {
  const formatted = MONTH_LABEL_FORMATTER.format(new Date(timestamp));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getVatSummary(entries: EntryDetail[]) {
  const vatDebitTotal = entries
    .filter((entry) => entry.isVatEntry && entry.debit)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const vatCreditTotal = entries
    .filter((entry) => entry.isVatEntry && !entry.debit)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const reverseChargeVat = vatDebitTotal > 0 && vatCreditTotal > 0;
  const vatAmount = reverseChargeVat
    ? Math.min(vatDebitTotal, vatCreditTotal)
    : Math.max(vatDebitTotal, vatCreditTotal);

  return { vatDebitTotal, vatCreditTotal, reverseChargeVat, vatAmount };
}

export function buildAccountNames(entries: EntryDetail[]) {
  return [
    ...new Set(
      entries.map((entry) => `${entry.account_number} ${entry.account_name}`),
    ),
  ].slice(0, 3);
}

export function normalizeDocumentSummary(
  doc: DocumentSummary,
): DocumentSummary {
  const entries = doc.entries.map((entry) => ({
    ...entry,
    isVatEntry: Boolean(entry.isVatEntry),
  }));
  const accountNames = Array.isArray(doc.accountNames)
    ? doc.accountNames
    : buildAccountNames(entries);
  const bankStatementLinks = Array.isArray(doc.bankStatementLinks)
    ? doc.bankStatementLinks
    : [];
  const computedDebitTotal = entries
    .filter((entry) => entry.debit)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const debitTotal = entries.length > 0 ? computedDebitTotal : doc.debitTotal;
  const { vatAmount: computedVatTotal } = getVatSummary(entries);
  const netTotal =
    computedVatTotal > 0
      ? Math.round((debitTotal - computedVatTotal) * 100) / 100
      : Number.isFinite(doc.netTotal)
        ? doc.netTotal
        : debitTotal;

  return {
    ...doc,
    accountNames,
    bankStatementLinks,
    entries,
    debitTotal,
    netTotal,
  };
}
