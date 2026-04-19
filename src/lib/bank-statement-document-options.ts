import { resolveDocumentLabels } from '@/lib/document-labels';
import type { ReceiptSource } from '@/lib/receipt-pdfs';
import type { Document, DocumentMetadata } from '@/lib/types';

export interface BankStatementDocumentOption {
  id: number;
  number: number;
  date: number;
  description: string;
  receiptPath: string | null;
  receiptSource: ReceiptSource;
}

interface ReceiptInfo {
  path: string | null;
  source: ReceiptSource;
}

interface BuildBankStatementDocumentOptionsParams {
  documents: ReadonlyArray<Document>;
  metadataMap: Map<number, DocumentMetadata>;
  firstEntryDescriptionByDocumentId: Map<number, string>;
  receiptMap: Map<number, ReceiptInfo>;
}

export function buildBankStatementDocumentOptions({
  documents,
  metadataMap,
  firstEntryDescriptionByDocumentId,
  receiptMap,
}: BuildBankStatementDocumentOptionsParams): BankStatementDocumentOption[] {
  const labels = resolveDocumentLabels(
    documents.map((document) => ({
      id: document.id,
      number: document.number,
      storedCategory: metadataMap.get(document.id)?.category ?? '',
      storedName: metadataMap.get(document.id)?.name ?? '',
      fallbackDescription:
        firstEntryDescriptionByDocumentId.get(document.id) ?? '',
    })),
  );

  return documents.map((document) => {
    const label = labels.get(document.id);
    const receipt = receiptMap.get(document.id);

    return {
      id: document.id,
      number: document.number,
      date: document.date,
      description:
        label?.description ??
        firstEntryDescriptionByDocumentId.get(document.id) ??
        '',
      receiptPath: receipt?.path ?? null,
      receiptSource: receipt?.source ?? null,
    };
  });
}
