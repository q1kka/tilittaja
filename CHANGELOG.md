# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-04-05

### Added

- Initial open-source release
- Double-entry bookkeeping with voucher (tosite) management
- Chart of accounts with Finnish account types and VAT configuration
- Fiscal period management with period locking
- Bank statement import and automatic voucher generation
- VAT reporting and settlement posting
- Financial reports: balance sheet, income statement, general ledger, journal
- Financial statements (tilinpäätös) with readiness tracking and PDF export
- Receipt PDF management with automatic file matching (MU-naming convention)
- Multi-company support via separate SQLite databases
- State transfer (export/import) for backup and migration
- Setup wizard for first-run configuration
- Server-side PDF generation for reports and meeting documents
- ZIP archive exports (full archive, receipts, bank statements, reports)
- Unit tests with Vitest and coverage thresholds
- End-to-end tests with Playwright
- Full compatibility with the original Tilitin Java application SQLite files
