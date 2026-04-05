import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { ApiRouteError } from '@/lib/api-helpers';
import type { Document } from '@/lib/types';
import type { VatSettlementPreview } from '@/lib/vat-report';

const { resolveRequestDbPath, runWithRequestDb } = vi.hoisted(() => ({
  resolveRequestDbPath: vi.fn(),
  runWithRequestDb: vi.fn(),
}));

vi.mock('@/lib/db/connection', () => ({
  resolveRequestDbPath,
  runWithRequestDb,
}));

const {
  getAccounts,
  getEntriesForPeriod,
  createDocument,
  createEntry,
  updateDocumentMetadata,
} = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getEntriesForPeriod: vi.fn(),
  createDocument: vi.fn(),
  createEntry: vi.fn(),
  updateDocumentMetadata: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getAccounts,
  getEntriesForPeriod,
  createDocument,
  createEntry,
  updateDocumentMetadata,
}));

const { requireUnlockedTargetPeriod } = vi.hoisted(() => ({
  requireUnlockedTargetPeriod: vi.fn(),
}));

vi.mock('@/lib/period-locks', () => ({
  requireUnlockedTargetPeriod,
}));

const { buildVatSettlementPreview } = vi.hoisted(() => ({
  buildVatSettlementPreview: vi.fn(),
}));

vi.mock('@/lib/vat-report', () => ({
  buildVatSettlementPreview,
}));

import { POST } from '../vat/settlement/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost/api/vat/settlement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/vat/settlement', () => {
  const doc: Document = {
    id: 99,
    number: 15,
    period_id: 1,
    date: 1_700_000_000_000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resolveRequestDbPath.mockResolvedValue('/fake/path');
    runWithRequestDb.mockImplementation(
      (_path: string, fn: () => unknown) => fn(),
    );
    requireUnlockedTargetPeriod.mockImplementation(() => undefined);
    getAccounts.mockReturnValue([]);
    getEntriesForPeriod.mockReturnValue([]);
    createDocument.mockReturnValue(doc);
  });

  it('returns 400 for invalid periodId or date', async () => {
    const res = await POST(
      jsonRequest({ periodId: -1, date: 0 }) as NextRequest,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Virheellinen');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('returns 400 when buildVatSettlementPreview returns null', async () => {
    buildVatSettlementPreview.mockReturnValue(null);

    const res = await POST(
      jsonRequest({ periodId: 1, date: 1_700_000_000_000 }) as NextRequest,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('saldoa');
    expect(createDocument).not.toHaveBeenCalled();
  });

  it('returns 200 and creates document + entries on success', async () => {
    const preview: VatSettlementPreview = {
      settlementAccountId: 50,
      settlementAccountNumber: '2939',
      settlementAccountName: 'ALV-velka',
      settlementBalance: -200,
      settlementDebit: true,
      settlementAmount: 200,
      sourceLines: [
        {
          accountId: 10,
          accountNumber: '2940',
          accountName: 'ALV myynti',
          balance: 120,
          debit: false,
          amount: 120,
        },
        {
          accountId: 20,
          accountNumber: '2941',
          accountName: 'ALV ostot',
          balance: -80,
          debit: true,
          amount: 80,
        },
      ],
    };
    buildVatSettlementPreview.mockReturnValue(preview);

    const res = await POST(
      jsonRequest({ periodId: 1, date: 1_700_000_000_000 }) as NextRequest,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ id: 99, number: 15 });

    expect(createDocument).toHaveBeenCalledWith(1, 1_700_000_000_000);
    expect(createEntry).toHaveBeenCalledTimes(3);
    expect(createEntry).toHaveBeenCalledWith(
      99,
      10,
      false,
      120,
      'ALV-ilmoitus',
      1,
    );
    expect(createEntry).toHaveBeenCalledWith(
      99,
      20,
      true,
      80,
      'ALV-ilmoitus',
      2,
    );
    expect(createEntry).toHaveBeenCalledWith(
      99,
      50,
      true,
      200,
      'ALV-ilmoitus',
      3,
    );
    expect(updateDocumentMetadata).toHaveBeenCalledWith(
      99,
      'ALV',
      'ALV-ilmoitus',
    );
  });

  it('returns 423 when period is locked', async () => {
    buildVatSettlementPreview.mockReturnValue({
      settlementAccountId: 50,
      settlementAccountNumber: '2939',
      settlementAccountName: 'ALV-velka',
      settlementBalance: -200,
      settlementDebit: true,
      settlementAmount: 200,
      sourceLines: [
        {
          accountId: 10,
          accountNumber: '2940',
          accountName: 'ALV myynti',
          balance: 120,
          debit: false,
          amount: 120,
        },
      ],
    });
    requireUnlockedTargetPeriod.mockImplementation(() => {
      throw new ApiRouteError(
        'Tilikausi on lukittu. Kausi on vain luku -tilassa.',
        423,
      );
    });

    const res = await POST(
      jsonRequest({ periodId: 1, date: 1_700_000_000_000 }) as NextRequest,
    );
    expect(res.status).toBe(423);
    expect(createDocument).not.toHaveBeenCalled();
  });
});
