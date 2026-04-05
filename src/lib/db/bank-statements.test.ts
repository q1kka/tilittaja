import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('./connection', () => ({
  getDb,
}));

vi.mock('./documents', () => ({
  createDocument: vi
    .fn()
    .mockImplementation((_periodId: number, _date: number) => ({
      id: Math.floor(Math.random() * 10000),
      number: 1,
      period_id: _periodId,
      date: _date,
    })),
  createEntry: vi.fn(),
}));

import {
  getBankStatements,
  getBankStatement,
  getBankStatementEntry,
  getBankStatementEntries,
  createBankStatement,
  createBankStatementEntry,
  ensureBankStatementTables,
  deleteBankStatement,
  mergeBankStatements,
  updateBankStatementEntry,
  createDocumentsFromBankStatementEntries,
  bankStatementArchiveIdExists,
  getDocumentBankStatementLinks,
  getUnlinkedBankStatementEntriesForPeriod,
} from './bank-statements';

function setupFullSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE account (
      id INTEGER PRIMARY KEY,
      number TEXT NOT NULL,
      name TEXT NOT NULL,
      type INTEGER NOT NULL DEFAULT 0,
      vat_code INTEGER NOT NULL DEFAULT 0,
      vat_percentage REAL DEFAULT NULL,
      vat_account1_id INTEGER DEFAULT NULL,
      vat_account2_id INTEGER DEFAULT NULL,
      flags INTEGER NOT NULL DEFAULT 0
    );
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
    CREATE TABLE entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      row_number INTEGER NOT NULL DEFAULT 1,
      flags INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE bank_statement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      iban TEXT NOT NULL,
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      closing_balance REAL NOT NULL DEFAULT 0,
      source_file TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE bank_statement_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_statement_id INTEGER NOT NULL REFERENCES bank_statement(id),
      entry_date INTEGER NOT NULL,
      value_date INTEGER NOT NULL,
      archive_id TEXT NOT NULL DEFAULT '',
      counterparty TEXT NOT NULL DEFAULT '',
      counterparty_iban TEXT,
      reference TEXT,
      message TEXT,
      payment_type TEXT NOT NULL DEFAULT '',
      transaction_number INTEGER NOT NULL DEFAULT 0,
      amount REAL NOT NULL,
      document_id INTEGER,
      counterpart_account_id INTEGER
    );
    INSERT INTO account (id, number, name, type) VALUES (1, '1910', 'Pankkitili', 0);
    INSERT INTO account (id, number, name, type) VALUES (2, '4000', 'Myyntitulot', 3);
    INSERT INTO account (id, number, name, type, vat_code, vat_percentage, vat_account1_id) VALUES (3, '7000', 'Kulut', 4, 1, 24, 4);
    INSERT INTO account (id, number, name, type) VALUES (4, '2939', 'ALV velka', 1);
  `);
}

describe('bank-statements', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    getDb.mockReturnValue(db);
    setupFullSchema(db);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe('ensureBankStatementTables', () => {
    it("creates tables if they don't exist (idempotent on existing schema)", () => {
      expect(() => ensureBankStatementTables()).not.toThrow();
    });
  });

  describe('createBankStatement', () => {
    it('creates a bank statement and returns it with id', () => {
      const result = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 1000,
        closing_balance: 2000,
        source_file: 'test.csv',
      });
      expect(result.id).toBeGreaterThan(0);
      expect(result.iban).toBe('FI1234');
      expect(result.opening_balance).toBe(1000);
    });
  });

  describe('createBankStatementEntry', () => {
    it('creates an entry linked to a statement', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: 'ARCH001',
        counterparty: 'Test Corp',
        counterparty_iban: null,
        reference: 'REF1',
        message: 'Payment',
        payment_type: 'transfer',
        transaction_number: 1,
        amount: 100.5,
        counterpart_account_id: 2,
      });
      expect(entry.id).toBeGreaterThan(0);
      expect(entry.amount).toBe(100.5);
      expect(entry.document_id).toBeNull();
    });
  });

  describe('getBankStatements', () => {
    it('returns all statements without filter', () => {
      createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 300,
        period_end: 400,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      expect(getBankStatements()).toHaveLength(2);
    });

    it('filters by period overlap', () => {
      createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 300,
        period_end: 400,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const result = getBankStatements({ periodStart: 150, periodEnd: 250 });
      expect(result).toHaveLength(1);
    });
  });

  describe('getBankStatement', () => {
    it('returns single statement with stats', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const result = getBankStatement(bs.id);
      expect(result).toBeDefined();
      expect(result!.id).toBe(bs.id);
    });

    it('returns undefined for non-existent id', () => {
      expect(getBankStatement(9999)).toBeUndefined();
    });
  });

  describe('getBankStatementEntry', () => {
    it('returns a single entry by id', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: null,
      });
      expect(getBankStatementEntry(entry.id)).toBeDefined();
      expect(getBankStatementEntry(9999)).toBeUndefined();
    });
  });

  describe('getBankStatementEntries', () => {
    it('returns entries for a statement with account details', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: 2,
      });
      const entries = getBankStatementEntries(bs.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].counterpart_account_number).toBe('4000');
    });
  });

  describe('deleteBankStatement', () => {
    it('deletes statement and its entries', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: null,
      });
      expect(deleteBankStatement(bs.id)).toBe(true);
      expect(getBankStatement(bs.id)).toBeUndefined();
    });

    it('returns false for non-existent statement', () => {
      expect(deleteBankStatement(9999)).toBe(false);
    });
  });

  describe('mergeBankStatements', () => {
    it('merges entries into master and deletes merged statements', () => {
      const bs1 = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 1000,
        closing_balance: 1500,
        source_file: '',
      });
      const bs2 = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 200,
        period_end: 300,
        opening_balance: 1500,
        closing_balance: 2000,
        source_file: '',
      });
      createBankStatementEntry({
        bank_statement_id: bs2.id,
        entry_date: 250,
        value_date: 250,
        archive_id: '',
        counterparty: 'Y',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 500,
        counterpart_account_id: null,
      });

      const result = mergeBankStatements({
        masterStatementId: bs1.id,
        mergedStatementIds: [bs2.id],
      });
      expect(result.mergedStatements).toHaveLength(1);
      expect(getBankStatement(bs2.id)).toBeUndefined();

      const entries = getBankStatementEntries(bs1.id);
      expect(entries).toHaveLength(1);
    });

    it('throws when merging empty list', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      expect(() =>
        mergeBankStatements({
          masterStatementId: bs.id,
          mergedStatementIds: [],
        }),
      ).toThrow('Valitse vähintään yksi');
    });

    it('throws when merging master into itself', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      expect(() =>
        mergeBankStatements({
          masterStatementId: bs.id,
          mergedStatementIds: [bs.id],
        }),
      ).toThrow('itseensä');
    });

    it('throws when accounts differ', () => {
      db.prepare(
        "INSERT INTO account (id, number, name, type) VALUES (10, '1920', 'Toinen tili', 0)",
      ).run();
      const bs1 = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const bs2 = createBankStatement({
        account_id: 10,
        iban: 'FI5678',
        period_start: 200,
        period_end: 300,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      expect(() =>
        mergeBankStatements({
          masterStatementId: bs1.id,
          mergedStatementIds: [bs2.id],
        }),
      ).toThrow('saman pankkitilin');
    });
  });

  describe('updateBankStatementEntry', () => {
    it('updates counterpart account', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: null,
      });
      updateBankStatementEntry(entry.id, { counterpart_account_id: 2 });
      const updated = getBankStatementEntry(entry.id);
      expect(updated!.counterpart_account_id).toBe(2);
    });

    it('updates document_id', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: null,
      });
      db.prepare(
        'INSERT INTO document (id, number, period_id, date) VALUES (100, 1, 1, 150)',
      ).run();
      updateBankStatementEntry(entry.id, { document_id: 100 });
      const updated = getBankStatementEntry(entry.id);
      expect(updated!.document_id).toBe(100);
    });
  });

  describe('createDocumentsFromBankStatementEntries', () => {
    it('skips entries without counterpart account', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 100,
        counterpart_account_id: null,
      });
      const result = createDocumentsFromBankStatementEntries([entry.id], 1, 1);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it('creates document for positive amount entry', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'Asiakas',
        counterparty_iban: null,
        reference: null,
        message: 'Maksu',
        payment_type: '',
        transaction_number: 1,
        amount: 100,
        counterpart_account_id: 2,
      });
      const result = createDocumentsFromBankStatementEntries([entry.id], 1, 1);
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('creates document with VAT split for negative amount with VAT account', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'Toimittaja',
        counterparty_iban: null,
        reference: null,
        message: 'Ostos',
        payment_type: '',
        transaction_number: 1,
        amount: -124,
        counterpart_account_id: 3,
      });
      const result = createDocumentsFromBankStatementEntries([entry.id], 1, 1);
      expect(result.created).toBe(1);
    });
  });

  describe('bankStatementArchiveIdExists', () => {
    it('returns false for non-existent archive id', () => {
      expect(bankStatementArchiveIdExists('NONEXISTENT')).toBe(false);
    });

    it('returns true when archive id exists', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: 'ARCH001',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: null,
      });
      expect(bankStatementArchiveIdExists('ARCH001')).toBe(true);
    });
  });

  describe('getDocumentBankStatementLinks', () => {
    it('returns empty map for empty input', () => {
      expect(getDocumentBankStatementLinks([]).size).toBe(0);
    });

    it('returns links for document IDs with linked entries', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      db.prepare(
        'INSERT INTO document (id, number, period_id, date) VALUES (50, 1, 1, 150)',
      ).run();
      const entry = createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'X',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: null,
      });
      db.prepare(
        'UPDATE bank_statement_entry SET document_id = 50 WHERE id = ?',
      ).run(entry.id);

      const links = getDocumentBankStatementLinks([50]);
      expect(links.size).toBe(1);
      expect(links.get(50)).toHaveLength(1);
    });
  });

  describe('getUnlinkedBankStatementEntriesForPeriod', () => {
    it('returns entries without document links in period range', () => {
      const bs = createBankStatement({
        account_id: 1,
        iban: 'FI1234',
        period_start: 100,
        period_end: 200,
        opening_balance: 0,
        closing_balance: 0,
        source_file: '',
      });
      createBankStatementEntry({
        bank_statement_id: bs.id,
        entry_date: 150,
        value_date: 150,
        archive_id: '',
        counterparty: 'Unlinked',
        counterparty_iban: null,
        reference: null,
        message: null,
        payment_type: '',
        transaction_number: 1,
        amount: 50,
        counterpart_account_id: null,
      });
      const results = getUnlinkedBankStatementEntriesForPeriod(100, 200);
      expect(results).toHaveLength(1);
      expect(results[0].counterparty).toBe('Unlinked');
    });
  });
});
