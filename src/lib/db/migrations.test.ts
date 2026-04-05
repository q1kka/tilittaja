import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensureAppTables } from './migrations';

describe('ensureAppTables', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('creates all four application tables', () => {
    ensureAppTables(db);

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
      )
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    expect(names).toContain('bank_statement');
    expect(names).toContain('bank_statement_entry');
    expect(names).toContain('document_metadata');
    expect(names).toContain('document_receipt_link');
  });

  it('is idempotent — calling twice does not throw', () => {
    ensureAppTables(db);
    expect(() => ensureAppTables(db)).not.toThrow();
  });

  it('creates bank_statement with expected columns', () => {
    ensureAppTables(db);
    const info = db.pragma('table_info(bank_statement)') as { name: string }[];
    const cols = info.map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'account_id',
        'iban',
        'period_start',
        'period_end',
        'opening_balance',
        'closing_balance',
        'source_file',
        'created_at',
      ]),
    );
  });

  it('creates bank_statement_entry with expected columns', () => {
    ensureAppTables(db);
    const info = db.pragma('table_info(bank_statement_entry)') as {
      name: string;
    }[];
    const cols = info.map((c) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id',
        'bank_statement_id',
        'entry_date',
        'value_date',
        'archive_id',
        'counterparty',
        'amount',
        'document_id',
      ]),
    );
  });
});
