import {
  Account,
  Period,
  Document,
  Entry,
  EntryWithAccount,
  COAHeading,
  ReportStructure,
} from '../types';
import { getDb } from './connection';

type PeriodMatchRow = {
  id: number;
};

type MaxNumberRow = {
  maxNum: number;
};

type MismatchedDocumentRow = {
  id: number;
  period_id: number;
  date: number;
  matched_period_id: number;
};

function getDocumentRow(id: number): Document | undefined {
  return getDb().prepare('SELECT * FROM document WHERE id = ?').get(id) as
    | Document
    | undefined;
}

function getMatchingPeriodIdForDate(date: number): number | null {
  const row = getDb()
    .prepare(
      `SELECT id
       FROM period
       WHERE start_date <= ? AND end_date >= ?
       ORDER BY start_date DESC
       LIMIT 1`,
    )
    .get(date, date) as PeriodMatchRow | undefined;

  return row?.id ?? null;
}

function getNextDocumentNumber(periodId: number): number {
  const row = getDb()
    .prepare(
      'SELECT COALESCE(MAX(number), 0) as maxNum FROM document WHERE period_id = ?',
    )
    .get(periodId) as MaxNumberRow;

  return row.maxNum + 1;
}

function ensureDocumentPeriodsMatchDates(): void {
  const mismatches = getDb()
    .prepare(
      `WITH matched_documents AS (
         SELECT
           d.id,
           d.period_id,
           d.date,
           (
             SELECT p.id
             FROM period p
             WHERE p.start_date <= d.date AND p.end_date >= d.date
             ORDER BY p.start_date DESC
             LIMIT 1
           ) as matched_period_id
         FROM document d
       )
       SELECT *
       FROM matched_documents
       WHERE matched_period_id IS NOT NULL AND matched_period_id != period_id
       ORDER BY date ASC, id ASC`,
    )
    .all() as MismatchedDocumentRow[];

  if (mismatches.length === 0) {
    return;
  }

  const normalizeInTransaction = getDb().transaction(
    (rows: MismatchedDocumentRow[]) => {
      for (const row of rows) {
        const nextNumber = getNextDocumentNumber(row.matched_period_id);
        getDb()
          .prepare('UPDATE document SET period_id = ?, number = ? WHERE id = ?')
          .run(row.matched_period_id, nextNumber, row.id);
      }
    },
  );

  normalizeInTransaction(mismatches);
}

export function getPeriods(): Period[] {
  return getDb()
    .prepare('SELECT * FROM period ORDER BY start_date DESC')
    .all() as Period[];
}

export function getPeriod(id: number): Period | undefined {
  return getDb().prepare('SELECT * FROM period WHERE id = ?').get(id) as
    | Period
    | undefined;
}

export function setPeriodLocked(periodId: number, locked: boolean): void {
  getDb()
    .prepare('UPDATE period SET locked = ? WHERE id = ?')
    .run(locked ? 1 : 0, periodId);
}

export interface DocumentBalanceInfo {
  document_id: number;
  document_number: number;
  document_date: number;
  total_debit: number;
  total_credit: number;
}

export function getDocumentBalances(periodId: number): DocumentBalanceInfo[] {
  ensureDocumentPeriodsMatchDates();
  return getDb()
    .prepare(
      `SELECT d.id as document_id, d.number as document_number, d.date as document_date,
              COALESCE(SUM(CASE WHEN e.debit = 1 THEN e.amount ELSE 0 END), 0) as total_debit,
              COALESCE(SUM(CASE WHEN e.debit = 0 THEN e.amount ELSE 0 END), 0) as total_credit
       FROM document d
       LEFT JOIN entry e ON e.document_id = d.id
       WHERE d.period_id = ?
       GROUP BY d.id
       ORDER BY d.number`,
    )
    .all(periodId) as DocumentBalanceInfo[];
}

export function getAccounts(): Account[] {
  return getDb()
    .prepare('SELECT * FROM account ORDER BY number')
    .all() as Account[];
}

export function getAccount(id: number): Account | undefined {
  return getDb().prepare('SELECT * FROM account WHERE id = ?').get(id) as
    | Account
    | undefined;
}

export function getCOAHeadings(): COAHeading[] {
  return getDb()
    .prepare('SELECT * FROM coa_heading ORDER BY number, level')
    .all() as COAHeading[];
}

export function getDocuments(periodId: number): Document[] {
  ensureDocumentPeriodsMatchDates();
  return getDb()
    .prepare('SELECT * FROM document WHERE period_id = ? ORDER BY number')
    .all(periodId) as Document[];
}

export function getDocument(id: number): Document | undefined {
  ensureDocumentPeriodsMatchDates();
  return getDocumentRow(id);
}

export function getEntry(id: number): Entry | undefined {
  return getDb().prepare('SELECT * FROM entry WHERE id = ?').get(id) as
    | Entry
    | undefined;
}

