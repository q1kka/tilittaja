# Tilittaja

A modern Finnish bookkeeping (kirjanpito) web application built with Next.js. Tilittaja provides double-entry accounting with support for voucher management, bank statement imports, VAT reporting, financial statements, and PDF generation — all backed by a lightweight SQLite database per company.

Tilittaja is a modern rewrite of the original [Tilitin](https://helineva.net/tilitin/) by Tommi Helineva and is fully compatible with its `.sqlite` database files.

## Features

- **Double-entry bookkeeping** — create vouchers (tositteet) with balanced debit/credit entries
- **Chart of accounts** — Finnish chart of accounts with full CRUD, cloning, and type classification
- **Fiscal periods** — manage and lock accounting periods to prevent edits
- **Bank statements** — import, review, and automatically generate bookkeeping documents from statement lines
- **VAT reporting** — calculate and post value-added tax settlements
- **Financial reports** — balance sheet (tase), income statement (tuloslaskelma), general ledger (pääkirja), journal (päiväkirja)
- **Financial statements** — generate tilinpäätös documents with readiness tracking and PDF export
- **Receipt management** — link PDF receipts to vouchers with automatic file matching
- **PDF generation** — server-side PDF creation for reports, financial statements, and meeting documents
- **ZIP exports** — full archive exports including receipts, bank statements, and reports
- **Multi-company** — manage multiple companies, each with its own SQLite database
- **State transfer** — export/import complete company data as ZIP archives for backup and migration
- **Setup wizard** — guided setup for creating new databases, linking existing ones, or importing archives

## Tech Stack

| Layer      | Technology                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Framework  | [Next.js](https://nextjs.org/) 16 (App Router)                                                                         |
| UI         | [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) 4                                             |
| Icons      | [Lucide React](https://lucide.dev/)                                                                                    |
| Database   | [SQLite](https://sqlite.org/) via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)                         |
| Validation | [Zod](https://zod.dev/)                                                                                                |
| PDF        | [PDFKit](http://pdfkit.org/)                                                                                           |
| Archives   | [JSZip](https://stuk.github.io/jszip/)                                                                                 |
| Testing    | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/), [Playwright](https://playwright.dev/) |
| Linting    | [ESLint](https://eslint.org/) 9 with Next.js config, [Prettier](https://prettier.io/)                                  |
| Language   | [TypeScript](https://www.typescriptlang.org/) 5                                                                        |

## Prerequisites

- **Node.js** 20 or later
- **Yarn** (the project uses `yarn.lock`)
- A C/C++ toolchain for compiling `better-sqlite3` native bindings (Xcode Command Line Tools on macOS, `build-essential` on Debian/Ubuntu)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/q1kka/tilitin-next.git
cd tilitin-next
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` if needed — see [Configuration](#configuration) for details. The defaults work for most local setups.

### 4. Start the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch with no existing data, the setup wizard will guide you through creating or linking a database.

## Configuration

Environment variables (all optional):

| Variable           | Description                                                                                                              | Default                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `DATABASE_PATH`    | Absolute or project-relative path to a specific SQLite database file. Overrides the default multi-datasource resolution. | _(not set — uses `../data/` directory)_ |
| `RECEIPT_PDF_ROOT` | Absolute or project-relative path to the root directory for receipt PDFs.                                                | `../data/<datasource>/pdf`              |

### Data Directory Layout

By default, Tilittaja looks for company data in a `data/` directory **one level above** the project root:

```
parent/
├── data/
│   ├── my-company/
│   │   ├── kirjanpito.sqlite      # Company database
│   │   └── pdf/
│   │       ├── tositteet/
│   │       │   └── 2024-2025/
│   │       │       ├── MU1.pdf    # Receipt for voucher #1
│   │       │       ├── MU2.pdf
│   │       │       └── ...
│   │       ├── tiliotteet/
│   │       │   └── 01-2025.pdf    # Bank statement PDFs
│   │       └── myyntilaskut/
│   │           └── ML1.pdf        # Sales invoices
│   └── another-company/
│       ├── bookkeeping.sqlite
│       └── pdf/
│           └── ...
└── tilittaja/                      # This project
    ├── src/
    ├── package.json
    └── ...
```

Each company (datasource) gets its own subdirectory. The active company is selected via the UI and tracked with an `httpOnly` cookie.

## Scripts

| Command              | Description                           |
| -------------------- | ------------------------------------- |
| `yarn seed:demo`     | Create a realistic demo datasource    |
| `yarn seed:e2e`      | Rebuild the Playwright fixture source |
| `yarn dev`           | Start development server with Webpack |
| `yarn build`         | Create production build               |
| `yarn start`         | Start production server               |
| `yarn lint`          | Run ESLint                            |
| `yarn format`        | Format code with Prettier             |
| `yarn format:check`  | Check formatting (CI-friendly)        |
| `yarn test`          | Run unit tests (Vitest)               |
| `yarn test:coverage` | Run unit tests with coverage report   |
| `yarn test:e2e`      | Run end-to-end tests (Playwright)     |

### Realistic Demo Fixtures

Run:

```bash
yarn seed:demo
```

This creates a full example company under `../data/demo-realistic/` with:

- two fiscal periods
- balanced vouchers with metadata and linked receipt PDFs
- bank statements with both linked and unlinked transactions
- tilinpäätös metadata and supporting PDF files

You can override the target slug and company details when needed:

```bash
FIXTURE_SOURCE_SLUG=my-demo FIXTURE_COMPANY_NAME="Oma Demo Oy" yarn seed:demo
```

## Database

### Schema

Tilittaja uses one SQLite file per company. The schema has two layers:

**Legacy tables** (compatible with the original Java Tilitin):

- `settings` — company name, business ID, active period
- `period` — fiscal periods with start/end dates and lock status
- `document` — voucher headers (number, date, period)
- `entry` — voucher line items (account, debit/credit, amount, description)
- `account` — chart of accounts (number, name, type, VAT configuration)
- `coa_heading` — chart of accounts section headings
- `report_structure` — report layout definitions
- `document_type` — voucher numbering ranges

**Application-managed tables** (created automatically on first access):

- `bank_statement` / `bank_statement_entry` — imported bank statement data
- `document_metadata` — voucher categories and names
- `document_receipt_link` — links between vouchers and PDF receipt files
- `app_schema_version` — migration version tracking

The full schema is documented in [`src/lib/db/schema.sql`](src/lib/db/schema.sql). Migrations are applied incrementally via [`src/lib/db/migrations.ts`](src/lib/db/migrations.ts).

### Account Types

| Code | Finnish                | English             |
| ---- | ---------------------- | ------------------- |
| 0    | Vastaavaa              | Assets              |
| 1    | Vastattavaa            | Liabilities         |
| 2    | Oma pääoma             | Equity              |
| 3    | Tulot                  | Revenue             |
| 4    | Menot                  | Expenses            |
| 5    | Ed. tilikausien voitto | Prior year profit   |
| 6    | Tilikauden voitto      | Current year profit |

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout, DB init, AppShell
│   ├── page.tsx                # Redirects to /documents
│   ├── documents/              # Voucher management
│   ├── accounts/               # Chart of accounts
│   ├── accounts-entries/       # Account entries view
│   ├── bank-statements/        # Bank statement management
│   ├── vat/                    # VAT reporting
│   ├── reports/                # Financial reports
│   │   ├── balance-sheet/
│   │   ├── income-statement/
│   │   ├── general-ledger/
│   │   ├── journal/
│   │   └── tilinpaatos/        # Financial statements
│   ├── settings/               # Company settings & export/import
│   └── api/                    # API route handlers
│       ├── accounts/
│       ├── bank-statements/
│       ├── datasources/
│       ├── documents/
│       ├── entries/
│       ├── periods/
│       ├── receipts/
│       ├── reports/
│       ├── settings/
│       ├── setup/
│       ├── state-transfer/
│       └── vat/
├── actions/                    # Server actions
├── components/                 # React components
│   ├── AppShell.tsx            # Main app layout with sidebar
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── SetupWizard.tsx         # First-run setup flow
│   └── ...                     # Feature-specific components
├── hooks/                      # Custom React hooks
│   ├── useDocumentEditing.ts
│   ├── useAccountPicker.ts
│   ├── useColumnResize.ts
│   └── ...
└── lib/                        # Core business logic
    ├── db/
    │   ├── connection.ts       # SQLite connection management
    │   ├── schema.sql          # Database schema reference
    │   ├── migrations.ts       # App-managed table migrations
    │   ├── bootstrap.ts        # New database creation
    │   ├── accounts.ts         # Account queries
    │   ├── documents.ts        # Document/voucher queries
    │   ├── bank-statements.ts  # Bank statement queries
    │   └── ...
    ├── accounting.ts           # Balance calculations, report parsing
    ├── types.ts                # TypeScript type definitions
    ├── vat-report.ts           # VAT calculation logic
    ├── tilinpaatos.ts          # Financial statement logic
    ├── validation.ts           # Zod schemas
    ├── env.ts                  # Environment variable parsing
    ├── pdf/                    # PDF generation modules
    └── api-helpers.ts          # API route utilities
```

## API Reference

See [docs/API.md](docs/API.md) for the full API reference.

## Testing

### Unit Tests

```bash
yarn test
```

Unit tests use Vitest with Testing Library for component tests. Coverage thresholds are enforced for core business logic under `src/lib`:

- Lines/statements: 70%
- Functions: 65%
- Branches: 60%

Run with coverage report:

```bash
yarn test:coverage
```

### End-to-End Tests

```bash
yarn test:e2e
```

E2E tests use Playwright with Chromium. The test suite covers navigation, document management, reports, settings, and sidebar functionality, including end-to-end document creation and deletion workflows.

To run E2E tests against a custom URL:

```bash
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000 yarn test:e2e
```


## Compatibility

Tilittaja databases are fully compatible with the original [Tilitin Java application](https://helineva.net/tilitin/). You can:

- Open existing Tilitin `.sqlite` files directly
- Switch between the original Tilitin and Tilittaja on the same database
- Application-managed tables (bank statements, metadata, receipt links) are added transparently and do not affect Java Tilitin compatibility

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute.

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

The original [Tilitin](https://helineva.net/tilitin/) by Tommi Helineva is also licensed under GPL v3. This project is a derivative work and maintains the same license.
