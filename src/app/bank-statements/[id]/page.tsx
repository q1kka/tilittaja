import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  getBankStatement,
  getBankStatementEntries,
  getAccounts,
  getDocuments,
  getEntriesForPeriod,
  getDocumentReceiptLinks,
  getPeriods,
  getSettings,
  requireCurrentDataSource,
  runWithResolvedDb,
} from '@/lib/db';
import { formatCurrency, periodLabel } from '@/lib/accounting';
import { buildPdfPreviewSrc } from '@/lib/pdf-preview';
import { resolveBankStatementPdfAbsolutePath } from '@/lib/receipt-pdfs';
import {
  resolveDocumentReceiptsForSource,
  buildEntryDescriptionsByDocumentId,
} from '@/lib/receipt-resolution';
import { notFound } from 'next/navigation';
import BankStatementEntries from '@/components/BankStatementEntries';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BankStatementDetailPage({ params }: PageProps) {
  const { id } = await params;
  const statementId = Number(id);
  const statement = await runWithResolvedDb(() => getBankStatement(statementId));

  if (!statement) {
    notFound();
  }

  const { entries, accounts, settings, periods } = await runWithResolvedDb(
    () => ({
      entries: getBankStatementEntries(statementId),
      accounts: getAccounts(),
      settings: getSettings(),
      periods: getPeriods(),
    }),
  );
  const currentPeriod =
    periods.find((period) => period.id === settings.current_period_id) ??
    periods[0];
  const { documents, documentEntries, manualReceiptLinks } =
    await runWithResolvedDb(() => {
      const currentDocuments = getDocuments(settings.current_period_id);
      return {
        documents: currentDocuments,
        documentEntries: getEntriesForPeriod(settings.current_period_id),
        manualReceiptLinks: getDocumentReceiptLinks(
          currentDocuments.map((doc) => doc.id),
        ),
      };
    });
  const periodLocked = currentPeriod?.locked ?? false;

  const firstDescriptionByDocumentId = new Map<number, string>();
  for (const entry of documentEntries) {
    if (!firstDescriptionByDocumentId.has(entry.document_id)) {
      firstDescriptionByDocumentId.set(entry.document_id, entry.description);
    }
  }

  const entryDescriptionsByDocumentId =
    buildEntryDescriptionsByDocumentId(documentEntries);

  const totalPano = entries
    .filter((e) => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalOtto = entries
    .filter((e) => e.amount < 0)
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  const source = await requireCurrentDataSource();
  const receiptMap = resolveDocumentReceiptsForSource({
    source,
    documents,
    entryDescriptionsByDocumentId,
    manualReceiptLinks,
  });
  const hasStatementPdf = Boolean(
    statement.source_file &&
    resolveBankStatementPdfAbsolutePath(source, statement.source_file),
  );
  const statementPdfSrc = hasStatementPdf
    ? buildPdfPreviewSrc(`/api/bank-statements/pdf?statementId=${statementId}`)
    : null;

  return (
    <div className="max-w-[1800px] p-5">
      <Link
        href="/bank-statements"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Takaisin tilioteisiin
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold mb-2">
            Tiliote
          </p>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            Tiliote {periodLabel(statement.period_start, statement.period_end)}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {statement.account_number} {statement.account_name} &middot;{' '}
            {statement.iban}
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="text-text-secondary">
            Käsitelty: {statement.processed_count} / {statement.entry_count}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(540px,0.9fr)]">
        <div className="min-w-0">
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 2xl:grid-cols-4">
            <div className="bg-surface-2/50 border border-border-subtle rounded-xl p-4">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Alkusaldo
              </div>
              <div className="text-lg font-mono text-text-primary tabular-nums">
                {formatCurrency(statement.opening_balance)}
              </div>
            </div>
            <div className="bg-surface-2/50 border border-border-subtle rounded-xl p-4">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Panot
              </div>
              <div className="text-lg font-mono text-emerald-400 tabular-nums">
                +{formatCurrency(totalPano)}
              </div>
            </div>
            <div className="bg-surface-2/50 border border-border-subtle rounded-xl p-4">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Otot
              </div>
              <div className="text-lg font-mono text-rose-400 tabular-nums">
                -{formatCurrency(totalOtto)}
              </div>
            </div>
            <div className="bg-surface-2/50 border border-border-subtle rounded-xl p-4">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-1">
                Loppusaldo
              </div>
              <div className="text-lg font-mono text-text-primary tabular-nums">
                {formatCurrency(statement.closing_balance)}
              </div>
            </div>
          </div>

          <BankStatementEntries
            statementId={statementId}
            periodId={settings.current_period_id}
            periodLocked={periodLocked}
            entries={entries.map((e) => ({
              id: e.id,
              entry_date: e.entry_date,
              counterparty: e.counterparty,
              reference: e.reference,
              message: e.message,
              payment_type: e.payment_type,
              amount: e.amount,
              document_id: e.document_id,
              document_number: e.document_number,
              counterpart_account_id: e.counterpart_account_id,
              counterpart_account_number: e.counterpart_account_number,
              counterpart_account_name: e.counterpart_account_name,
            }))}
            accounts={accounts.map((a) => ({
              id: a.id,
              number: a.number,
              name: a.name,
              type: a.type,
              vat_percentage: a.vat_percentage,
            }))}
            documents={documents.map((document) => {
              const receipt = receiptMap.get(document.id);
              return {
                id: document.id,
                number: document.number,
                date: document.date,
                description:
                  firstDescriptionByDocumentId.get(document.id) ?? '',
                receiptPath: receipt?.path ?? null,
                receiptSource: receipt?.source ?? null,
              };
            })}
          />
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-2/50">
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div>
                <h2 className="text-sm font-medium text-text-primary">
                  Tiliotteen PDF
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  {statement.source_file ||
                    'Tiliotteelle ei ole tallennettu PDF-tiedostoa.'}
                </p>
              </div>
              {statementPdfSrc && (
                <a
                  href={`/api/bank-statements/pdf?statementId=${statementId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent-light hover:text-accent-light"
                >
                  Avaa PDF
                </a>
              )}
            </div>

            {statementPdfSrc ? (
              <iframe
                title={`Tiliote ${statementId} PDF`}
                src={statementPdfSrc}
                className="h-[75vh] min-h-[640px] w-full bg-white"
              />
            ) : (
              <div className="p-4 text-sm text-yellow-100 bg-yellow-500/10">
                Tiliotteelle ei loydy PDF-tiedostoa esikatseluun.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
