import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock('./connection', () => ({ getDb }));

import {
  getDocumentMetadata,
  getDocumentMetadataMap,
  updateDocumentMetadata,
  getDocumentReceiptLink,
  getDocumentReceiptLinks,
  setDocumentReceiptLink,
  clearDocumentReceiptLink,
} from './metadata-receipts';

describe('metadata-receipts', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    getDb.mockReturnValue(db);

    db.exec(`
      CREATE TABLE document (
        id INTEGER PRIMARY KEY
      );
      CREATE TABLE document_metadata (
        document_id INTEGER PRIMARY KEY REFERENCES document(id) ON DELETE CASCADE,
        category TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE document_receipt_link (
        document_id INTEGER PRIMARY KEY REFERENCES document(id) ON DELETE CASCADE,
        pdf_path TEXT NOT NULL,
        linked_at INTEGER NOT NULL
      );
      INSERT INTO document (id) VALUES (1), (2), (3);
    `);
  });

  afterEach(() => {
    db.close();
    vi.clearAllMocks();
  });

  describe('getDocumentMetadata', () => {
    it('returns null when no metadata exists', () => {
      expect(getDocumentMetadata(1)).toBeNull();
    });

    it('returns metadata when it exists', () => {
      updateDocumentMetadata(1, 'invoices', 'Invoice 001');
      const meta = getDocumentMetadata(1);
      expect(meta).toEqual({
        document_id: 1,
        category: 'invoices',
        name: 'Invoice 001',
      });
    });
  });

  describe('getDocumentMetadataMap', () => {
    it('returns empty map for empty input', () => {
      expect(getDocumentMetadataMap([]).size).toBe(0);
    });

    it('returns map of metadata for given IDs', () => {
      updateDocumentMetadata(1, 'cat1', 'name1');
      updateDocumentMetadata(2, 'cat2', 'name2');
      const map = getDocumentMetadataMap([1, 2, 3]);
      expect(map.size).toBe(2);
      expect(map.get(1)?.category).toBe('cat1');
      expect(map.get(2)?.name).toBe('name2');
      expect(map.has(3)).toBe(false);
    });
  });

  describe('updateDocumentMetadata', () => {
    it('inserts new metadata', () => {
      updateDocumentMetadata(1, 'receipts', 'Receipt #42');
      expect(getDocumentMetadata(1)?.name).toBe('Receipt #42');
    });

    it('upserts on conflict', () => {
      updateDocumentMetadata(1, 'old', 'old name');
      updateDocumentMetadata(1, 'new', 'new name');
      expect(getDocumentMetadata(1)).toEqual({
        document_id: 1,
        category: 'new',
        name: 'new name',
      });
    });

    it('trims whitespace from values', () => {
      updateDocumentMetadata(1, '  cat  ', '  name  ');
      const meta = getDocumentMetadata(1);
      expect(meta?.category).toBe('cat');
      expect(meta?.name).toBe('name');
    });
  });

  describe('getDocumentReceiptLink', () => {
    it('returns null when no link exists', () => {
      expect(getDocumentReceiptLink(1)).toBeNull();
    });

    it('returns pdf_path when link exists', () => {
      setDocumentReceiptLink(1, 'tositteet/MU-001.pdf');
      expect(getDocumentReceiptLink(1)).toBe('tositteet/MU-001.pdf');
    });
  });

  describe('getDocumentReceiptLinks', () => {
    it('returns empty map for empty input', () => {
      expect(getDocumentReceiptLinks([]).size).toBe(0);
    });

    it('returns map of links', () => {
      setDocumentReceiptLink(1, 'path1.pdf');
      setDocumentReceiptLink(2, 'path2.pdf');
      const map = getDocumentReceiptLinks([1, 2, 3]);
      expect(map.size).toBe(2);
      expect(map.get(1)).toBe('path1.pdf');
      expect(map.get(2)).toBe('path2.pdf');
    });
  });

  describe('setDocumentReceiptLink', () => {
    it('creates a new receipt link', () => {
      setDocumentReceiptLink(1, 'test.pdf');
      expect(getDocumentReceiptLink(1)).toBe('test.pdf');
    });

    it('updates existing link on conflict', () => {
      setDocumentReceiptLink(1, 'old.pdf');
      setDocumentReceiptLink(1, 'new.pdf');
      expect(getDocumentReceiptLink(1)).toBe('new.pdf');
    });
  });

  describe('clearDocumentReceiptLink', () => {
    it('removes existing link', () => {
      setDocumentReceiptLink(1, 'test.pdf');
      clearDocumentReceiptLink(1);
      expect(getDocumentReceiptLink(1)).toBeNull();
    });

    it('does nothing when no link exists', () => {
      expect(() => clearDocumentReceiptLink(999)).not.toThrow();
    });
  });
});
