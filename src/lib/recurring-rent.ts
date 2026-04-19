import {
  createDocument,
  createEntry,
  getDocuments,
  getEntriesForDocument,
  getPeriod,
} from '@/lib/db/documents';
import { getDb } from '@/lib/db/connection';
import {
  getDocumentMetadataMap,
  getDocumentReceiptLinks,
  setDocumentReceiptLink,
  updateDocumentMetadata,
} from '@/lib/db/metadata-receipts';

const LEASE_KEYWORD = 'vuokrasopimus';

interface JanuaryLeaseRow {
  document_id: number;
  document_number: number;
  document_date: number;
  category: string;
  name: string;
  receipt_path: string | null;
  january_entry_date: number;
  january_amount: number;
  counterparty: string;
}

interface RecurringRentMonthTarget {
  key: string;
  label: string;
  date: number;
  existingDocumentId: number | null;
}

export interface RecurringRentTemplate {
  sourceDocumentId: number;
  sourceDocumentNumber: number;
  sourceDocumentDate: number;
  sourceEntryDate: number;
  category: string;
  name: string;
  receiptPath: string | null;
  contractEndDate: number | null;
  januaryAmounts: number[];
  januaryCounterparties: string[];
  missingMonths: RecurringRentMonthTarget[];
}

export interface RecurringRentPlan {
  periodId: number;
  templateYear: number;
  sourceMonthLabel: string;
  templates: RecurringRentTemplate[];
  totalMissingDocuments: number;
  totalTargetDocuments: number;
}

export interface RecurringRentCreationItem {
  sourceDocumentId: number;
  sourceDocumentNumber: number;
  createdDocumentId: number;
  createdDocumentNumber: number;
  date: number;
  name: string;
}

