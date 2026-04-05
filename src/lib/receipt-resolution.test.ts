import path from 'path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { entry } from '@/lib/test-helpers';

const dbMocks = vi.hoisted(() => ({
  getDocuments: vi.fn(),
  getDocumentMetadataMap: vi.fn(),
  getEntriesForPeriod: vi.fn(),
  getEntriesForDocument: vi.fn(),
  getDocumentReceiptLink: vi.fn(),
}));

vi.mock('@/lib/db', () => dbMocks);

const labelMocks = vi.hoisted(() => ({
  resolveDocumentLabels: vi.fn(),
}));

vi.mock('@/lib/document-labels', () => labelMocks);

const receiptPdfMocks = vi.hoisted(() => ({
  getPdfRoot: vi.fn(),
  getReceiptsRoot: vi.fn(),
  buildReceiptIndex: vi.fn(),
  getAutomaticReceiptPaths: vi.fn(),
  chooseDocumentReceipt: vi.fn(),
}));

vi.mock('@/lib/receipt-pdfs', () => receiptPdfMocks);

const { existsSyncMock } = vi.hoisted(() => ({ existsSyncMock: vi.fn() }));
vi.mock('fs', () => ({
  default: { existsSync: existsSyncMock },
  existsSync: existsSyncMock,
}));

import {
  buildEntryDescriptionsByDocumentId,
  collectReceiptsForPeriod,
  resolveDocumentReceiptsForSource,
} from '@/lib/receipt-resolution';

describe('buildEntryDescriptionsByDocumentId', () => {
  it('returns an empty map for an empty entry list', () => {
    expect(buildEntryDescriptionsByDocumentId([]).size).toBe(0);
  });

  it('groups descriptions by document_id in encounter order', () => {
    const map = buildEntryDescriptionsByDocumentId([
      { document_id: 2, description: 'a' },
      { document_id: 1, description: 'b' },
      { document_id: 2, description: 'c' },
    ]);
    expect(map.get(1)).toEqual(['b']);
    expect(map.get(2)).toEqual(['a', 'c']);
  });

  it('creates a new array per document and preserves empty strings', () => {
    const map = buildEntryDescriptionsByDocumentId([
      { document_id: 5, description: '' },
      { document_id: 5, description: 'x' },
    ]);
    expect(map.get(5)).toEqual(['', 'x']);
  });
});

describe('resolveDocumentReceiptsForSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    receiptPdfMocks.getPdfRoot.mockImplementation(
      (source: string) => `/data/${source}/pdf`,
    );
    receiptPdfMocks.getReceiptsRoot.mockImplementation(
      (source: string) => `/data/${source}/pdf/tositteet`,
    );
    receiptPdfMocks.buildReceiptIndex.mockReturnValue({
      byNumber: new Map<number, string[]>([[42, ['MU-0042.pdf']]]),
      unmatched: [],
    });
    receiptPdfMocks.getAutomaticReceiptPaths.mockImplementation(
      ({ documentNumber, receiptIndex }) =>
        receiptIndex.byNumber.get(documentNumber) ?? [],
    );
    receiptPdfMocks.chooseDocumentReceipt.mockImplementation(
      ({ manualPath, automaticPaths }) => {
        if (manualPath) return { path: manualPath, source: 'manual' as const };
        const first = automaticPaths[0];
        return first
          ? {
              path: path.join('tositteet', first),
              source: 'automatic' as const,
            }
          : { path: null, source: null };
      },
    );
  });

  it('builds the receipt index once from the receipts root for the source', () => {
    resolveDocumentReceiptsForSource({
      source: 'acme',
      documents: [{ id: 1, number: 42 }],
      entryDescriptionsByDocumentId: new Map([[1, []]]),
      manualReceiptLinks: new Map(),
    });
    expect(receiptPdfMocks.getReceiptsRoot).toHaveBeenCalledWith('acme');
    expect(receiptPdfMocks.buildReceiptIndex).toHaveBeenCalledTimes(1);
    expect(receiptPdfMocks.buildReceiptIndex).toHaveBeenCalledWith(
      '/data/acme/pdf/tositteet',
    );
  });

  it('passes manual links and entry descriptions into resolution', () => {
    const index = {
      byNumber: new Map<number, string[]>([[42, ['MU-0042.pdf']]]),
      unmatched: [] as string[],
    };
    receiptPdfMocks.buildReceiptIndex.mockReturnValue(index);

    const entryMap = new Map<number, string[]>([
      [10, ['see MU 99']],
      [11, []],
    ]);
    const result = resolveDocumentReceiptsForSource({
      source: 'x',
      documents: [
        { id: 10, number: 42 },
        { id: 11, number: 2 },
      ],
      entryDescriptionsByDocumentId: entryMap,
      manualReceiptLinks: new Map([[11, 'custom.pdf']]),
    });

    expect(receiptPdfMocks.getAutomaticReceiptPaths).toHaveBeenCalledWith({
      documentNumber: 42,
      entryDescriptions: ['see MU 99'],
      receiptIndex: index,
    });
    expect(receiptPdfMocks.getAutomaticReceiptPaths).toHaveBeenCalledWith({
      documentNumber: 2,
      entryDescriptions: [],
      receiptIndex: index,
    });

    expect(receiptPdfMocks.chooseDocumentReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        manualPath: null,
        pdfRoot: '/data/x/pdf',
        receiptsRoot: '/data/x/pdf/tositteet',
      }),
    );
    expect(receiptPdfMocks.chooseDocumentReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        manualPath: 'custom.pdf',
      }),
    );

    expect(result.get(10)?.source).toBe('automatic');
    expect(result.get(10)?.path).toBe(path.join('tositteet', 'MU-0042.pdf'));
    expect(result.get(11)?.source).toBe('manual');
    expect(result.get(11)?.path).toBe('custom.pdf');
  });
});

