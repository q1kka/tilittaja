# API Reference

All API routes are under `/api/` and follow REST conventions. Mutations go through either API routes or Server Actions (`src/actions/`).

## Documents (Tositteet)

| Method | Endpoint                        | Description          |
| ------ | ------------------------------- | -------------------- |
| POST   | `/api/documents`                | Create a new voucher |
| PATCH  | `/api/documents/[id]`           | Update voucher       |
| DELETE | `/api/documents/[id]`           | Delete voucher       |
| PATCH  | `/api/documents/[id]/entries`   | Bulk update entries  |
| POST   | `/api/documents/[id]/duplicate` | Duplicate voucher    |
| POST   | `/api/documents/[id]/receipt`   | Link receipt PDF     |
| PATCH  | `/api/documents/[id]/receipt`   | Update receipt link  |
| DELETE | `/api/documents/[id]/receipt`   | Remove receipt link  |

## Accounts (Tilikartta)

| Method | Endpoint                   | Description    |
| ------ | -------------------------- | -------------- |
| POST   | `/api/accounts`            | Create account |
| PATCH  | `/api/accounts/[id]`       | Update account |
| DELETE | `/api/accounts/[id]`       | Delete account |
| POST   | `/api/accounts/[id]/clone` | Clone account  |

## Entries

| Method | Endpoint            | Description         |
| ------ | ------------------- | ------------------- |
| PATCH  | `/api/entries/[id]` | Update single entry |

## Bank Statements (Tiliotteet)

| Method | Endpoint                                     | Description                  |
| ------ | -------------------------------------------- | ---------------------------- |
| POST   | `/api/bank-statements`                       | Upload/create statement      |
| DELETE | `/api/bank-statements/[id]`                  | Delete statement             |
| PUT    | `/api/bank-statements/[id]/entries`          | Update statement entries     |
| POST   | `/api/bank-statements/[id]/create-documents` | Generate vouchers from lines |
| POST   | `/api/bank-statements/merge`                 | Merge statements             |
| GET    | `/api/bank-statements/pdf`                   | Download statement PDF       |

## Periods

| Method | Endpoint                 | Description   |
| ------ | ------------------------ | ------------- |
| POST   | `/api/periods/[id]/lock` | Lock period   |
| DELETE | `/api/periods/[id]/lock` | Unlock period |

## VAT

| Method | Endpoint              | Description         |
| ------ | --------------------- | ------------------- |
| POST   | `/api/vat/settlement` | Post VAT settlement |

## Reports & Exports

| Method | Endpoint                                   | Description               |
| ------ | ------------------------------------------ | ------------------------- |
| GET    | `/api/reports/tilinpaatos/pdf`             | Financial statements PDF  |
| GET    | `/api/reports/yhtiokokous/pdf`             | Shareholders' meeting PDF |
| GET    | `/api/reports/materials/pdf`               | Report materials PDF      |
| GET    | `/api/reports/materials/zip`               | Report materials ZIP      |
| GET    | `/api/reports/full-archive/zip`            | Full archive export       |
| GET    | `/api/reports/receipts-archive/zip`        | Receipts archive          |
| GET    | `/api/reports/pdf-archive/zip`             | PDF archive               |
| GET    | `/api/reports/bank-statements-archive/zip` | Bank statements archive   |

## Settings & System

| Method   | Endpoint                     | Description                        |
| -------- | ---------------------------- | ---------------------------------- |
| POST     | `/api/setup`                 | Initial setup (create/link/import) |
| GET      | `/api/datasources`           | List datasources                   |
| POST     | `/api/datasources`           | Switch datasource                  |
| POST     | `/api/settings/company`      | Update company info                |
| GET/POST | `/api/settings/tilinpaatos`  | Financial statement metadata       |
| GET      | `/api/state-transfer/export` | Export full state ZIP              |
| POST     | `/api/state-transfer/import` | Import state ZIP                   |
| GET      | `/api/receipts/pdf`          | Get receipt PDF                    |
| GET      | `/api/receipts/files`        | List receipt files                 |
