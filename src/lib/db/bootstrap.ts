import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ensureAppTables } from './migrations';

function getDataDir(): string {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    '..',
    'data',
  );
}

interface BootstrapOptions {
  companyName: string;
  businessId?: string;
  periodStartDate: number;
  periodEndDate: number;
}

/**
 * Creates a brand-new Tilittaja SQLite database with all required legacy tables,
 * a default Finnish chart of accounts, report structures, and a first period.
 * Returns the slug (directory name) under DATA_DIR.
 */
export function createNewDatabase(
  slug: string,
  options: BootstrapOptions,
): string {
  const dataDir = getDataDir();
  const dirPath = path.join(dataDir, slug);
  fs.mkdirSync(dirPath, { recursive: true });

  const dbPath = path.join(dirPath, `${slug}.sqlite`);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE settings (
      version INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      business_id TEXT NOT NULL DEFAULT '',
      current_period_id INTEGER NOT NULL,
      document_type_id INTEGER,
      properties TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE period (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      locked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE document (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      period_id INTEGER NOT NULL REFERENCES period(id),
      date INTEGER NOT NULL
    );

    CREATE TABLE entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES document(id),
      account_id INTEGER NOT NULL REFERENCES account(id),
      debit INTEGER NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      row_number INTEGER NOT NULL,
      flags INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      type INTEGER NOT NULL,
      vat_code INTEGER NOT NULL DEFAULT 0,
      vat_percentage INTEGER NOT NULL DEFAULT 0,
      vat_account1_id INTEGER,
      vat_account2_id INTEGER,
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

    CREATE TABLE document_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      number_start INTEGER NOT NULL DEFAULT 0,
      number_end INTEGER NOT NULL DEFAULT 0
    );
  `);

  ensureAppTables(db);

  const periodResult = db
    .prepare(
      'INSERT INTO period (start_date, end_date, locked) VALUES (?, ?, 0)',
    )
    .run(options.periodStartDate, options.periodEndDate);
  const periodId = periodResult.lastInsertRowid as number;

  db.prepare(
    "INSERT INTO settings (version, name, business_id, current_period_id, document_type_id, properties) VALUES (?, ?, ?, ?, NULL, '')",
  ).run(6, options.companyName, options.businessId || '', periodId);

  seedAccounts(db);
  seedCOAHeadings(db);
  seedReportStructures(db);

  db.close();
  return slug;
}

/**
 * Validates that an external SQLite file has the expected Tilittaja schema.
 * Copies it into DATA_DIR so the app can manage it uniformly.
 */
export function linkExternalDatabase(
  externalPath: string,
  slug: string,
): string {
  if (!fs.existsSync(externalPath)) {
    throw new Error('Tiedostoa ei löydy: ' + externalPath);
  }

  const db = new Database(externalPath, { readonly: true });
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];
    const tableNames = new Set(tables.map((t) => t.name));
    const required = ['settings', 'period', 'account', 'entry', 'document'];
    const missing = required.filter((t) => !tableNames.has(t));
    if (missing.length > 0) {
      throw new Error('Tietokannasta puuttuu taulut: ' + missing.join(', '));
    }

    const requiredColumns: Record<string, string[]> = {
      period: ['start_date', 'end_date', 'locked'],
      account: ['number', 'name', 'type'],
      document: ['number', 'period_id', 'date'],
      entry: ['document_id', 'account_id', 'debit', 'amount', 'row_number'],
    };
    for (const [table, columns] of Object.entries(requiredColumns)) {
      const info = db.prepare(`PRAGMA table_info(${table})`).all() as {
        name: string;
      }[];
      const colNames = new Set(info.map((c) => c.name));
      const missingCols = columns.filter((c) => !colNames.has(c));
      if (missingCols.length > 0) {
        throw new Error(
          `Taulusta '${table}' puuttuu sarakkeet: ${missingCols.join(', ')}`,
        );
      }
    }
  } finally {
    db.close();
  }

  const dirPath = path.join(getDataDir(), slug);
  fs.mkdirSync(dirPath, { recursive: true });
  const destPath = path.join(dirPath, `${slug}.sqlite`);
  fs.copyFileSync(externalPath, destPath);

  const destDb = new Database(destPath);
  destDb.pragma('journal_mode = WAL');
  ensureAppTables(destDb);
  destDb.close();

  return slug;
}

// Account types: 0=Vastaavaa, 1=Vastattavaa, 2=Oma pääoma, 3=Tulot, 4=Menot, 5=Ed.tk voitto, 6=Tk voitto
type AccountSeed = [string, string, number];

const DEFAULT_ACCOUNTS: AccountSeed[] = [
  // Vastaavaa (Assets)
  ['1000', 'Perustamismenot', 0],
  ['1010', 'Kehittämismenot', 0],
  ['1060', 'Aineettomat oikeudet', 0],
  ['1100', 'Maa- ja vesialueet', 0],
  ['1120', 'Rakennukset ja rakennelmat', 0],
  ['1150', 'Koneet ja kalusto', 0],
  ['1170', 'Muut aineelliset hyödykkeet', 0],
  ['1300', 'Osuudet saman konsernin yrityksissä', 0],
  ['1500', 'Myyntisaamiset', 0],
  ['1510', 'Saamiset saman konsernin yrityksiltä', 0],
  ['1530', 'Lainasaamiset', 0],
  ['1560', 'Muut saamiset', 0],
  ['1700', 'Siirtosaamiset', 0],
  ['1800', 'Rahoitusarvopaperit', 0],
  ['1900', 'Pankkitili', 0],
  ['1910', 'Kassa', 0],
  // Oma pääoma (Equity)
  ['2000', 'Osake-, osuus- tai muu vastaava pääoma', 2],
  ['2010', 'Ylikurssirahasto', 2],
  ['2020', 'Arvonkorotusrahasto', 2],
  ['2050', 'Muut rahastot', 2],
  ['2100', 'SVOP-rahasto', 2],
  ['2250', 'Edellisten tilikausien voitto (tappio)', 5],
  ['2370', 'Tilikauden voitto (tappio)', 6],
  // Vastattavaa / Vieras pääoma (Liabilities)
  ['2400', 'Pääomalainat', 1],
  ['2460', 'Lainat rahoituslaitoksilta', 1],
  ['2580', 'Saadut ennakot', 1],
  ['2620', 'Ostovelat', 1],
  ['2740', 'Muut velat', 1],
  ['2870', 'Siirtovelat', 1],
  ['2939', 'Arvonlisäverovelka', 1],
  // Tulot (Revenue)
  ['3000', 'Myynti', 3],
  ['3010', 'Myynti 25,5 %', 3],
  ['3020', 'Myynti 14 %', 3],
  ['3030', 'Myynti 10 %', 3],
  ['3040', 'Myynti 0 %', 3],
  ['3500', 'Liiketoiminnan muut tuotot', 3],
  // Menot (Expenses)
  ['4000', 'Ostot', 4],
  ['4010', 'Ostot 25,5 %', 4],
  ['4020', 'Ostot 14 %', 4],
  ['4030', 'Ostot 10 %', 4],
  ['4040', 'Ostot 0 %', 4],
  ['4200', 'Varastojen muutos', 4],
  ['5000', 'Ulkopuoliset palvelut', 4],
  ['6000', 'Palkat ja palkkiot', 4],
  ['6100', 'Eläkekulut', 4],
  ['6140', 'Muut henkilösivukulut', 4],
  ['6300', 'Poistot', 4],
  ['7000', 'Toimitilakulut', 4],
  ['7100', 'Ajoneuvokulut', 4],
  ['7200', 'Matkakulut', 4],
  ['7300', 'Edustuskulut', 4],
  ['7400', 'Myynti- ja markkinointikulut', 4],
  ['7500', 'Hallintokulut', 4],
  ['7600', 'Tietoliikennekulut', 4],
  ['7680', 'Pankki- ja rahoituskulut', 4],
  ['7700', 'Muut liikekulut', 4],
  ['8000', 'Rahoitustuotot', 3],
  ['8500', 'Rahoituskulut', 4],
  ['9000', 'Satunnaiset tuotot', 3],
  ['9100', 'Satunnaiset kulut', 4],
  ['9500', 'Tuloverot', 4],
];

function seedAccounts(db: Database.Database): void {
  const stmt = db.prepare(
    'INSERT INTO account (number, name, type, vat_code, vat_percentage, vat_account1_id, vat_account2_id, flags) VALUES (?, ?, ?, 0, 0, NULL, NULL, 0)',
  );
  const tx = db.transaction((accounts: AccountSeed[]) => {
    for (const [number, name, type] of accounts) {
      stmt.run(number, name, type);
    }
  });
  tx(DEFAULT_ACCOUNTS);
}

type HeadingSeed = [string, string, number];

const DEFAULT_COA_HEADINGS: HeadingSeed[] = [
  ['1000', 'VASTAAVAA', 0],
  ['1000', 'Pysyvät vastaavat', 1],
  ['1000', 'Aineettomat hyödykkeet', 2],
  ['1100', 'Aineelliset hyödykkeet', 2],
  ['1300', 'Sijoitukset', 2],
  ['1500', 'Vaihtuvat vastaavat', 1],
  ['1500', 'Saamiset', 2],
  ['1800', 'Rahoitusarvopaperit', 2],
  ['1900', 'Rahat ja pankkisaamiset', 2],
  ['2000', 'VASTATTAVAA', 0],
  ['2000', 'Oma pääoma', 1],
  ['2400', 'Vieras pääoma', 1],
  ['2400', 'Pitkäaikainen vieras pääoma', 2],
  ['2580', 'Lyhytaikainen vieras pääoma', 2],
  ['3000', 'TULOSLASKELMA', 0],
  ['3000', 'Liikevaihto', 1],
  ['3500', 'Liiketoiminnan muut tuotot', 1],
  ['4000', 'Materiaalit ja palvelut', 1],
  ['6000', 'Henkilöstökulut', 1],
  ['6300', 'Poistot ja arvonalentumiset', 1],
  ['7000', 'Liiketoiminnan muut kulut', 1],
  ['8000', 'Rahoitustuotot ja -kulut', 1],
  ['9000', 'Satunnaiset erät', 1],
  ['9500', 'Tilinpäätössiirrot ja verot', 1],
];

function seedCOAHeadings(db: Database.Database): void {
  const stmt = db.prepare(
    'INSERT INTO coa_heading (number, text, level) VALUES (?, ?, ?)',
  );
  const tx = db.transaction((headings: HeadingSeed[]) => {
    for (const [number, text, level] of headings) {
      stmt.run(number, text, level);
    }
  });
  tx(DEFAULT_COA_HEADINGS);
}

const INCOME_STATEMENT_STRUCTURE = `HP;TULOSLASKELMA
SP0;3000;3050;Liikevaihto
SP0;3500;3999;Liiketoiminnan muut tuotot
-
SP0;4000;4050;Materiaalit ja palvelut
SP0;4200;4200;Varastojen muutos
SP0;5000;5999;Ulkopuoliset palvelut
-
SP0;6000;6099;Palkat ja palkkiot
SP0;6100;6299;Henkilösivukulut
SP0;6300;6399;Poistot ja arvonalentumiset
SP0;7000;7999;Liiketoiminnan muut kulut
-
SB0;3000;7999;LIIKEVOITTO (-TAPPIO)
-
SP0;8000;8499;Rahoitustuotot
SP0;8500;8999;Rahoituskulut
-
SB0;3000;8999;VOITTO (TAPPIO) ENNEN SATUNNAISIA ERIÄ
-
SP0;9000;9099;Satunnaiset tuotot
SP0;9100;9199;Satunnaiset kulut
SP0;9500;9999;Tuloverot
-
SB0;3000;9999;TILIKAUDEN VOITTO (TAPPIO)`;

const BALANCE_SHEET_STRUCTURE = `HP;TASE
HB;Vastaavaa
HP1;PYSYVÄT VASTAAVAT
HP2;Aineettomat hyödykkeet
SP0;1000;1099;Aineettomat hyödykkeet
HP2;Aineelliset hyödykkeet
SP0;1100;1299;Aineelliset hyödykkeet
HP2;Sijoitukset
SP0;1300;1499;Sijoitukset
SB1;1000;1499;Pysyvät vastaavat yhteensä
-
HP1;VAIHTUVAT VASTAAVAT
HP2;Saamiset
SP0;1500;1699;Saamiset
HP2;Siirtosaamiset
SP0;1700;1799;Siirtosaamiset
HP2;Rahoitusarvopaperit
SP0;1800;1899;Rahoitusarvopaperit
HP2;Rahat ja pankkisaamiset
SP0;1900;1999;Rahat ja pankkisaamiset
SB1;1500;1999;Vaihtuvat vastaavat yhteensä
-
SB0;1000;1999;Vastaavaa yhteensä
-
HB;Vastattavaa
HP1;OMA PÄÄOMA
SP0;2000;2099;Osake-, osuus- tai muu vastaava pääoma
SP0;2010;2049;Ylikurssirahasto
SP0;2050;2099;Muut rahastot
SP0;2100;2199;SVOP-rahasto
SP0;2250;2369;Edellisten tilikausien voitto (tappio)
SP0;2370;2399;Tilikauden voitto (tappio)
SB1;2000;2399;Oma pääoma yhteensä
-
HP1;VIERAS PÄÄOMA
HP2;Pitkäaikainen vieras pääoma
SP0;2400;2579;Pitkäaikainen vieras pääoma
HP2;Lyhytaikainen vieras pääoma
SP0;2580;2999;Lyhytaikainen vieras pääoma
SB1;2400;2999;Vieras pääoma yhteensä
-
SB0;2000;2999;Vastattavaa yhteensä`;

function seedReportStructures(db: Database.Database): void {
  const stmt = db.prepare(
    'INSERT INTO report_structure (id, data) VALUES (?, ?)',
  );
  stmt.run('income-statement-detailed', INCOME_STATEMENT_STRUCTURE);
  stmt.run('balance-sheet-detailed', BALANCE_SHEET_STRUCTURE);
}
