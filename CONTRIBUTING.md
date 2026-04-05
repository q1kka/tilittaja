# Contributing to Tilittaja

This guide will help you get started in contributing to Tilittaja!

## Development Setup

### Prerequisites

- Node.js 20+
- Yarn
- C/C++ toolchain for `better-sqlite3` native compilation

### Getting started

```bash
git clone https://github.com/q1kka/tilitin-next.git
cd tilitin-next
yarn install
cp .env.example .env.local
yarn dev
```

## Development Workflow

1. **Fork** the repository and create a branch from `main`
2. **Install dependencies** with `yarn install`
3. **Make your changes** with appropriate test coverage
4. **Run the checks** to ensure nothing is broken:
   ```bash
   yarn format:check
   yarn lint
   yarn test
   yarn test:e2e
   ```
5. **Submit a pull request** with a clear description of the change

## Code Style

- **TypeScript** — all source files use TypeScript with strict mode enabled
- **ESLint** — run `yarn lint` to check for issues
- **Prettier** — run `yarn format` to auto-format, or `yarn format:check` to verify. Configuration lives in `.prettierrc.json`
- **Tailwind CSS 4** — use utility classes for styling; no separate CSS modules or styled-components

### Naming Conventions

- **Files**: kebab-case for all files (`bank-statements.ts`, `vat-report.ts`)
- **Components**: PascalCase (`DocumentEntriesEditor.tsx`, `SetupWizard.tsx`)
- **Functions/variables**: camelCase
- **Database columns**: snake_case
- **Types/interfaces**: PascalCase

### Code Comments

Do not add comments that just narrate what the code does. Comments should only explain non-obvious intent, trade-offs, or constraints that the code itself cannot convey.

## Architecture

### Key Principles

- **Server-first** — pages are React Server Components by default; use `"use client"` only when interactivity is needed
- **SQLite per company** — each company gets its own `.sqlite` file; no shared database
- **No ORM** — queries use `better-sqlite3` directly for performance and full SQLite control
- **Legacy compatibility** — core tables must remain compatible with the original Java Tilitin application
- **Finnish UI** — the interface is in Finnish; keep UI strings in Finnish

### Data Flow

1. **Pages** (RSC) call `initDb()` and query functions from `src/lib/db/`
2. **Mutations** go through either Server Actions (`src/actions/`) or API routes (`src/app/api/`)
3. **Client components** use custom hooks from `src/hooks/` for interactive behavior
4. **API routes** use the `withDb` helper from `src/lib/api-helpers.ts` for database access

### Database Changes

- Legacy tables (settings, period, document, entry, account, etc.) must not have their schema modified to maintain Java Tilitin compatibility
- New tables go through the migration system in `src/lib/db/migrations.ts`
- Increment `APP_SCHEMA_VERSION` and add a new `case` in `applyMigration()` for new migrations

## Testing

### Unit Tests (Vitest)

- Test files live next to the code they test (`*.test.ts`, `*.test.tsx`)
- Component tests use Testing Library
- Database tests create in-memory SQLite databases
- Coverage thresholds are enforced (lines: 70%, functions: 65%, branches: 60%)

```bash
yarn test              # Run all unit tests
yarn test:coverage     # Run with coverage report
```

### End-to-End Tests (Playwright)

- E2E specs live in `e2e/` directory
- Tests run against the dev server with Chromium

```bash
yarn test:e2e
```

## Pull Request Guidelines

- **One concern per PR** — keep pull requests focused on a single change
- **Descriptive title** — summarize what the PR does
- **Test coverage** — add or update tests for new functionality
- **No breaking changes** to the database schema without discussion
- **Screenshots** — include screenshots for UI changes

## Reporting Bugs

Open an issue with:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser and OS information
5. Relevant error messages or console output

## Feature Requests

Open an issue describing:

1. The problem you're trying to solve
2. Your proposed solution
3. Alternatives you've considered

## License

By contributing to Tilittaja, you agree that your contributions will be licensed under the [GNU General Public License v3.0](LICENSE), the same license as the project.

## Questions?

Open a discussion or issue if you have questions about the codebase or contributing process.
