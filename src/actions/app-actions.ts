/**
 * Re-export barrel for all server actions. Each domain has its own file:
 *
 * - document-actions.ts  — document/entry CRUD, duplication
 * - account-actions.ts   — account CRUD, cloning
 * - settings-actions.ts  — company info, tilinpäätös metadata, period locks
 * - bank-statement-actions.ts — bank statement operations
 * - vat-actions.ts       — VAT settlement
 * - datasource-actions.ts — datasource switching, setup, import/export
 */

export {
  createDocumentAction,
  updateDocumentAction,
  saveDocumentEntriesAction,
  duplicateDocumentAction,
  deleteDocumentAction,
  deleteDocumentsAction,
  updateDocumentReceiptAction,
  uploadDocumentReceiptAction,
  deleteDocumentReceiptAction,
  updateEntryDescriptionAction,
  updateEntryAccountAction,
} from './document-actions';

export {
  createAccountAction,
  updateAccountAction,
  cloneAccountAction,
  deleteAccountAction,
} from './account-actions';

export {
  updateCompanyInfoAction,
  updateTilinpaatosMetadataAction,
  setPeriodLockAction,
  generateRecurringRentDocumentsAction,
} from './settings-actions';

export {
  updateBankStatementEntryDocumentAction,
  createBankStatementDocumentsAction,
  suggestBankStatementDocumentLinksAction,
  applyBankStatementDocumentSuggestionsAction,
  deleteBankStatementAction,
  createBankStatementManualAction,
} from './bank-statement-actions';

export { createVatSettlementAction } from './vat-actions';

export {
  setDatasourceAction,
  importStateTransferAction,
  setupCreateNewDatabaseAction,
  setupLinkExternalDatabaseAction,
  setupImportArchiveAction,
} from './datasource-actions';
