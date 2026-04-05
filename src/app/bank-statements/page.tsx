import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  getBankStatements,
  getPeriods,
  getSettings,
  runWithResolvedDb,
} from '@/lib/db';
import BankStatementsList from '@/components/BankStatementsList';
import { periodLabel } from '@/lib/accounting';
import { type PageSearchParams, resolvePeriodId } from '@/lib/page-params';

export const dynamic = 'force-dynamic';

export default async function BankStatementsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const { settings, periods } = await runWithResolvedDb(() => ({
    settings: getSettings(),
    periods: getPeriods(),
  }));
  const periodId = resolvePeriodId(params, periods, settings.current_period_id);
  const period =
    periods.find((candidate) => candidate.id === periodId) || periods[0];
  const statements = await runWithResolvedDb(() =>
    getBankStatements({
      periodStart: period.start_date,
      periodEnd: period.end_date,
    }),
  );

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">
            Kirjanpito
          </p>
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">
            Tiliotteet
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {periodLabel(period.start_date, period.end_date)} ·{' '}
            {statements.length} tiliotetta
          </p>
        </div>
        <Link
          href="/bank-statements/new"
          className="flex items-center gap-1.5 bg-accent hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Lisää tiliote
        </Link>
      </div>

      <BankStatementsList statements={statements} />
    </div>
  );
}