describe('collectReceiptsForPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    receiptPdfMocks.getPdfRoot.mockReturnValue('/pdf-root');
    receiptPdfMocks.getReceiptsRoot.mockReturnValue('/pdf-root/tositteet');
    receiptPdfMocks.buildReceiptIndex.mockReturnValue({
      byNumber: new Map(),
      unmatched: [],
    });
    receiptPdfMocks.getAutomaticReceiptPaths.mockReturnValue([]);
    receiptPdfMocks.chooseDocumentReceipt.mockReturnValue({
      path: null,
      source: null,
    });
    existsSyncMock.mockReturnValue(false);
    labelMocks.resolveDocumentLabels.mockReturnValue(new Map());
    dbMocks.getDocumentReceiptLink.mockReturnValue(null);
  });

  it('uses first row_number 1 entry per document as fallback description for labels', () => {
    dbMocks.getDocuments.mockReturnValue([
      { id: 7, number: 3, period_id: 1, date: 0 },
    ]);
    dbMocks.getDocumentMetadataMap.mockReturnValue(new Map());
    dbMocks.getEntriesForPeriod.mockReturnValue([
      entry({ document_id: 7, row_number: 2, description: 'skip' }),
      entry({ document_id: 7, row_number: 1, description: 'use-me' }),
      entry({ document_id: 7, row_number: 1, description: 'ignored-second' }),
    ]);
    dbMocks.getEntriesForDocument.mockReturnValue([]);

    collectReceiptsForPeriod(1, 'src');

    expect(labelMocks.resolveDocumentLabels).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 7,
        number: 3,
        fallbackDescription: 'use-me',
      }),
    ]);
  });

  it('skips documents when no receipt path is resolved', () => {
    dbMocks.getDocuments.mockReturnValue([
      { id: 1, number: 10, period_id: 1, date: 0 },
    ]);
    dbMocks.getDocumentMetadataMap.mockReturnValue(new Map());
    dbMocks.getEntriesForPeriod.mockReturnValue([]);
    dbMocks.getEntriesForDocument.mockReturnValue([]);

    expect(collectReceiptsForPeriod(9, 'src')).toEqual([]);
  });

  it('uses label code when present and file exists', () => {
    dbMocks.getDocuments.mockReturnValue([
      { id: 5, number: 40, period_id: 1, date: 0 },
    ]);
    dbMocks.getDocumentMetadataMap.mockReturnValue(new Map());
    dbMocks.getEntriesForPeriod.mockReturnValue([]);
    dbMocks.getEntriesForDocument.mockReturnValue([
      entry({ document_id: 5, description: 'x' }),
    ]);

    receiptPdfMocks.chooseDocumentReceipt.mockReturnValue({
      path: 'tositteet/a.pdf',
      source: 'automatic',
    });

    labelMocks.resolveDocumentLabels.mockReturnValue(
      new Map([
        [
          5,
          {
            category: 'M',
            name: '',
            code: 'M-7',
            description: 'M-7',
          },
        ],
      ]),
    );

    const absolute = path.resolve('/pdf-root', 'tositteet/a.pdf');
    existsSyncMock.mockImplementation((p: string) => p === absolute);

    expect(collectReceiptsForPeriod(2, 'src')).toEqual([
      { code: 'M-7', absolutePath: absolute },
    ]);
  });

  it('falls back to document number as code when label map has no entry', () => {
    dbMocks.getDocuments.mockReturnValue([
      { id: 3, number: 88, period_id: 1, date: 0 },
    ]);
    dbMocks.getDocumentMetadataMap.mockReturnValue(new Map());
    dbMocks.getEntriesForPeriod.mockReturnValue([]);
    dbMocks.getEntriesForDocument.mockReturnValue([]);

    receiptPdfMocks.chooseDocumentReceipt.mockReturnValue({
      path: 'tositteet/b.pdf',
      source: 'manual',
    });
    labelMocks.resolveDocumentLabels.mockReturnValue(new Map());

    const absolute = path.resolve('/pdf-root', 'tositteet/b.pdf');
    existsSyncMock.mockImplementation((p: string) => p === absolute);

    expect(collectReceiptsForPeriod(2, 'src')).toEqual([
      { code: '88', absolutePath: absolute },
    ]);
  });

  it('drops resolved receipts when the absolute PDF path is missing on disk', () => {
    dbMocks.getDocuments.mockReturnValue([
      { id: 1, number: 1, period_id: 1, date: 0 },
    ]);
    dbMocks.getDocumentMetadataMap.mockReturnValue(new Map());
    dbMocks.getEntriesForPeriod.mockReturnValue([]);
    dbMocks.getEntriesForDocument.mockReturnValue([]);

    receiptPdfMocks.chooseDocumentReceipt.mockReturnValue({
      path: 'tositteet/missing.pdf',
      source: 'automatic',
    });
    existsSyncMock.mockReturnValue(false);

    expect(collectReceiptsForPeriod(2, 'src')).toEqual([]);
  });

  it('loads per-document entry descriptions for automatic matching', () => {
    dbMocks.getDocuments.mockReturnValue([
      { id: 20, number: 5, period_id: 1, date: 0 },
    ]);
    dbMocks.getDocumentMetadataMap.mockReturnValue(new Map());
    dbMocks.getEntriesForPeriod.mockReturnValue([]);
    dbMocks.getEntriesForDocument.mockReturnValue([
      entry({ document_id: 20, description: 'MU-001' }),
    ]);

    const index = {
      byNumber: new Map<number, string[]>([[1, ['MU-1.pdf']]]),
      unmatched: [] as string[],
    };
    receiptPdfMocks.buildReceiptIndex.mockReturnValue(index);

    collectReceiptsForPeriod(3, 'demo');

    expect(receiptPdfMocks.chooseDocumentReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        manualPath: null,
        automaticPaths: [],
      }),
    );
    expect(receiptPdfMocks.getAutomaticReceiptPaths).toHaveBeenCalled();
    const autoCall = receiptPdfMocks.getAutomaticReceiptPaths.mock.calls.find(
      (c) => c[0].documentNumber === 5,
    );
    expect(autoCall?.[0].entryDescriptions).toEqual(['MU-001']);
    expect(autoCall?.[0].receiptIndex).toBe(index);
  });
});
