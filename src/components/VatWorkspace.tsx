'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/accounting';
import { getDateInputValue, parseDateInputValue } from '@/lib/date-input';
import { createVatSettlementAction } from '@/actions/app-actions';
import type { VatReport, VatSettlementPreview } from '@/lib/vat-report';
import DeleteDocumentButton from '@/components/DeleteDocumentButton';
import ReceiptAttachmentPanel from '@/components/ReceiptAttachmentPanel';
import type { ReceiptSource } from '@/lib/receipt-pdfs';

interface VatDocumentEntry {
  id: number;
  rowNumber: number;
  description: string;
  debit: boolean;
  amount: number;
  accountNumber: string;
  accountName: string;
}

interface VatDocumentSummary {
  id: number;
  number: number;
  date: number;
  category: string;
  name: string;
  code: string;
  receiptPath: string | null;
  receiptSource: ReceiptSource;
  entries: VatDocumentEntry[];
}

interface Props {
  periodId: number;
  periodLabel: string;
  periodStart: number;
  periodEnd: number;
  reportStartDate: number;
  reportEndDate: number;
  vatReport: VatReport;
  vatSettlement: VatSettlementPreview | null;
  vatDocuments: VatDocumentSummary[];
}

export default function VatWorkspace({
  periodId,
  periodLabel,
  periodStart,
  periodEnd,
  reportStartDate,
  reportEndDate,
  vatReport,
  vatSettlement,
  vatDocuments,
}: Props) {
  const sectionEyebrowClass =
    'mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted';
  const fieldLabelClass =
    'mb-2 block text-[11px] font-medium uppercase tracking-[0.15em] text-text-muted';
  const summaryLabelClass =
    'text-[11px] font-medium uppercase tracking-[0.15em] text-text-muted';
  const tableHeadClass =
    'px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted';
  const tableHeadRightClass = `${tableHeadClass} text-right`;

  const router = useRouter();
  const searchParams = useSearchParams();
  const [vatDate, setVatDate] = useState(() =>
    getDateInputValue(reportEndDate),
  );

  const updateDateRange = useCallback(
    (newStart: number | null, newEnd: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      const effectiveStart = newStart ?? reportStartDate;
      const effectiveEnd = newEnd ?? reportEndDate;

      if (effectiveStart !== periodStart) {
        params.set('startDate', String(effectiveStart));
      } else {
        params.delete('startDate');
      }
      if (effectiveEnd !== periodEnd) {
        params.set('endDate', String(effectiveEnd));
      } else {
        params.delete('endDate');
      }
      router.push(`?${params.toString()}`);
    },
    [
      searchParams,
      periodStart,
      periodEnd,
      reportStartDate,
      reportEndDate,
      router,
    ],
  );
  const [vatSaving, setVatSaving] = useState(false);
  const [vatError, setVatError] = useState('');
  const [vatCreatedDocumentId, setVatCreatedDocumentId] = useState<
    number | null
  >(null);

  const handleCreateVatSettlement = async () => {
    if (!vatSettlement) return;

    setVatSaving(true);
    setVatError('');

    try {
      const date = new Date(vatDate).getTime();
      if (!Number.isFinite(date)) {
        throw new Error('Valitse ALV-ilmoitukselle päiväys.');
      }

      const data = await createVatSettlementAction({ periodId, date });
      setVatCreatedDocumentId(data.id);
      router.refresh();
    } catch (error) {
      setVatError(error instanceof Error ? error.message : 'Tuntematon virhe');
    } finally {
      setVatSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] p-5">
      <div className="mb-6">
        <p className={sectionEyebrowClass}>
          Kirjanpito
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Arvonlisävero
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{periodLabel}</p>
      </div>

      <div className="mb-6 card-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(2,minmax(0,220px))_auto] xl:items-end">
            <div>
              <label htmlFor="vat-start-date" className={fieldLabelClass}>
                Ilmoitusjakson alku
              </label>
              <input
                id="vat-start-date"
                type="date"
                defaultValue={getDateInputValue(reportStartDate)}
                min={getDateInputValue(periodStart)}
                max={getDateInputValue(periodEnd)}
                onChange={(e) => {
                  const ts = parseDateInputValue(e.target.value);
                  if (ts != null) updateDateRange(ts, null);
                }}
                className="w-full rounded-lg border border-border-subtle bg-surface-0/60 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <label htmlFor="vat-end-date" className={fieldLabelClass}>
                Ilmoitusjakson loppu
              </label>
              <input
                id="vat-end-date"
                type="date"
                defaultValue={getDateInputValue(reportEndDate)}
                min={getDateInputValue(periodStart)}
                max={getDateInputValue(periodEnd)}
                onChange={(e) => {
                  const ts = parseDateInputValue(e.target.value);
                  if (ts != null) updateDateRange(null, ts);
                }}
                className="w-full rounded-lg border border-border-subtle bg-surface-0/60 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
              />
            </div>
            <div>
              <div className={fieldLabelClass}>Nopea rajaus</div>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 12].map((months) => {
                  const label =
                    months === 1
                      ? 'Kuukausi'
                      : months === 3
                        ? 'Neljännes'
                        : 'Koko kausi';
                  return (
                    <button
                      key={months}
                      type="button"
                      onClick={() => {
                        if (months === 12) {
                          updateDateRange(periodStart, periodEnd);
                        } else {
                          const end = new Date(reportStartDate);
                          end.setUTCMonth(end.getUTCMonth() + months);
                          end.setUTCDate(end.getUTCDate() - 1);
                          const endTs = end.getTime();
                          updateDateRange(
                            reportStartDate,
                            Math.min(endTs, periodEnd),
                          );
                        }
                      }}
                      className="rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-1 hover:text-text-primary"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-0/35 px-4 py-3 lg:min-w-[240px]">
            <div className={summaryLabelClass}>Valittu aikavali</div>
            <div className="mt-1 text-sm font-medium text-text-primary">
              {formatDate(reportStartDate)} – {formatDate(reportEndDate)}
            </div>
          </div>
        </div>
      </div>

      <section className="card-panel p-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={sectionEyebrowClass}>
                ALV-ilmoitus
              </p>
              <h2 className="text-lg font-semibold tracking-tight text-text-primary">
                ALV-ilmoitus ja tilitys
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">
                Muodosta ALV-tositteesta nollausvienti, joka siirtää ALV-tilien
                saldot yhdelle tilitysvelan tai saamisen tilille.
              </p>
            </div>
            {vatSettlement ? (
              <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                {vatSettlement.settlementDebit ? 'Saatavaa' : 'Maksettavaa'}{' '}
                <span className="font-mono font-semibold">
                  {formatCurrency(vatSettlement.settlementAmount)}
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Ei siirrettävää ALV-saldoa
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-border-subtle bg-surface-1/70 px-4 py-3">
              <div className={summaryLabelClass}>
                Verollinen myynti
              </div>
              <div className="mt-1 font-mono text-xl text-text-primary">
                {formatCurrency(vatReport.totals.salesBase)}
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-1/70 px-4 py-3">
              <div className={summaryLabelClass}>
                Verolliset ostot
              </div>
              <div className="mt-1 font-mono text-xl text-text-primary">
                {formatCurrency(vatReport.totals.purchaseBase)}
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-1/70 px-4 py-3">
              <div className={summaryLabelClass}>
                Suoritettava ALV
              </div>
              <div className="mt-1 font-mono text-xl text-text-primary">
                {formatCurrency(vatReport.totals.outputVat)}
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-1/70 px-4 py-3">
              <div className={summaryLabelClass}>
                Vähennettävä ALV
              </div>
              <div className="mt-1 font-mono text-xl text-text-primary">
                {formatCurrency(vatReport.totals.deductibleVat)}
              </div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-1/70 px-4 py-3">
              <div className={summaryLabelClass}>
                {vatReport.totals.payableVat > 0 ? 'Maksettavaa' : 'Saatavaa'}
              </div>
              <div className="mt-1 font-mono text-xl text-text-primary">
                {formatCurrency(
                  vatReport.totals.payableVat > 0
                    ? vatReport.totals.payableVat
                    : vatReport.totals.receivableVat,
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-lg border border-border-subtle bg-surface-1/60 overflow-hidden">
              <div className="border-b border-border-subtle px-4 py-3">
                <h3 className="text-base font-semibold text-text-primary">
                  Tilit, jotka nollataan
                </h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Muodostuksessa jokainen ALV-tili nollataan ja nettosumma
                  kirjataan tilille{' '}
                  <span className="font-mono text-text-primary">
                    {vatSettlement?.settlementAccountNumber ?? '2939'}
                  </span>{' '}
                  {vatSettlement
                    ? ` ${vatSettlement.settlementAccountName}`
                    : ''}
                  .
                </p>
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[520px]">
                  <thead className="bg-surface-1/80">
                    <tr className="border-b border-border-subtle/70">
                      <th className={tableHeadClass}>
                        Tili
                      </th>
                      <th className={tableHeadClass}>
                        Nimi
                      </th>
                      <th className={tableHeadRightClass}>
                        Nykyinen saldo
                      </th>
                      <th className={tableHeadRightClass}>
                        Nollausvienti
                      </th>
                    </tr>
                  </thead>
                  <tbody className="table-divide">
                    {vatSettlement?.sourceLines.map((line) => (
                      <tr key={line.accountId}>
                        <td className="px-3 py-1.5 font-mono text-xs text-accent-light">
                          {line.accountNumber}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-text-secondary">
                          {line.accountName}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs text-text-primary">
                          {formatCurrency(line.balance)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs text-text-primary">
                          {line.debit ? 'Debet ' : 'Kredit '}
                          {formatCurrency(line.amount)}
                        </td>
                      </tr>
                    )) ?? null}
                    {!vatSettlement ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-8 text-center text-xs text-text-muted"
                        >
                          ALV-tilit ovat jo nollassa valitulla tilikaudella.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-1/60 p-4">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-text-primary">
                  Muodosta ALV-tosite
                </h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Tosite siirtää ALV-tilien saldon tilille{' '}
                  <span className="font-mono text-text-primary">
                    {vatSettlement?.settlementAccountNumber ?? '2939'}
                  </span>
                  .
                </p>
              </div>

              <label className="relative mb-4 block text-[11px] font-medium uppercase tracking-[0.15em] text-text-muted">
                <span className="mb-2 block">
                  Päiväys
                </span>
                <input
                  type="date"
                  value={vatDate}
                  onChange={(event) => setVatDate(event.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface-0/60 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent/40 focus:ring-1 focus:ring-accent/20"
                />
                <CalendarDays className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-text-muted" />
              </label>

              {vatSettlement ? (
                <div className="mb-4 rounded-lg border border-border-subtle bg-surface-0/40 px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-text-secondary">
                      {vatSettlement.settlementDebit
                        ? 'Saaminen tilille'
                        : 'Velka tilille'}
                    </span>
                    <span className="font-mono text-text-primary">
                      {formatCurrency(vatSettlement.settlementAmount)}
                    </span>
                  </div>
                  <div className="mt-1 text-text-muted">
                    {vatSettlement.settlementAccountNumber}{' '}
                    {vatSettlement.settlementAccountName}
                  </div>
                </div>
              ) : null}

              {vatError ? (
                <div className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-rose-300">
                  {vatError}
                </div>
              ) : null}

              {vatCreatedDocumentId != null ? (
                <div className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  ALV-tosite luotu ja lisätty alla olevaan laadittujen
                  ilmoitusten listaan.
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleCreateVatSettlement()}
                disabled={vatSaving || !vatSettlement}
                className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-surface-3 disabled:text-text-muted"
              >
                {vatSaving ? 'Muodostetaan...' : 'Muodosta ALV-ilmoitus'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 card-panel">
        <div className="border-b border-border-subtle px-5 py-4">
          <p className={sectionEyebrowClass}>ALV-tositteet</p>
          <h2 className="text-lg font-semibold text-text-primary">
            Laaditut ALV-ilmoitukset
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Valitulle tilikaudelle jo muodostetut ALV-tositteet.
          </p>
        </div>

        <div className="space-y-4 p-5">
          {vatDocuments.map((document) => (
            <div
              key={document.id}
              className="overflow-hidden rounded-xl border border-border-subtle bg-surface-1/60"
            >
              <div className="border-b border-border-subtle px-4 py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-text-primary">
                      {document.name || 'ALV-ilmoitus'}
                    </div>
                    <div className="mt-1 text-sm text-text-secondary">
                      Tosite{' '}
                      <span className="font-mono text-accent-light">
                        {document.number}
                      </span>
                      {' · '}
                      {formatDate(document.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={summaryLabelClass}>
                      {document.entries.length} vientiriviä
                    </span>
                    <DeleteDocumentButton
                      documentId={document.id}
                      documentCode={`${document.number}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-700/40 bg-red-900/20 px-2.5 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/40 disabled:opacity-50"
                    >
                      Poista
                    </DeleteDocumentButton>
                  </div>
                </div>
              </div>

              <div className="xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
                <div className="min-w-0">
                  <div className="overflow-auto">
                    <table className="w-full min-w-[760px]">
                      <thead className="bg-surface-1/80">
                        <tr className="border-b border-border-subtle/70">
                          <th className={tableHeadClass}>
                            Rivi
                          </th>
                          <th className={tableHeadClass}>
                            Tili
                          </th>
                          <th className={tableHeadClass}>
                            Kuvaus
                          </th>
                          <th className={tableHeadRightClass}>
                            Debet
                          </th>
                          <th className={tableHeadRightClass}>
                            Kredit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="table-divide">
                        {document.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="px-3 py-1.5 text-xs font-mono text-text-muted">
                              {entry.rowNumber}
                            </td>
                            <td className="px-3 py-1.5 text-xs text-text-secondary">
                              <span className="mr-2 font-mono text-accent-light">
                                {entry.accountNumber}
                              </span>
                              {entry.accountName}
                            </td>
                            <td className="px-3 py-1.5 text-xs text-text-primary">
                              {entry.description || 'ALV-ilmoitus'}
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs font-mono text-text-primary">
                              {entry.debit ? formatCurrency(entry.amount) : ''}
                            </td>
                            <td className="px-3 py-1.5 text-right text-xs font-mono text-text-primary">
                              {entry.debit ? '' : formatCurrency(entry.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-border-subtle px-4 py-4 xl:border-l xl:border-t-0">
                  <ReceiptAttachmentPanel
                    key={`${document.id}:${document.receiptPath ?? 'none'}`}
                    documentId={document.id}
                    documentNumber={document.number}
                    documentCode={document.code}
                    initialReceiptPath={document.receiptPath}
                    initialReceiptSource={document.receiptSource}
                    attachmentLabel="Liitetty ilmoitus"
                    attachButtonLabel="Liitä ilmoitus PDF"
                    replaceButtonLabel="Vaihda ilmoitus PDF"
                    emptyStateText="Tällä ALV-ilmoituksella ei vielä ole liitettä. Lisää valmis OmaVero-PDF kohdasta `Liitä ilmoitus PDF`."
                    modalTitle={`Lisää PDF ilmoitukselle ${document.code}`}
                  />
                </div>
              </div>
            </div>
          ))}

          {vatDocuments.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">
              Ei laadittuja ALV-ilmoituksia tällä tilikaudella.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
