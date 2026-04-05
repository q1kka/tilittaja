import type Database from 'better-sqlite3';

/**
 * Each migration is a function that receives the database and applies
 * schema changes. Migrations are applied in order, one version at a time.
 * Add new migrations at the end of the array — never modify existing ones.
 */
const migrations: ((db: Database.Database) => void)[] = [
  // Migration 1: app-managed tables for bank statements, document metadata, and receipt links
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS bank_statement (
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

      CREATE TABLE IF NOT EXISTS bank_statement_entry (
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

      CREATE TABLE IF NOT EXISTS document_metadata (
        document_id INTEGER PRIMARY KEY REFERENCES document(id) ON DELETE CASCADE,
        category TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS document_receipt_link (
        document_id INTEGER PRIMARY KEY REFERENCES document(id) ON DELETE CASCADE,
        pdf_path TEXT NOT NULL,
        linked_at INTEGER NOT NULL
      );
    `);
  },
];

const APP_SCHEMA_VERSION = migrations.length;

const APP_SCHEMA_VERSION_SQL = `
  CREATE TABLE IF NOT EXISTS app_schema_version (
    version INTEGER NOT NULL
  );
`;

function getAppSchemaVersion(db: Database.Database): number {
  db.exec(APP_SCHEMA_VERSION_SQL);

  const row = db
    .prepare(
      'SELECT version FROM app_schema_version ORDER BY version DESC LIMIT 1',
    )
    .get() as { version: number } | undefined;

  return row?.version ?? 0;
}

function setAppSchemaVersion(db: Database.Database, version: number): void {
  const updateVersion = db.transaction((nextVersion: number) => {
    db.prepare('DELETE FROM app_schema_version').run();
    db.prepare('INSERT INTO app_schema_version (version) VALUES (?)').run(
      nextVersion,
    );
  });

  updateVersion(version);
}

/**
 * Ensures all application-managed tables exist and applies incremental
 * app-owned schema migrations. Legacy tables (settings, period, document,
 * entry, account, coa_heading, report_structure, document_type) are still
 * created by the original Java Tilitin application or the bootstrap flow.
 *
 * To add a new migration, append a function to the `migrations` array.
 * Never modify existing migrations — always add a new one.
 */
export function ensureAppTables(db: Database.Database): void {
  let currentVersion = getAppSchemaVersion(db);

  while (currentVersion < APP_SCHEMA_VERSION) {
    const nextVersion = currentVersion + 1;
    const migrate = migrations[nextVersion - 1];
    if (!migrate) {
      throw new Error(`Tuntematon sovelluksen skeemaversio ${nextVersion}`);
    }
    migrate(db);
    setAppSchemaVersion(db, nextVersion);
    currentVersion = nextVersion;
  }
}
