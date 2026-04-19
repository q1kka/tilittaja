import fs from 'fs';
import path from 'path';
import {
  type ReceiptIndex,
  type ReceiptSource,
  buildReceiptIndex,
  chooseDocumentReceipt,
  getAutomaticReceiptPaths,
  getPdfRoot,
  getReceiptsRoot,
} from './receipt-pdfs';
import {
  getDocuments,
  getDocumentMetadataMap,
  getEntriesForPeriod,
  getEntriesForDocument,
  getDocumentReceiptLink,
} from './db';
import { resolveDocumentLabels } from './document-labels';

interface DocumentReceiptInfo {
  path: string | null;
  source: ReceiptSource;
}

export function buildEntryDescriptionsByDocumentId(
  entries: ReadonlyArray<{ document_id: number; description: string }>,
): Map<number, string[]> {
  const result = new Map<number, string[]>();
  for (const entry of entries) {
    const descriptions = result.get(entry.document_id) ?? [];
    descriptions.push(entry.description);
    result.set(entry.document_id, descriptions);
  }
  return result;
}

function resolveDocumentReceipts(params: {
  documents: ReadonlyArray<{ id: number; number: number }>;
  entryDescriptionsByDocumentId: Map<number, string[]>;
  manualReceiptLinks: Map<number, string>;
  pdfRoot: string;
  receiptsRoot: string;
  receiptIndex: ReceiptIndex;
}): Map<number, DocumentReceiptInfo> {
  const result = new Map<number, DocumentReceiptInfo>();

  for (const doc of params.documents) {
    const resolved = chooseDocumentReceipt({
      manualPath: params.manualReceiptLinks.get(doc.id) ?? null,
      automaticPaths: getAutomaticReceiptPaths({
        documentNumber: doc.number,
        entryDescriptions:
          params.entryDescriptionsByDocumentId.get(doc.id) ?? [],
        receiptIndex: params.receiptIndex,
      }),
      pdfRoot: params.pdfRoot,
      receiptsRoot: params.receiptsRoot,
    });

    result.set(doc.id, { path: resolved.path, source: resolved.source });
  }

  return result;
}

interface CollectedReceipt {
  code: string;
  absolutePath: string;
}

/**
 * Collects all receipts for a period: resolves document labels, matches each
 * document to its receipt PDF, and returns only those that exist on disk.
 */
export function collectReceiptsForPeriod(
  periodId: number,
  source: string,
): CollectedReceipt[] {
  const pdfRoot = getPdfRoot(source);
  const receiptsRoot = getReceiptsRoot(source);
  const documents = getDocuments(periodId);
  const metadataMap = getDocumentMetadataMap(documents.map((d) => d.id));
  const periodEntries = getEntriesForPeriod(periodId);

  const firstEntryDescByDocId = new Map<number, string>();
  for (const entry of periodEntries) {
    if (entry.row_number !== 1 || firstEntryDescByDocId.has(entry.document_id))
      continue;
    firstEntryDescByDocId.set(entry.document_id, entry.description);
  }

  const labels = resolveDocumentLabels(
    documents.map((doc) => ({
      id: doc.id,
      number: doc.number,
      storedCategory: metadataMap.get(doc.id)?.category ?? '',
      storedName: metadataMap.get(doc.id)?.name ?? '',
      fallbackDescription: firstEntryDescByDocId.get(doc.id) ?? '',
    })),
  );

  const receiptIndex = buildReceiptIndex(receiptsRoot);
  const results: CollectedReceipt[] = [];

  for (const doc of documents) {
    const entryDescriptions = getEntriesForDocument(doc.id).map(
      (e) => e.description,
    );
    const resolved = chooseDocumentReceipt({
      manualPath: getDocumentReceiptLink(doc.id),
      automaticPaths: getAutomaticReceiptPaths({
        documentNumber: doc.number,
        entryDescriptions,
        receiptIndex,
      }),
      pdfRoot,
      receiptsRoot,
    });

    if (!resolved.path) continue;

    const label = labels.get(doc.id);
    const code = label?.code ?? String(doc.number);
    const absolutePath = path.resolve(pdfRoot, resolved.path);

    if (!fs.existsSync(absolutePath)) continue;
    results.push({ code, absolutePath });
  }

  return results;
}

/**
 * High-level helper that builds the receipt index from the datasource path
 * and resolves receipts for all given documents in one call.
 */
export function resolveDocumentReceiptsForSource(params: {
  source: string;
  documents: ReadonlyArray<{ id: number; number: number }>;
  entryDescriptionsByDocumentId: Map<number, string[]>;
  manualReceiptLinks: Map<number, string>;
}): Map<number, DocumentReceiptInfo> {
  const pdfRoot = getPdfRoot(params.source);
  const receiptsRoot = getReceiptsRoot(params.source);
  const receiptIndex = buildReceiptIndex(receiptsRoot);

  return resolveDocumentReceipts({
    ...params,
    pdfRoot,
    receiptsRoot,
    receiptIndex,
  });
}
