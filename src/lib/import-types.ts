import type { ImportedOpeningBalanceApplyResult } from '@/lib/opening-balance-import';
import type { StateExportManifest } from '@/lib/state-transfer';

export type ImportedDocumentDateFallbackReason =
  | 'missing'
  | 'outside_period'
  | 'shifted_year';

export interface ImportedDocumentDateResolution {
  date: number;
  usedFallback: boolean;
  fallbackReason: ImportedDocumentDateFallbackReason | null;
}

export interface DocumentImportApiSuccess {
  id: number;
  number: number;
  category: string;
  name: string;
  receiptPath: string;
  usedFallbackDate: boolean;
  fallbackReason: ImportedDocumentDateFallbackReason | null;
}

export interface BankStatementImportApiSuccess {
  id: number;
  created: number;
  skipped: number;
}

export type OpeningBalanceImportApiSuccess = {
  ok: true;
} & ImportedOpeningBalanceApplyResult;

export interface StateTransferImportSuccess {
  ok: true;
  source: string;
  fileCount: number;
  restoredAt: string;
  manifest: StateExportManifest;
}

export interface SelectedPdfImportFile {
  key: string;
  file: File;
  label: string;
}
