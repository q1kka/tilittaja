import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { ApiRouteError } from '@/lib/api-helpers';

const { resolveRequestDbPath, runWithRequestDb } = vi.hoisted(() => ({
  resolveRequestDbPath: vi.fn(),
  runWithRequestDb: vi.fn(),
}));

vi.mock('@/lib/db/connection', () => ({
  resolveRequestDbPath,
  runWithRequestDb,
}));

const { mergeBankStatements, resolveRequestDataSource } = vi.hoisted(() => ({
  mergeBankStatements: vi.fn(),
  resolveRequestDataSource: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  mergeBankStatements,
  resolveRequestDataSource,
}));

const { requireUnlockedBankStatementPeriod } = vi.hoisted(() => ({
  requireUnlockedBankStatementPeriod: vi.fn(),
}));

vi.mock('@/lib/period-locks', () => ({
  requireUnlockedBankStatementPeriod,
}));

const { resolveBankStatementPdfAbsolutePath } = vi.hoisted(() => ({
  resolveBankStatementPdfAbsolutePath: vi.fn(),
}));

vi.mock('@/lib/receipt-pdfs', () => ({
  resolveBankStatementPdfAbsolutePath,
}));

vi.mock('fs', () => ({
  default: { existsSync: vi.fn(() => false), unlinkSync: vi.fn() },
}));

import { POST } from '../bank-statements/merge/route';

function jsonRequest(body: unknown) {
  const req = new Request('http://localhost/api/bank-statements/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  Object.defineProperty(req, 'cookies', {
    value: { get: () => undefined },
  });
  return req;
}

describe('POST /api/bank-statements/merge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveRequestDbPath.mockResolvedValue('/fake/path');
    runWithRequestDb.mockImplementation(
      (_path: string, fn: () => unknown) => fn(),
    );
    resolveRequestDataSource.mockReturnValue('demo');
    requireUnlockedBankStatementPeriod.mockImplementation(() => undefined);
    resolveBankStatementPdfAbsolutePath.mockReturnValue(null);
  });

  it('returns 400 when masterStatementId is missing or invalid', async () => {
    const res = await POST(
      jsonRequest({ mergedStatementIds: [2] }) as NextRequest,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it('returns 400 when mergedStatementIds is empty', async () => {
    const res = await POST(
      jsonRequest({
        masterStatementId: 1,
        mergedStatementIds: [],
      }) as NextRequest,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('yhdistettävät');
  });

  it("returns 400 when mergeBankStatements throws a business error containing 'itseensä'", async () => {
    mergeBankStatements.mockImplementation(() => {
      throw new Error('Tiliote ei voi yhdistää itseensä');
    });

    const res = await POST(
      jsonRequest({
        masterStatementId: 1,
        mergedStatementIds: [2],
      }) as NextRequest,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('itseensä');
  });

  it('returns 500 when mergeBankStatements throws an unknown error', async () => {
    mergeBankStatements.mockImplementation(() => {
      throw new Error('unexpected failure');
    });

    const res = await POST(
      jsonRequest({
        masterStatementId: 1,
        mergedStatementIds: [2],
      }) as NextRequest,
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Tiliotteiden yhdistäminen epäonnistui');
  });

  it('returns 200 with merge result on success', async () => {
    mergeBankStatements.mockReturnValue({
      masterStatement: { id: 1, source_file: null },
      mergedStatements: [{ id: 2, source_file: null }],
    });

    const res = await POST(
      jsonRequest({
        masterStatementId: 1,
        mergedStatementIds: [2],
      }) as NextRequest,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      ok: true,
      masterStatementId: 1,
      mergedCount: 1,
      warnings: [],
    });
    expect(mergeBankStatements).toHaveBeenCalledWith({
      masterStatementId: 1,
      mergedStatementIds: [2],
    });
  });

  it('returns 423 when period is locked', async () => {
    requireUnlockedBankStatementPeriod.mockImplementation(() => {
      throw new ApiRouteError(
        'Tilikausi on lukittu. Kausi on vain luku -tilassa.',
        423,
      );
    });

    const res = await POST(
      jsonRequest({
        masterStatementId: 1,
        mergedStatementIds: [2],
      }) as NextRequest,
    );
    expect(res.status).toBe(423);
    expect(mergeBankStatements).not.toHaveBeenCalled();
  });
});
