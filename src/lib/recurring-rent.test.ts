import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('@/lib/db/connection', () => ({
  getDb,
}));

import {
  createRecurringRentDocuments,
  getRecurringRentPlan,
} from '@/lib/recurring-rent';

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
      bank_statement_id INTEGER NOT NULL DEFAULT 1,
      entry_date INTEGER NOT NULL,
      value_date INTEGER NOT NULL DEFAULT 0,
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

    INSERT INTO period (id, start_date, end_date, locked) VALUES
      (1, ${new Date(2024, 11, 31).getTime()}, ${new Date(2025, 11, 30).getTime()}, 0);

    INSERT INTO account (id, number, name, type) VALUES
      (1, '1560', 'Muut saamiset', 0),
      (2, '2620', 'Ostovelat', 1),
      (3, '7000', 'Toimitilakulut', 4),
      (4, '2740', 'Muut velat', 1);

    INSERT INTO document (id, number, period_id, date) VALUES
      (1, 1, 1, ${new Date(2025, 4, 1).getTime()}),
      (2, 2, 1, ${new Date(2025, 0, 7).getTime()}),
      (3, 3, 1, ${new Date(2025, 7, 2).getTime()}),
      (4, 4, 1, ${new Date(2025, 0, 10).getTime()}),
      (5, 5, 1, ${new Date(2025, 0, 7).getTime()});

    INSERT INTO document_metadata (document_id, category, name) VALUES
      (1, 'MU', 'Sini Pajukoski Roninmäentie 6 K A 6 vuokrasopimus'),
      (2, 'MU', 'Tero Jokiranta Roninmäentie 1 H A 18 vuokrasopimus'),
      (3, 'MU', 'Sini Pajukoski Roninmäentie 6 K A 6 vuokrasopimus'),
      (4, 'MU', 'Tavallinen suoritus'),
      (5, 'MU', 'Juho Kotanen Roninmäentie 6 L A 3 vuokrasopimus');

    INSERT INTO document_receipt_link (document_id, pdf_path, linked_at) VALUES
      (1, 'tositteet/2025-2025/MU-1.pdf', 1),
      (2, 'tositteet/2025-2025/MU-2.pdf', 1),
      (3, 'tositteet/2025-2025/MU-1.pdf', 1),
      (5, 'tositteet/imported/vuokrasopimus-juho-kotanen-1.10.24-31.7.25.pdf', 1);

    INSERT INTO entry (document_id, account_id, debit, amount, description, row_number, flags) VALUES
      (1, 3, 1, 550.00, 'Kuukausivuokra', 1, 0),
      (1, 2, 0, 550.00, 'Vuokra velaksi', 2, 0),
      (2, 1, 1, 250.00, 'Vuokravakuus', 1, 0),
      (2, 4, 0, 250.00, 'Vuokravakuus', 2, 0),
      (3, 3, 1, 550.00, 'Kuukausivuokra', 1, 0),
      (3, 2, 0, 550.00, 'Vuokra velaksi', 2, 0),
      (4, 3, 1, 999.00, 'Muu suoritus', 1, 0),
      (4, 2, 0, 999.00, 'Muu suoritus', 2, 0),
      (5, 3, 1, 550.00, 'Kuukausivuokra', 1, 0),
      (5, 2, 0, 550.00, 'Vuokra velaksi', 2, 0);

    INSERT INTO bank_statement_entry
      (entry_date, amount, counterparty, message, transaction_number, document_id)
    VALUES
      (${new Date(2025, 0, 2).getTime()}, 299.25, 'KELA/FPA', 'ASUMISTUKI', 1, 1),
      (${new Date(2025, 0, 16).getTime()}, 150.75, 'PAJUKOSKI SINI IRINA', 'VUOKRA', 2, 1),
      (${new Date(2025, 0, 7).getTime()}, 555.00, 'TERO JOKIRANTA', 'Roninmäentie 1, H A 18 vuokra', 3, 2),
      (${new Date(2025, 0, 7).getTime()}, 550.00, 'JUHO KOTANEN', 'VUOKRA', 4, 5),
      (${new Date(2025, 0, 9).getTime()}, 200.00, 'MUU MAKSUAJA', 'Ei vuokrasopimus', 5, 4);
  `);
}

describe('recurring-rent', () => {
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

  it('builds a plan from January-linked lease documents and skips existing months', () => {
    const plan = getRecurringRentPlan(1);

    expect(plan.templateYear).toBe(2025);
    expect(plan.templates).toHaveLength(3);

    const sini = plan.templates.find((template) =>
      template.name.startsWith('Sini Pajukoski'),
    );
    expect(sini).toBeTruthy();
    expect(sini?.januaryAmounts).toEqual([299.25, 150.75]);
    expect(sini?.missingMonths).toHaveLength(9);
    expect(sini?.missingMonths.some((month) => month.key === '2025-05')).toBe(
      false,
    );
    expect(sini?.missingMonths.some((month) => month.key === '2025-08')).toBe(
      false,
    );

    const juho = plan.templates.find((template) =>
      template.name.startsWith('Juho Kotanen'),
    );
    expect(juho?.missingMonths).toHaveLength(6);
    expect(juho?.missingMonths.every((month) => month.key <= '2025-07')).toBe(
      true,
    );

    const tero = plan.templates.find((template) =>
      template.name.startsWith('Tero Jokiranta'),
    );
    expect(tero?.missingMonths).toHaveLength(11);
    expect(plan.totalMissingDocuments).toBe(26);
  });

  it('creates missing recurring rent documents idempotently with copied receipt links', () => {
    const result = createRecurringRentDocuments(1);

    expect(result.templateCount).toBe(3);
    expect(result.createdCount).toBe(26);

    const copiedDocs = db
      .prepare(
        `SELECT d.id, d.number, d.date, dm.name, drl.pdf_path
         FROM document d
         JOIN document_metadata dm ON dm.document_id = d.id
         LEFT JOIN document_receipt_link drl ON drl.document_id = d.id
         WHERE dm.name = ?
         ORDER BY d.date ASC`,
      )
      .all('Tero Jokiranta Roninmäentie 1 H A 18 vuokrasopimus') as Array<{
      id: number;
      number: number;
      date: number;
      name: string;
      pdf_path: string | null;
    }>;

    expect(copiedDocs).toHaveLength(12);
    expect(copiedDocs[1].pdf_path).toBe('tositteet/2025-2025/MU-2.pdf');
    expect(new Date(copiedDocs[1].date).getMonth()).toBe(1);

    const copiedEntries = db
      .prepare(
        `SELECT account_id, debit, amount, description, row_number
         FROM entry
         WHERE document_id = ?
         ORDER BY row_number ASC`,
      )
      .all(copiedDocs[1].id);
    expect(copiedEntries).toHaveLength(2);
    expect(copiedEntries[0]).toMatchObject({
      account_id: 1,
      debit: 1,
      amount: 250,
      description: 'Vuokravakuus',
      row_number: 1,
    });

    const rerun = createRecurringRentDocuments(1);
    expect(rerun.createdCount).toBe(0);
  });
});
