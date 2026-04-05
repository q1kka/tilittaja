import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chooseDocumentReceipt,
  extractReceiptNumbersFromText,
  getAutomaticReceiptPaths,
  getPdfRoot,
  getDataSourceRoot,
  getReceiptsRoot,
  collectPdfFiles,
  listPdfFiles,
  buildReceiptIndex,
  resolvePdfRelativePath,
  findPdfByFileName,
  resolveBankStatementPdfAbsolutePath,
  type ReceiptIndex,
} from '@/lib/receipt-pdfs';

function receiptIndex(byNumber: Record<number, string[]>): ReceiptIndex {
  return {
    byNumber: new Map(
      Object.entries(byNumber).map(([number, paths]) => [
        Number(number),
        paths,
      ]),
    ),
    unmatched: [],
  };
}

describe('receipt pdf matching', () => {
  it('extracts MU references from entry descriptions', () => {
    expect(
      extractReceiptNumbersFromText(
        'MU4: Pankkikulut, korjaus MU004 ja liite MU420',
      ),
    ).toEqual([4, 420]);
  });

  it('returns empty array for empty/null text', () => {
    expect(extractReceiptNumbersFromText('')).toEqual([]);
    expect(extractReceiptNumbersFromText(null as unknown as string)).toEqual([]);
    expect(extractReceiptNumbersFromText('no references here')).toEqual([]);
  });

  it('deduplicates MU references', () => {
    expect(extractReceiptNumbersFromText('MU5 ja MU5 ja MU5')).toEqual([5]);
  });

  it('prefers MU references over the internal document number', () => {
    expect(
      getAutomaticReceiptPaths({
        documentNumber: 8,
        entryDescriptions: ['MU7 Google Workspaces', 'MU7 Google Workspaces'],
        receiptIndex: receiptIndex({
          7: ['2024-2025/MU7.pdf'],
          8: ['2024-2025/MU8.pdf'],
        }),
      }),
    ).toEqual(['2024-2025/MU7.pdf', '2024-2025/MU8.pdf']);
  });

  it('falls back to the document number when descriptions have no MU reference', () => {
    expect(
      getAutomaticReceiptPaths({
        documentNumber: 420,
        entryDescriptions: ['Google Workspaces helmikuu'],
        receiptIndex: receiptIndex({
          420: ['2025-2026/MU420.pdf'],
        }),
      }),
    ).toEqual(['2025-2026/MU420.pdf']);
  });

  it('returns empty when no matching receipt exists', () => {
    expect(
      getAutomaticReceiptPaths({
        documentNumber: 999,
        entryDescriptions: ['No match'],
        receiptIndex: receiptIndex({}),
      }),
    ).toEqual([]);
  });

  it('keeps the document without a receipt when automatic matching is disabled', () => {
    expect(
      chooseDocumentReceipt({
        manualPath: '',
        automaticPaths: ['2025-2026/MU420.pdf'],
        pdfRoot: '/tmp/pdf',
        receiptsRoot: '/tmp/pdf/tositteet',
      }),
    ).toEqual({ path: null, source: null });
  });

  it('returns null source when no paths match', () => {
    expect(
      chooseDocumentReceipt({
        manualPath: null,
        automaticPaths: [],
        pdfRoot: '/tmp/pdf',
        receiptsRoot: '/tmp/pdf/tositteet',
      }),
    ).toEqual({ path: null, source: null });
  });
});

