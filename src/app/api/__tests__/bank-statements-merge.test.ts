import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { ApiRouteError } from '@/lib/api-helpers';

const { mergeBankStatementsAction } = vi.hoisted(() => ({
  mergeBankStatementsAction: vi.fn(),
}));

vi.mock('@/actions/app-actions', () => ({
  mergeBankStatementsAction,
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
  });

  it('returns 200 with merge result on success', async () => {
    mergeBankStatementsAction.mockResolvedValue({
      ok: true,
      masterStatementId: 1,
      mergedCount: 1,
      warnings: [],
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
    expect(mergeBankStatementsAction).toHaveBeenCalledWith({
      masterStatementId: 1,
      mergedStatementIds: [2],
    });
  });

  it('returns 400 when the action rejects with a business error', async () => {
    mergeBankStatementsAction.mockRejectedValue(
      new ApiRouteError('Tiliote ei voi yhdistää itseensä', 400),
    );

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

  it('returns 500 when the action rejects with the fallback error', async () => {
    mergeBankStatementsAction.mockRejectedValue(
      new Error('Tiliotteiden yhdistäminen epäonnistui.'),
    );

    const res = await POST(
      jsonRequest({
        masterStatementId: 1,
        mergedStatementIds: [2],
      }) as NextRequest,
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Tiliotteiden yhdistäminen epäonnistui.');
  });

  it('returns 423 when the action rejects with a locked-period error', async () => {
    mergeBankStatementsAction.mockRejectedValue(
      new ApiRouteError(
        'Tilikausi on lukittu. Kausi on vain luku -tilassa.',
        423,
      ),
    );

    const res = await POST(
      jsonRequest({
        masterStatementId: 1,
        mergedStatementIds: [2],
      }) as NextRequest,
    );
    expect(res.status).toBe(423);
    await expect(res.json()).resolves.toEqual({
      error: 'Tilikausi on lukittu. Kausi on vain luku -tilassa.',
    });
  });
});