export interface RecurringRentCreationResult {
  createdDocuments: RecurringRentCreationItem[];
  createdCount: number;
  skippedExistingCount: number;
  templateCount: number;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeReceiptPath(value: string | null | undefined): string | null {
  const trimmed = normalizeText(value);
  return trimmed ? trimmed : null;
}

function monthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('fi-FI', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function parseDateTextToTimestamp(dateText: string): number | null {
  const match = dateText.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const parsed = new Date(year, monthIndex, day).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function extractContractEndDate(template: {
  name: string;
  receiptPath: string | null;
}): number | null {
  const sourceText = [template.name, template.receiptPath ?? ''].join(' ');
  const matches = [...sourceText.matchAll(/(\d{1,2}\.\d{1,2}\.\d{2,4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{2,4})/g)];
  if (matches.length === 0) {
    return null;
  }

  const latestMatch = matches[matches.length - 1];
  return parseDateTextToTimestamp(latestMatch[2]);
}

function resolveTemplateYear(periodId: number): number {
  const period = getPeriod(periodId);
  if (!period) {
    return new Date().getFullYear();
  }

  const startYear = new Date(period.start_date).getFullYear();
  const endYear = new Date(period.end_date).getFullYear();
  for (let year = startYear; year <= endYear; year += 1) {
    const januaryStart = new Date(year, 0, 1).getTime();
    const januaryEnd = new Date(year, 1, 1).getTime();
    if (period.start_date < januaryEnd && period.end_date >= januaryStart) {
      return year;
    }
  }

  return endYear;
}

function getJanuaryLeaseRows(periodId: number): JanuaryLeaseRow[] {
  const year = resolveTemplateYear(periodId);
  const januaryStart = new Date(year, 0, 1).getTime();
  const februaryStart = new Date(year, 1, 1).getTime();

  return getDb()
    .prepare(
      `SELECT d.id as document_id,
              d.number as document_number,
              d.date as document_date,
              COALESCE(dm.category, '') as category,
              COALESCE(dm.name, '') as name,
              NULLIF(COALESCE(drl.pdf_path, ''), '') as receipt_path,
              bse.entry_date as january_entry_date,
              bse.amount as january_amount,
              COALESCE(bse.counterparty, '') as counterparty
       FROM bank_statement_entry bse
       JOIN document d ON d.id = bse.document_id
       LEFT JOIN document_metadata dm ON dm.document_id = d.id
       LEFT JOIN document_receipt_link drl ON drl.document_id = d.id
       WHERE bse.entry_date >= ?
         AND bse.entry_date < ?
         AND bse.amount > 0
         AND (
           LOWER(COALESCE(dm.name, '')) LIKE ?
           OR LOWER(COALESCE(drl.pdf_path, '')) LIKE ?
         )
       ORDER BY bse.entry_date ASC, d.id ASC`,
    )
    .all(
      januaryStart,
      februaryStart,
      `%${LEASE_KEYWORD}%`,
      `%${LEASE_KEYWORD}%`,
    ) as JanuaryLeaseRow[];
}

function buildTargetMonthDate(sourceEntryDate: number, year: number, monthIndex: number): number {
  const sourceDate = new Date(sourceEntryDate);
  const sourceDay = sourceDate.getDate();
  const monthLastDay = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(sourceDay, monthLastDay)).getTime();
}

function isDocumentMatchForTemplate(
  template: Pick<RecurringRentTemplate, 'category' | 'name' | 'receiptPath'>,
  candidate: {
    category: string;
    name: string;
    receiptPath: string | null;
  },
): boolean {
  if (normalizeText(template.name) !== normalizeText(candidate.name)) {
    return false;
  }

  if (normalizeText(template.category) !== normalizeText(candidate.category)) {
    return false;
  }

  const templateReceipt = normalizeReceiptPath(template.receiptPath);
  const candidateReceipt = normalizeReceiptPath(candidate.receiptPath);

  if (templateReceipt) {
    return candidateReceipt === templateReceipt;
  }

  return true;
}

function buildPlan(periodId: number): RecurringRentPlan {
  const templateRows = getJanuaryLeaseRows(periodId);
  const year = resolveTemplateYear(periodId);
  const documents = getDocuments(periodId);
  const metadataMap = getDocumentMetadataMap(documents.map((document) => document.id));
  const receiptLinkMap = getDocumentReceiptLinks(documents.map((document) => document.id));
  const templateMap = new Map<number, RecurringRentTemplate>();
  const period = getPeriod(periodId);

  templateRows.forEach((row) => {
    const current = templateMap.get(row.document_id);
    if (current) {
      current.sourceEntryDate = Math.min(current.sourceEntryDate, row.january_entry_date);
      current.januaryAmounts.push(row.january_amount);
      if (
        row.counterparty &&
        !current.januaryCounterparties.includes(row.counterparty)
      ) {
        current.januaryCounterparties.push(row.counterparty);
      }
      return;
    }

    templateMap.set(row.document_id, {
      sourceDocumentId: row.document_id,
      sourceDocumentNumber: row.document_number,
      sourceDocumentDate: row.document_date,
      sourceEntryDate: row.january_entry_date,
      category: normalizeText(row.category) || 'MU',
      name: normalizeText(row.name),
      receiptPath: normalizeReceiptPath(row.receipt_path),
      contractEndDate: extractContractEndDate({
        name: normalizeText(row.name),
        receiptPath: normalizeReceiptPath(row.receipt_path),
      }),
      januaryAmounts: [row.january_amount],
      januaryCounterparties: row.counterparty ? [row.counterparty] : [],
      missingMonths: [],
    });
  });

  const targetTemplates = [...templateMap.values()].sort((left, right) => {
    return left.name.localeCompare(right.name, 'fi');
  });
  let totalTargetDocuments = 0;

  targetTemplates.forEach((template) => {
    for (let monthIndex = 1; monthIndex < 12; monthIndex += 1) {
      const targetDate = buildTargetMonthDate(
        template.sourceEntryDate,
        year,
        monthIndex,
      );
      if (
        period &&
        (targetDate < period.start_date || targetDate > period.end_date)
      ) {
        continue;
      }
      if (template.contractEndDate != null && targetDate > template.contractEndDate) {
        continue;
      }

      totalTargetDocuments += 1;
      const existingDocument = documents.find((document) => {
        if (monthKey(document.date) !== monthKey(targetDate)) {
          return false;
        }

        return isDocumentMatchForTemplate(template, {
          category: metadataMap.get(document.id)?.category ?? '',
          name: metadataMap.get(document.id)?.name ?? '',
          receiptPath: normalizeReceiptPath(receiptLinkMap.get(document.id) ?? null),
        });
      });

      if (!existingDocument) {
        template.missingMonths.push({
          key: monthKey(targetDate),
          label: monthLabel(targetDate),
          date: targetDate,
          existingDocumentId: null,
        });
        continue;
      }
    }
  });

  const plan: RecurringRentPlan = {
    periodId,
    templateYear: year,
    sourceMonthLabel: monthLabel(new Date(year, 0, 1).getTime()),
    templates: targetTemplates,
    totalMissingDocuments: targetTemplates.reduce(
      (sum, template) => sum + template.missingMonths.length,
      0,
    ),
    totalTargetDocuments,
  };

  return plan;
}

export function getRecurringRentPlan(periodId: number): RecurringRentPlan {
  return buildPlan(periodId);
}

export function createRecurringRentDocuments(
  periodId: number,
): RecurringRentCreationResult {
  const plan = buildPlan(periodId);
  const createdDocuments: RecurringRentCreationItem[] = [];
  const db = getDb();

  const createInTransaction = db.transaction(() => {
    plan.templates.forEach((template) => {
      const sourceEntries = getEntriesForDocument(template.sourceDocumentId);

      template.missingMonths.forEach((monthTarget) => {
        const nextDocument = createDocument(periodId, monthTarget.date);

        sourceEntries.forEach((entry) => {
          createEntry(
            nextDocument.id,
            entry.account_id,
            entry.debit,
            entry.amount,
            entry.description,
            entry.row_number,
          );
        });

        updateDocumentMetadata(
          nextDocument.id,
          template.category,
          template.name,
        );

        if (template.receiptPath) {
          setDocumentReceiptLink(nextDocument.id, template.receiptPath);
        }

        createdDocuments.push({
          sourceDocumentId: template.sourceDocumentId,
          sourceDocumentNumber: template.sourceDocumentNumber,
          createdDocumentId: nextDocument.id,
          createdDocumentNumber: nextDocument.number,
          date: monthTarget.date,
          name: template.name,
        });
      });
    });
  });

  createInTransaction();

  return {
    createdDocuments,
    createdCount: createdDocuments.length,
    skippedExistingCount: plan.totalTargetDocuments - plan.totalMissingDocuments,
    templateCount: plan.templates.length,
  };
}
