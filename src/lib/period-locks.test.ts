import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
  getPeriods,
  getPeriod,
  getDocument,
  getEntry,
  getBankStatement,
  getBankStatementEntry,
} = vi.hoisted(() => ({
  getPeriods: vi.fn(),
  getPeriod: vi.fn(),
  getDocument: vi.fn(),
  getEntry: vi.fn(),
  getBankStatement: vi.fn(),
  getBankStatementEntry: vi.fn(),
}));

vi.mock('@/lib/db/documents', () => ({
  getPeriods,
  getPeriod,
  getDocument,
  getEntry,
}));

vi.mock('@/lib/db/bank-statements', () => ({
  getBankStatement,
  getBankStatementEntry,
}));

import {
  LOCKED_PERIOD_ERROR_MESSAGE,
  resolvePeriodForDate,
  requireUnlockedExistingPeriod,
  requireUnlockedTargetPeriod,
  requireUnlockedDocumentPeriod,
  requireUnlockedDocumentPeriodById,
  requireUnlockedEntryPeriod,
  requireUnlockedEntryPeriodById,
  requireUnlockedBankStatementEntryPeriod,
  requireUnlockedBankStatementPeriod,
} from './period-locks';
import { ApiRouteError } from './api-helpers';

const period = (id: number, start: number, end: number, locked = false) => ({
  id,
  start_date: start,
  end_date: end,
  locked,
});