describe('receipt pdf filesystem helpers', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('getPdfRoot', () => {
    it('resolves default path from source slug', () => {
      const root = getPdfRoot('test-company');
      expect(root).toContain(path.join('data', 'test-company', 'pdf'));
    });

    it('uses RECEIPT_PDF_ROOT env when set', () => {
      const origEnv = process.env.RECEIPT_PDF_ROOT;
      process.env.RECEIPT_PDF_ROOT = tmpDir;
      try {
        expect(getPdfRoot('anything')).toBe(path.normalize(tmpDir));
      } finally {
        if (origEnv !== undefined) {
          process.env.RECEIPT_PDF_ROOT = origEnv;
        } else {
          delete process.env.RECEIPT_PDF_ROOT;
        }
      }
    });
  });

  describe('getDataSourceRoot', () => {
    it('resolves path for source slug', () => {
      expect(getDataSourceRoot('slug')).toContain(path.join('data', 'slug'));
    });
  });

  describe('getReceiptsRoot', () => {
    it('appends tositteet to pdf root', () => {
      const root = getReceiptsRoot('test');
      expect(root).toContain('tositteet');
    });
  });

  describe('collectPdfFiles and listPdfFiles', () => {
    it('collects PDF files recursively', () => {
      const subDir = path.join(tmpDir, 'sub');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(tmpDir, 'MU1.pdf'), '');
      fs.writeFileSync(path.join(subDir, 'MU2.pdf'), '');
      fs.writeFileSync(path.join(tmpDir, 'readme.txt'), '');

      const files = listPdfFiles(tmpDir);
      expect(files).toHaveLength(2);
      expect(files.some((f) => f.includes('MU1.pdf'))).toBe(true);
      expect(files.some((f) => f.includes('MU2.pdf'))).toBe(true);
    });

    it('returns empty for non-existent directory', () => {
      const files: string[] = [];
      collectPdfFiles('/nonexistent-dir-xyz', '/nonexistent-dir-xyz', files);
      expect(files).toHaveLength(0);
    });
  });

  describe('buildReceiptIndex', () => {
    it('indexes MU-numbered files by number', () => {
      fs.writeFileSync(path.join(tmpDir, 'MU-001.pdf'), '');
      fs.writeFileSync(path.join(tmpDir, 'MU-002.pdf'), '');
      fs.writeFileSync(path.join(tmpDir, 'other.pdf'), '');

      const index = buildReceiptIndex(tmpDir);
      expect(index.byNumber.get(1)).toEqual(['MU-001.pdf']);
      expect(index.byNumber.get(2)).toEqual(['MU-002.pdf']);
      expect(index.unmatched).toEqual(['other.pdf']);
    });
  });

  describe('resolvePdfRelativePath', () => {
    it('resolves valid relative path', () => {
      fs.writeFileSync(path.join(tmpDir, 'test.pdf'), '');
      expect(resolvePdfRelativePath(tmpDir, 'test.pdf')).toBe('test.pdf');
    });

    it('rejects path traversal', () => {
      expect(resolvePdfRelativePath(tmpDir, '../etc/passwd.pdf')).toBeNull();
    });

    it('rejects non-PDF files', () => {
      fs.writeFileSync(path.join(tmpDir, 'test.txt'), '');
      expect(resolvePdfRelativePath(tmpDir, 'test.txt')).toBeNull();
    });

    it('rejects empty path', () => {
      expect(resolvePdfRelativePath(tmpDir, '')).toBeNull();
    });

    it('rejects non-existent file', () => {
      expect(resolvePdfRelativePath(tmpDir, 'nonexistent.pdf')).toBeNull();
    });
  });

  describe('findPdfByFileName', () => {
    it('finds PDF in root directory', () => {
      fs.writeFileSync(path.join(tmpDir, 'statement.pdf'), 'data');
      const result = findPdfByFileName(tmpDir, 'statement.pdf');
      expect(result).toBeTruthy();
      expect(result!.endsWith('statement.pdf')).toBe(true);
    });

    it('finds PDF in tiliotteet subdirectory', () => {
      const subDir = path.join(tmpDir, 'tiliotteet');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, 'bank.pdf'), 'data');
      const result = findPdfByFileName(tmpDir, 'bank.pdf');
      expect(result).toBeTruthy();
    });

    it('returns null for non-existent file', () => {
      expect(findPdfByFileName(tmpDir, 'missing.pdf')).toBeNull();
    });

    it('returns null for empty fileName', () => {
      expect(findPdfByFileName(tmpDir, '')).toBeNull();
    });

    it('returns null for non-PDF file', () => {
      expect(findPdfByFileName(tmpDir, 'test.txt')).toBeNull();
    });

    it('returns null for non-existent search root', () => {
      expect(findPdfByFileName('/nonexistent-xyz', 'test.pdf')).toBeNull();
    });
  });

  describe('resolveBankStatementPdfAbsolutePath', () => {
    it('returns null when file not found anywhere', () => {
      expect(
        resolveBankStatementPdfAbsolutePath(
          'nonexistent-slug-xyz',
          'missing.pdf',
        ),
      ).toBeNull();
    });

    it('returns null for empty source file', () => {
      expect(resolveBankStatementPdfAbsolutePath('test', '')).toBeNull();
    });
  });
});
