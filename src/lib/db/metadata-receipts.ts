import { DocumentMetadata } from '../types';
import { getDb } from './connection';
import { ensureAppTables } from './migrations';

export function ensureDocumentMetadataTable(): void {
  ensureAppTables(getDb());
}

export function getDocumentMetadata(
  documentId: number,
): DocumentMetadata | null {
  const row = getDb()
    .prepare(
      'SELECT document_id, category, name FROM document_metadata WHERE document_id = ?',
    )
    .get(documentId) as DocumentMetadata | undefined;
  return row ?? null;
}

export function getDocumentMetadataMap(
  documentIds: number[],
): Map<number, DocumentMetadata> {
  if (documentIds.length === 0) return new Map();

  const rows = getDb()
    .prepare(
      `SELECT document_id, category, name
       FROM document_metadata
       WHERE document_id IN (${documentIds.map(() => '?').join(',')})`,
    )
    .all(...documentIds) as DocumentMetadata[];

  return new Map(rows.map((row) => [row.document_id, row]));
}

export function updateDocumentMetadata(
  documentId: number,
  category: string,
  name: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO document_metadata (document_id, category, name)
       VALUES (?, ?, ?)
       ON CONFLICT(document_id) DO UPDATE SET
         category = excluded.category,
         name = excluded.name`,
    )
    .run(documentId, category.trim(), name.trim());
}

export function ensureDocumentReceiptLinksTable(): void {
  ensureAppTables(getDb());
}

export function getDocumentReceiptLink(documentId: number): string | null {
  const row = getDb()
    .prepare('SELECT pdf_path FROM document_receipt_link WHERE document_id = ?')
    .get(documentId) as { pdf_path: string } | undefined;
  return row?.pdf_path ?? null;
}

export function getDocumentReceiptLinks(
  documentIds: number[],
): Map<number, string> {
  if (documentIds.length === 0) return new Map();

  const rows = getDb()
    .prepare(
      `SELECT document_id, pdf_path
       FROM document_receipt_link
       WHERE document_id IN (${documentIds.map(() => '?').join(',')})`,
    )
    .all(...documentIds) as { document_id: number; pdf_path: string }[];

  return new Map(rows.map((row) => [row.document_id, row.pdf_path]));
}

export function setDocumentReceiptLink(
  documentId: number,
  pdfPath: string,
): void {
  getDb()
    .prepare(
      `INSERT INTO document_receipt_link (document_id, pdf_path, linked_at)
       VALUES (?, ?, ?)
       ON CONFLICT(document_id) DO UPDATE SET
         pdf_path = excluded.pdf_path,
         linked_at = excluded.linked_at`,
    )
    .run(documentId, pdfPath, Date.now());
}

export function clearDocumentReceiptLink(documentId: number): void {
  getDb()
    .prepare('DELETE FROM document_receipt_link WHERE document_id = ?')
    .run(documentId);
}
