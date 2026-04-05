import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('./connection', () => ({
  getDb,
}));

import {
  createDocument,
  createEntry,
  deleteDocument,
  deleteEntry,
  getAccount,
  getAccounts,
  getCOAHeadings,
  getDocument,
  getDocumentBalances,
  getDocuments,
  getEntriesForDocument,
  getEntriesForPeriod,
  getEntry,
  getPeriod,
  getPeriods,
  getReportStructure,
  getAllEntriesWithDetails,
  setPeriodLocked,
  updateDocumentDate,
  updateEntryAccount,
  updateEntryAmount,
  updateEntryDescription,
} from './documents';

function setupSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE period (
      id INTEGER PRIMARY KEY,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE document (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      period_id INTEGER NOT NULL,
      date INTEGER NOT NULL
    );
    CREATE TABLE account (
      id INTEGER PRIMARY KEY,
      number TEXT NOT NULL,
      name TEXT NOT NULL,
      type INTEGER NOT NULL,
      vat_code INTEGER NOT NULL DEFAULT 0,
      vat_percentage REAL NOT NULL DEFAULT 0,
      vat_account1_id INTEGER,
      vat_account2_id INTEGER,
      flags INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      row_number INTEGER NOT NULL,
      flags INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE coa_heading (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      level INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE report_structure (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE document_metadata (
      document_id INTEGER PRIMARY KEY,
      category TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE document_receipt_link (
      document_id INTEGER PRIMARY KEY,
      pdf_path TEXT NOT NULL,
      linked_at INTEGER NOT NULL
    );
    CREATE TABLE bank_statement_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_statement_id INTEGER NOT NULL,
      document_id INTEGER
    );

    INSERT INTO period (id, start_date, end_date, locked) VALUES
      (1, ${Date.UTC(2025, 0, 1)}, ${Date.UTC(2025, 11, 31)}, 0),
      (2, ${Date.UTC(2026, 0, 1)}, ${Date.UTC(2026, 11, 31)}, 0);

    INSERT INTO account (id, number, name, type) VALUES
      (1, '1910', 'Pankkitili', 0),
      (2, '3000', 'Myynti', 3),
      (3, '4000', 'Kulut', 4);

    INSERT INTO coa_heading (number, text, level) VALUES
      ('1000', 'Vastaavaa', 0),
      ('3000', 'Tulot', 0);

    INSERT INTO report_structure (id, data) VALUES
      ('income-statement-detailed', 'SP0;3000;4000;Liikevaihto');
  `);
}

describe('documents', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    getDb.mockReturnValue(db);
    setupSchema(db);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe('getPeriods / getPeriod', () => {
    it('returns all periods ordered by start_date DESC', () => {
      const periods = getPeriods();
      expect(periods).toHaveLength(2);
      expect(periods[0].id).toBe(2);
    });

    it('returns a single period by id', () => {
      expect(getPeriod(1)?.start_date).toBe(Date.UTC(2025, 0, 1));
      expect(getPeriod(999)).toBeUndefined();
    });
  });

  describe('setPeriodLocked', () => {
    it('locks and unlocks a period', () => {
      setPeriodLocked(1, true);
      expect(getPeriod(1)?.locked).toBe(1);
      setPeriodLocked(1, false);
      expect(getPeriod(1)?.locked).toBe(0);
    });
  });

  describe('getAccounts / getAccount', () => {
    it('returns all accounts ordered by number', () => {
      const accounts = getAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts[0].number).toBe('1910');
    });

    it('returns a single account by id', () => {
      expect(getAccount(1)?.name).toBe('Pankkitili');
      expect(getAccount(999)).toBeUndefined();
    });
  });

  describe('getCOAHeadings', () => {
    it('returns chart of accounts headings', () => {
      const headings = getCOAHeadings();
      expect(headings).toHaveLength(2);
    });
  });

  describe('getReportStructure', () => {
    it('returns report structure by id', () => {
      const rs = getReportStructure('income-statement-detailed');
      expect(rs?.data).toContain('Liikevaihto');
    });

    it('returns undefined for unknown id', () => {
      expect(getReportStructure('nonexistent')).toBeUndefined();
    });
  });

  describe('createDocument', () => {
    it('creates a document in the period matching its date', () => {
      const doc = createDocument(1, Date.UTC(2026, 0, 1));
      expect(doc.period_id).toBe(2);
      expect(doc.number).toBe(1);
    });

    it('falls back to provided periodId when no period matches', () => {
      const doc = createDocument(1, Date.UTC(2030, 0, 1));
      expect(doc.period_id).toBe(1);
    });
  });

  describe('createEntry / getEntry / getEntriesForDocument', () => {
    it('creates an entry and retrieves it', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      const e = createEntry(doc.id, 1, true, 100, 'Test entry', 1);
      expect(e.id).toBeGreaterThan(0);
      expect(e.debit).toBe(true);

      const retrieved = getEntry(e.id);
      expect(retrieved?.amount).toBe(100);
    });

    it('returns entries for a document with account details', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      createEntry(doc.id, 1, true, 100, 'Debit', 1);
      createEntry(doc.id, 2, false, 100, 'Credit', 2);

      const entries = getEntriesForDocument(doc.id);
      expect(entries).toHaveLength(2);
      expect(entries[0].account_number).toBe('1910');
    });
  });

  describe('deleteEntry / deleteDocument', () => {
    it('deletes an entry by id', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      const e = createEntry(doc.id, 1, true, 100, 'Test', 1);
      deleteEntry(e.id);
      expect(getEntry(e.id)).toBeUndefined();
    });

    it('deletes a document and its entries', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      createEntry(doc.id, 1, true, 100, 'Test', 1);
      deleteDocument(doc.id);
      expect(getDocument(doc.id)).toBeUndefined();
    });
  });

  describe('updateDocumentDate', () => {
    it('moves a document to the matching period when its date changes', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      updateDocumentDate(doc.id, Date.UTC(2026, 5, 1));
      const updated = getDocument(doc.id);
      expect(updated?.period_id).toBe(2);
    });

    it('keeps same period when date stays in range', () => {
      const doc = createDocument(1, Date.UTC(2025, 3, 1));
      updateDocumentDate(doc.id, Date.UTC(2025, 6, 1));
      const updated = getDocument(doc.id);
      expect(updated?.period_id).toBe(1);
    });

    it('does nothing for non-existent document', () => {
      expect(() =>
        updateDocumentDate(9999, Date.UTC(2025, 0, 1)),
      ).not.toThrow();
    });
  });

  describe('updateEntry functions', () => {
    it('updateEntryDescription', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      const e = createEntry(doc.id, 1, true, 100, 'Old', 1);
      updateEntryDescription(e.id, 'New');
      expect(getEntry(e.id)?.description).toBe('New');
    });

    it('updateEntryAccount', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      const e = createEntry(doc.id, 1, true, 100, 'Test', 1);
      updateEntryAccount(e.id, 2);
      expect(getEntry(e.id)?.account_id).toBe(2);
    });

    it('updateEntryAmount', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      const e = createEntry(doc.id, 1, true, 100, 'Test', 1);
      updateEntryAmount(e.id, 250.5);
      expect(getEntry(e.id)?.amount).toBe(250.5);
    });
  });

  describe('getDocumentBalances', () => {
    it('returns document balance summaries for a period', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      createEntry(doc.id, 1, true, 100, 'Debit', 1);
      createEntry(doc.id, 2, false, 100, 'Credit', 2);

      const balances = getDocumentBalances(1);
      expect(balances).toHaveLength(1);
      expect(balances[0].total_debit).toBe(100);
      expect(balances[0].total_credit).toBe(100);
    });
  });

  describe('getEntriesForPeriod', () => {
    it('returns entries with document details for a period', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      createEntry(doc.id, 1, true, 100, 'Test', 1);

      const entries = getEntriesForPeriod(1);
      expect(entries).toHaveLength(1);
      expect(entries[0].document_number).toBe(doc.number);
    });
  });

  describe('getAllEntriesWithDetails', () => {
    it('returns entries with account and document details', () => {
      const doc = createDocument(1, Date.UTC(2025, 5, 1));
      createEntry(doc.id, 1, true, 100, 'Test', 1);

      const entries = getAllEntriesWithDetails(1);
      expect(entries).toHaveLength(1);
      expect(entries[0].account_number).toBe('1910');
      expect(entries[0].document_number).toBe(doc.number);
    });
  });

  describe('document period alignment (reassignment)', () => {
    it('reassigns existing mismatched documents before period queries', () => {
      db.prepare(
        'INSERT INTO document (id, number, period_id, date) VALUES (20, 50, 1, ?)',
      ).run(Date.UTC(2026, 0, 1));
      db.prepare(
        "INSERT INTO entry (document_id, account_id, debit, amount, description, row_number, flags) VALUES (20, 1, 1, 28.83, 'Testi', 1, 0)",
      ).run();

      expect(getDocuments(1)).toEqual([]);

      const nextPeriodDocuments = getDocuments(2);
      expect(nextPeriodDocuments).toHaveLength(1);
      expect(nextPeriodDocuments[0]).toMatchObject({
        id: 20,
        period_id: 2,
        number: 1,
      });
    });
  });
});
