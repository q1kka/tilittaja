import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarRange,
  Database,
  FileText,
  Lock,
  LockOpen,
} from 'lucide-react';
import { getSettings, getPeriods, runWithResolvedDb } from '@/lib/db';
import { periodLabel } from '@/lib/accounting';
import CompanyInfoEditor from '@/components/CompanyInfoEditor';
import PeriodLockToggle from '@/components/PeriodLockToggle';
import { type PageSearchParams } from '@/lib/page-params';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Asetukset – Tilittaja' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const { settings, periods } = await runWithResolvedDb(() => ({
    settings: getSettings(),
    periods: getPeriods(),
  }));
  const rawPeriod = Array.isArray(params.period)
    ? params.period[0]
    : params.period;
  const requestedPeriodId = rawPeriod ? Number(rawPeriod) : NaN;
  const activePeriodId = periods.some(
    (period) => period.id === requestedPeriodId,
  )
    ? requestedPeriodId
    : settings.current_period_id;
  const activePeriod =
    periods.find((period) => period.id === activePeriodId) ??
    periods[0] ??
    null;
  const lockedPeriods = periods.filter((period) => period.locked).length;
  const openPeriods = periods.length - lockedPeriods;

  return (
    <div className="p-5">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
              Järjestelmä
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-text-primary">
              Yrityksen asetukset
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
              Hallitse yrityksen perustietoja ja tilikausia yhdesta paikasta.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/settings/export-import"
              className="inline-flex items-center gap-2 self-start rounded-xl border border-border-subtle bg-surface-0/60 px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-accent/30 hover:text-accent-light"
            >
              Tuonti ja vienti
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/reports/tilinpaatos"
              className="inline-flex items-center gap-2 self-start rounded-xl border border-accent/20 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent-light transition hover:border-accent/40 hover:bg-accent/15"
            >
              Avaa tilinpaatos
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Aktiivinen tilikausi
                </p>
                <p className="mt-2 text-sm font-medium text-text-primary">
                  {activePeriod
                    ? periodLabel(
                        activePeriod.start_date,
                        activePeriod.end_date,
                      )
                    : 'Ei valittua tilikautta'}
                </p>
              </div>
              <CalendarRange className="mt-0.5 h-4 w-4 text-accent" />
            </div>
            <p className="mt-3 text-xs leading-5 text-text-secondary">
              Sivupalkista valittu tilikausi maarittaa mita kautta talla sivulla
              korostetaan.
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Tilikausien tila
                </p>
                <p className="mt-2 text-sm font-medium text-text-primary">
                  {openPeriods} avoinna, {lockedPeriods} lukittu
                </p>
              </div>
              {lockedPeriods > 0 ? (
                <Lock className="mt-0.5 h-4 w-4 text-amber-400" />
              ) : (
                <LockOpen className="mt-0.5 h-4 w-4 text-emerald-400" />
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-text-secondary">
              Lukitse paattyneet tilikaudet, jotta niiden kirjaukset eivat muutu
              vahingossa.
            </p>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-2/70 p-5 shadow-[0_24px_80px_-44px_rgba(0,0,0,0.9)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Tietokanta
                </p>
                <p className="mt-2 text-sm font-medium text-text-primary">
                  Versio {settings.version}
                </p>
              </div>
              <Database className="mt-0.5 h-4 w-4 text-text-secondary" />
            </div>
            <p className="mt-3 text-xs leading-5 text-text-secondary">
              Tekninen versiotieto. Tata ei tarvitse yleensa muuttaa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <section className="rounded-2xl border border-border-subtle bg-surface-2/60 p-6 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.95)] backdrop-blur-sm">
            <CompanyInfoEditor
              name={settings.name}
              businessId={settings.business_id}
            />
          </section>

          <section className="rounded-2xl border border-border-subtle bg-surface-2/60 p-6 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.95)] backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Tilikaudet
                </p>
                <h2 className="mt-2 text-lg font-semibold text-text-primary">
                  Tilikausien hallinta
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Sivupalkista valittu tilikausi on korostettu. Voit lukita tai
                  avata kausia suoraan listasta.
                </p>
              </div>
              <div className="rounded-xl border border-border-subtle bg-surface-0/50 px-3 py-2 text-right">
                <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
                  Kaudet
                </div>
                <div className="mt-1 text-lg font-semibold text-text-primary">
                  {periods.length}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {periods.map((period) => {
                const isCurrent = period.id === activePeriodId;

                return (
                  <div
                    key={period.id}
                    className={`rounded-2xl border px-4 py-4 transition ${
                      isCurrent
                        ? 'border-accent/30 bg-accent/10 shadow-[0_18px_40px_-28px_rgba(217,119,6,0.65)]'
                        : 'border-border-subtle bg-surface-0/35'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-text-primary">
                            {periodLabel(period.start_date, period.end_date)}
                          </p>
                          {isCurrent ? (
                            <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent-light">
                              Aktiivinen
                            </span>
                          ) : null}
                          {period.locked ? (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                              Lukittu
                            </span>
                          ) : (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                              Avoin
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs leading-5 text-text-secondary">
                          {period.locked
                            ? 'Kausi on suojattu muutoksilta.'
                            : 'Kausi on avoinna kirjauksille ja korjauksille.'}
                        </p>
                      </div>

                      <PeriodLockToggle
                        periodId={period.id}
                        locked={period.locked}
                        label={periodLabel(period.start_date, period.end_date)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-border-subtle bg-surface-2/55 p-6 shadow-[0_28px_90px_-54px_rgba(0,0,0,0.95)] backdrop-blur-sm">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-0/35 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                Varmuuskopiointi
              </p>
              <h2 className="mt-2 text-lg font-semibold text-text-primary">
                Tuonti ja vienti
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                Vie koko aktiivinen tietolahde palautettavana ZIP-pakettina tai
                palauta aiempi export takaisin samalle tietolahteelle.
              </p>
            </div>
            <Link
              href="/settings/export-import"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-0/60 px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-accent/30 hover:text-accent-light"
            >
              Avaa vienti ja palautus
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent-light">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  Tilinpaatos ja yhtiokokous
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-text-secondary">
                  Mikroyrityslausuma, hallituksen ehdotus, allekirjoitukset ja
                  kokoustiedot muokataan tilinpaatosraportilla.
                </p>
              </div>
            </div>

            <Link
              href="/reports/tilinpaatos"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-0/60 px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-accent/30 hover:text-accent-light"
            >
              Siirry muokkaamaan
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
