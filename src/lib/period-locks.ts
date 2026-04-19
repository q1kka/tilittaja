import type { Document, Entry, Period } from '@/lib/types';
import {
  getDocument,
  getEntry,
  getPeriod,
  getPeriods,
} from '@/lib/db/documents';
import { getBankStatement, getBankStatementEntry } from '@/lib/db/bank-statements';
import { ApiRouteError, requireResource } from '@/lib/api-helpers';

export const LOCKED_PERIOD_ERROR_MESSAGE =
  'Tilikausi on lukittu. Kausi on vain luku -tilassa.';

function requireUnlockedPeriod(
  period: Period | undefined,
  notFoundMessage: string,
): Period {
  const resolvedPeriod = requireResource(period, notFoundMessage);
  if (resolvedPeriod.locked) {
    throw new ApiRouteError(LOCKED_PERIOD_ERROR_MESSAGE, 423);
  }
  return resolvedPeriod;
}

export function resolvePeriodForDate(date: number): Period | undefined {
  return getPeriods().find(
    (period) => period.start_date <= date && period.end_date >= date,
  );
}

export function requireUnlockedExistingPeriod(periodId: number): Period {
  return requireUnlockedPeriod(getPeriod(periodId), 'Tilikautta ei löytynyt');
}

export function requireUnlockedTargetPeriod(
  periodId: number,
  date: number,
): Period {
  return requireUnlockedPeriod(
    resolvePeriodForDate(date) ?? getPeriod(periodId),
    'Tilikautta ei löytynyt',
  );
}

export function requireUnlockedDocumentPeriod(document: Document): Period {
  return requireUnlockedPeriod(
    getPeriod(document.period_id),
    'Tositteen tilikautta ei löytynyt',
  );
}

export function requireUnlockedDocumentPeriodById(documentId: number): Period {
  const document = requireResource(
    getDocument(documentId),
    'Tositetta ei löytynyt',
  );
  return requireUnlockedDocumentPeriod(document);
}

export function requireUnlockedEntryPeriod(entry: Entry): Period {
  const document = requireResource(
    getDocument(entry.document_id),
    'Vientirivin tositetta ei löytynyt',
  );
  return requireUnlockedDocumentPeriod(document);
}

export function requireUnlockedEntryPeriodById(entryId: number): Period {
  const entry = requireResource(getEntry(entryId), 'Vientiriviä ei löytynyt');
  return requireUnlockedEntryPeriod(entry);
}

export function requireUnlockedBankStatementEntryPeriod(
  entryId: number,
): Period {
  const entry = requireResource(
    getBankStatementEntry(entryId),
    'Tilioteriviä ei löytynyt',
  );
  return requireUnlockedPeriod(
    resolvePeriodForDate(entry.entry_date),
    'Tilioterivin tilikautta ei löytynyt',
  );
}

export function requireUnlockedBankStatementPeriod(
  statementId: number,
): Period {
  const statement = requireResource(
    getBankStatement(statementId),
    'Tiliotetta ei löydy',
  );
  return requireUnlockedPeriod(
    getPeriods().find(
      (period) =>
        period.start_date <= statement.period_start &&
        period.end_date >= statement.period_end,
    ),
    'Tiliotteen tilikautta ei löytynyt',
  );
}