describe('period-locks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolvePeriodForDate', () => {
    it('returns matching period for a date within range', () => {
      const p = period(1, 100, 200);
      getPeriods.mockReturnValue([p]);
      expect(resolvePeriodForDate(150)).toEqual(p);
    });

    it('returns undefined when no period matches', () => {
      getPeriods.mockReturnValue([period(1, 100, 200)]);
      expect(resolvePeriodForDate(300)).toBeUndefined();
    });
  });

  describe('requireUnlockedExistingPeriod', () => {
    it('returns unlocked period', () => {
      const p = period(1, 100, 200, false);
      getPeriod.mockReturnValue(p);
      expect(requireUnlockedExistingPeriod(1)).toEqual(p);
    });

    it('throws 423 for locked period', () => {
      getPeriod.mockReturnValue(period(1, 100, 200, true));
      expect(() => requireUnlockedExistingPeriod(1)).toThrow(ApiRouteError);
      try {
        requireUnlockedExistingPeriod(1);
      } catch (e) {
        expect((e as ApiRouteError).status).toBe(423);
        expect((e as ApiRouteError).message).toBe(LOCKED_PERIOD_ERROR_MESSAGE);
      }
    });

    it('throws 404 when period not found', () => {
      getPeriod.mockReturnValue(undefined);
      expect(() => requireUnlockedExistingPeriod(999)).toThrow(ApiRouteError);
      try {
        requireUnlockedExistingPeriod(999);
      } catch (e) {
        expect((e as ApiRouteError).status).toBe(404);
      }
    });
  });

  describe('requireUnlockedTargetPeriod', () => {
    it('uses period matching date when available', () => {
      const target = period(2, 200, 300, false);
      getPeriods.mockReturnValue([period(1, 100, 199), target]);
      getPeriod.mockReturnValue(period(1, 100, 199));
      expect(requireUnlockedTargetPeriod(1, 250)).toEqual(target);
    });

    it('falls back to periodId when no period matches date', () => {
      const fallback = period(1, 100, 199, false);
      getPeriods.mockReturnValue([fallback]);
      getPeriod.mockReturnValue(fallback);
      expect(requireUnlockedTargetPeriod(1, 999)).toEqual(fallback);
    });
  });

  describe('requireUnlockedDocumentPeriod', () => {
    it('returns unlocked period for document', () => {
      const p = period(1, 100, 200, false);
      getPeriod.mockReturnValue(p);
      expect(
        requireUnlockedDocumentPeriod(
          { period_id: 1 } as import('@/lib/types').Document,
        ),
      ).toEqual(p);
    });

    it('throws for locked period', () => {
      getPeriod.mockReturnValue(period(1, 100, 200, true));
      expect(() =>
        requireUnlockedDocumentPeriod(
          { period_id: 1 } as import('@/lib/types').Document,
        ),
      ).toThrow(ApiRouteError);
    });
  });

  describe('requireUnlockedDocumentPeriodById', () => {
    it('resolves document then checks period', () => {
      const doc = { id: 10, period_id: 1 };
      const p = period(1, 100, 200, false);
      getDocument.mockReturnValue(doc);
      getPeriod.mockReturnValue(p);
      expect(requireUnlockedDocumentPeriodById(10)).toEqual(p);
    });

    it('throws when document not found', () => {
      getDocument.mockReturnValue(undefined);
      expect(() => requireUnlockedDocumentPeriodById(999)).toThrow(
        ApiRouteError,
      );
    });
  });

  describe('requireUnlockedEntryPeriod', () => {
    it('resolves entry -> document -> period', () => {
      const doc = { id: 10, period_id: 1 };
      const p = period(1, 100, 200, false);
      getDocument.mockReturnValue(doc);
      getPeriod.mockReturnValue(p);
      expect(
        requireUnlockedEntryPeriod(
          { document_id: 10 } as import('@/lib/types').Entry,
        ),
      ).toEqual(p);
    });

    it('throws when document for entry not found', () => {
      getDocument.mockReturnValue(undefined);
      expect(() =>
        requireUnlockedEntryPeriod(
          { document_id: 999 } as import('@/lib/types').Entry,
        ),
      ).toThrow(ApiRouteError);
    });
  });

  describe('requireUnlockedEntryPeriodById', () => {
    it('resolves entry by id then checks period', () => {
      const e = { id: 5, document_id: 10 };
      const doc = { id: 10, period_id: 1 };
      const p = period(1, 100, 200, false);
      getEntry.mockReturnValue(e);
      getDocument.mockReturnValue(doc);
      getPeriod.mockReturnValue(p);
      expect(requireUnlockedEntryPeriodById(5)).toEqual(p);
    });

    it('throws when entry not found', () => {
      getEntry.mockReturnValue(undefined);
      expect(() => requireUnlockedEntryPeriodById(999)).toThrow(ApiRouteError);
    });
  });

  describe('requireUnlockedBankStatementEntryPeriod', () => {
    it('resolves period from bank statement entry date', () => {
      const bse = { id: 1, entry_date: 150 };
      const p = period(1, 100, 200, false);
      getBankStatementEntry.mockReturnValue(bse);
      getPeriods.mockReturnValue([p]);
      expect(requireUnlockedBankStatementEntryPeriod(1)).toEqual(p);
    });

    it('throws when bank statement entry not found', () => {
      getBankStatementEntry.mockReturnValue(undefined);
      expect(() => requireUnlockedBankStatementEntryPeriod(999)).toThrow(
        ApiRouteError,
      );
    });
  });

  describe('requireUnlockedBankStatementPeriod', () => {
    it('resolves period from bank statement date range', () => {
      const bs = { id: 1, period_start: 100, period_end: 200 };
      const p = period(1, 50, 250, false);
      getBankStatement.mockReturnValue(bs);
      getPeriods.mockReturnValue([p]);
      expect(requireUnlockedBankStatementPeriod(1)).toEqual(p);
    });

    it('throws when bank statement not found', () => {
      getBankStatement.mockReturnValue(undefined);
      expect(() => requireUnlockedBankStatementPeriod(999)).toThrow(
        ApiRouteError,
      );
    });

    it('throws when period for bank statement not found', () => {
      getBankStatement.mockReturnValue({
        id: 1,
        period_start: 100,
        period_end: 200,
      });
      getPeriods.mockReturnValue([]);
      expect(() => requireUnlockedBankStatementPeriod(1)).toThrow(
        ApiRouteError,
      );
    });
  });
});