export function getEntriesForDocument(documentId: number): EntryWithAccount[] {
  return getDb()
    .prepare(
      `SELECT e.*, a.number as account_number, a.name as account_name
       FROM entry e
       JOIN account a ON a.id = e.account_id
       WHERE e.document_id = ?
       ORDER BY e.row_number`,
    )
    .all(documentId) as EntryWithAccount[];
}

export function getEntriesForPeriod(
  periodId: number,
): (Entry & { document_number: number; document_date: number })[] {
  ensureDocumentPeriodsMatchDates();
  return getDb()
    .prepare(
      `SELECT e.*, d.number as document_number, d.date as document_date
       FROM entry e
       INNER JOIN document d ON d.id = e.document_id
       WHERE d.period_id = ?
       ORDER BY d.number, e.row_number`,
    )
    .all(periodId) as (Entry & {
    document_number: number;
    document_date: number;
  })[];
}

export function getAllEntriesWithDetails(
  periodId: number,
): (EntryWithAccount & { document_number: number; document_date: number })[] {
  ensureDocumentPeriodsMatchDates();
  return getDb()
    .prepare(
      `SELECT e.*, a.number as account_number, a.name as account_name,
              d.number as document_number, d.date as document_date
       FROM entry e
       JOIN account a ON a.id = e.account_id
       JOIN document d ON d.id = e.document_id
       WHERE d.period_id = ?
       ORDER BY a.number, d.date, d.number, e.row_number`,
    )
    .all(periodId) as (EntryWithAccount & {
    document_number: number;
    document_date: number;
  })[];
}

export function getReportStructure(id: string): ReportStructure | undefined {
  return getDb()
    .prepare('SELECT * FROM report_structure WHERE id = ?')
    .get(id) as ReportStructure | undefined;
}

export function createDocument(periodId: number, date: number): Document {
  const resolvedPeriodId = getMatchingPeriodIdForDate(date) ?? periodId;
  const nextNumber = getNextDocumentNumber(resolvedPeriodId);

  const result = getDb()
    .prepare('INSERT INTO document (number, period_id, date) VALUES (?, ?, ?)')
    .run(nextNumber, resolvedPeriodId, date);

  return {
    id: result.lastInsertRowid as number,
    number: nextNumber,
    period_id: resolvedPeriodId,
    date,
  };
}

export function createEntry(
  documentId: number,
  accountId: number,
  debit: boolean,
  amount: number,
  description: string,
  rowNumber: number,
): Entry {
  const result = getDb()
    .prepare(
      'INSERT INTO entry (document_id, account_id, debit, amount, description, row_number, flags) VALUES (?, ?, ?, ?, ?, ?, 0)',
    )
    .run(documentId, accountId, debit ? 1 : 0, amount, description, rowNumber);

  return {
    id: result.lastInsertRowid as number,
    document_id: documentId,
    account_id: accountId,
    debit,
    amount,
    description,
    row_number: rowNumber,
    flags: 0,
  };
}

export function deleteEntry(id: number): void {
  getDb().prepare('DELETE FROM entry WHERE id = ?').run(id);
}

export function deleteDocument(id: number): void {
  getDb()
    .prepare('DELETE FROM document_metadata WHERE document_id = ?')
    .run(id);
  getDb()
    .prepare('DELETE FROM document_receipt_link WHERE document_id = ?')
    .run(id);
  getDb()
    .prepare(
      'UPDATE bank_statement_entry SET document_id = NULL WHERE document_id = ?',
    )
    .run(id);
  getDb().prepare('DELETE FROM entry WHERE document_id = ?').run(id);
  getDb().prepare('DELETE FROM document WHERE id = ?').run(id);
}

export function updateDocumentDate(id: number, date: number): void {
  const document = getDocumentRow(id);
  if (!document) {
    return;
  }

  const resolvedPeriodId =
    getMatchingPeriodIdForDate(date) ?? document.period_id;
  const nextNumber =
    resolvedPeriodId === document.period_id
      ? document.number
      : getNextDocumentNumber(resolvedPeriodId);

  getDb()
    .prepare(
      'UPDATE document SET date = ?, period_id = ?, number = ? WHERE id = ?',
    )
    .run(date, resolvedPeriodId, nextNumber, id);
}

export function updateEntryDescription(id: number, description: string): void {
  getDb()
    .prepare('UPDATE entry SET description = ? WHERE id = ?')
    .run(description, id);
}

export function updateEntryAccount(id: number, accountId: number): void {
  getDb()
    .prepare('UPDATE entry SET account_id = ? WHERE id = ?')
    .run(accountId, id);
}

export function updateEntryAmount(id: number, amount: number): void {
  getDb().prepare('UPDATE entry SET amount = ? WHERE id = ?').run(amount, id);
}
