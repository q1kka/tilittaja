'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitMerge, Loader2, Trash2 } from 'lucide-react';
import { formatCurrency, periodLabel } from '@/lib/accounting';
import {
  deleteBankStatementAction,
  mergeBankStatementsAction,
} from '@/actions/app-actions';
import type { BankStatementWithStats } from '@/lib/types';

interface Props {
  statements: BankStatementWithStats[];
}

function getStatus(statement: BankStatementWithStats) {
  const allProcessed =
    statement.entry_count > 0 &&
    statement.processed_count === statement.entry_count;
  const noneProcessed = statement.processed_count === 0;

  if (statement.entry_count === 0) {
    return <span className="text-xs text-text-muted">Tyhjä</span>;
  }

  if (allProcessed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-green-400/10 px-2 py-0.5 rounded-full">
        Valmis
      </span>
    );
  }

  if (noneProcessed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
        Käsittelemätön
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent bg-blue-400/10 px-2 py-0.5 rounded-full">
      {statement.processed_count}/{statement.entry_count}
    </span>
  );
}

export default function BankStatementsList({ statements }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [masterStatementId, setMasterStatementId] = useState<number | null>(
    null,
  );
  const [isMerging, setIsMerging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionWarning, setActionWarning] = useState('');

  const selectedStatements = useMemo(
    () => statements.filter((statement) => selectedIds.has(statement.id)),
    [selectedIds, statements],
  );

  const allSelected =
    statements.length > 0 &&
    statements.every((statement) => selectedIds.has(statement.id));
  const hasSelection = selectedStatements.length > 0;
  const hasMergeSelection = selectedStatements.length >= 2;
  const selectionSharesAccount =
    selectedStatements.length < 2 ||
    selectedStatements.every(
      (statement) =>
        statement.account_id === selectedStatements[0]?.account_id &&
        statement.iban === selectedStatements[0]?.iban,
    );

  useEffect(() => {
    setSelectedIds((current) => {
      const validIds = new Set(statements.map((statement) => statement.id));
      const next = new Set([...current].filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [statements]);

  useEffect(() => {
    if (selectedStatements.length < 2) {
      setMasterStatementId(null);
      return;
    }

    if (
      masterStatementId == null ||
      !selectedStatements.some(
        (statement) => statement.id === masterStatementId,
      )
    ) {
      setMasterStatementId(selectedStatements[0]?.id ?? null);
    }
  }, [masterStatementId, selectedStatements]);

  const toggleSelection = (statementId: number) => {
    setActionError('');
    setActionWarning('');
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(statementId)) {
        next.delete(statementId);
      } else {
        next.add(statementId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setActionError('');
    setActionWarning('');
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(statements.map((statement) => statement.id)));
  };

  const handleMerge = async () => {
    if (!hasMergeSelection || masterStatementId == null) {
      setActionError('Valitse vähintään kaksi tiliotetta ja master-tiliote.');
      return;
    }

    if (!selectionSharesAccount) {
      setActionError('Vain saman pankkitilin tiliotteita voi yhdistää.');
      return;
    }

    const mergedStatements = selectedStatements.filter(
      (statement) => statement.id !== masterStatementId,
    );
    const masterStatement = selectedStatements.find(
      (statement) => statement.id === masterStatementId,
    );

    if (!masterStatement || mergedStatements.length === 0) {
      setActionError(
        'Valitse yksi master ja vähintään yksi yhdistettävä tiliote.',
      );
      return;
    }

    const confirmMessage = [
      `Yhdistetäänkö ${mergedStatements.length} tiliotetta masteriin ${periodLabel(
        masterStatement.period_start,
        masterStatement.period_end,
      )}?`,
      '',
      'Yhdistettävien tiliotteiden kirjaukset siirretään masteriin ja niiden PDF:t poistetaan, jos ne löytyvät.',
    ].join('\n');

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsMerging(true);
    setActionError('');
    setActionWarning('');

    try {
      const payload = await mergeBankStatementsAction({
        masterStatementId,
        mergedStatementIds: mergedStatements.map((statement) => statement.id),
      });

      setSelectedIds(new Set());
      setMasterStatementId(null);
      setActionWarning(payload?.warnings?.join(' ') || '');
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Tiliotteiden yhdistäminen epäonnistui.',
      );
    } finally {
      setIsMerging(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!hasSelection) {
      setActionError('Valitse vähintään yksi tiliote poistettavaksi.');
      return;
    }

    const confirmMessage = [
      `Poistetaanko ${selectedStatements.length} valittua tiliotetta listasta?`,
      '',
      'Valittujen tiliotteiden rivit poistetaan, mutta tositteita ei poisteta.',
    ].join('\n');

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    setActionError('');
    setActionWarning('');

    try {
      for (const statement of selectedStatements) {
        await deleteBankStatementAction(statement.id);
      }

      setSelectedIds(new Set());
      setMasterStatementId(null);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Tiliotteiden poisto epäonnistui.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {(hasSelection || actionError || actionWarning) && (
        <div className="mb-4 rounded-xl border border-border-subtle bg-surface-2/50 p-4">
          {actionError && (
            <div className="mb-3 rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-rose-300">
              {actionError}
            </div>
          )}
          {actionWarning && (
            <div className="mb-3 rounded-lg border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-200">
              {actionWarning}
            </div>
          )}

          {hasSelection && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {selectedStatements.length} tiliotetta valittu
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Poista valitut kerralla tai yhdistä ne yhdeksi tiliotteeksi.
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting || isMerging}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-text-muted"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Poista valitut
                  </button>
                  {hasMergeSelection && (
                    <button
                      type="button"
                      onClick={handleMerge}
                      disabled={
                        isMerging || isDeleting || !selectionSharesAccount
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-text-muted"
                    >
                      {isMerging ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <GitMerge className="h-4 w-4" />
                      )}
                      Yhdistä valitut
                    </button>
                  )}
                </div>
              </div>

              {hasMergeSelection && !selectionSharesAccount && (
                <div className="rounded-lg border border-red-700/50 bg-red-900/20 px-4 py-3 text-sm text-rose-300">
                  Valitut tiliotteet eivät kuulu samalle pankkitilille, joten
                  niitä ei voi yhdistää.
                </div>
              )}

              {hasMergeSelection && (
                <div className="space-y-3">
                  <div className="text-xs text-text-secondary">
                    Valitse mikä tiliote jää masteriksi. Muut valitut siirretään
                    siihen.
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {selectedStatements.map((statement) => {
                      const label = periodLabel(
                        statement.period_start,
                        statement.period_end,
                      );
                      return (
                        <label
                          key={statement.id}
                          className="flex items-start gap-3 rounded-lg border border-border-subtle/60 bg-surface-0/40 px-4 py-3 text-sm"
                        >
                          <input
                            type="radio"
                            name="masterStatementId"
                            checked={masterStatementId === statement.id}
                            onChange={() => setMasterStatementId(statement.id)}
                            className="mt-0.5 h-4 w-4"
                          />
                          <span className="min-w-0">
                            <span className="block font-medium text-text-primary">
                              {label}
                            </span>
                            <span className="block text-xs text-text-secondary mt-1">
                              {statement.account_number}{' '}
                              {statement.account_name}
                            </span>
                            <span className="block text-xs text-text-muted mt-1">
                              {statement.entry_count} riviä
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-surface-2/50 border border-border-subtle rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="w-10 px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Valitse kaikki tiliotteet"
                  className="h-4 w-4"
                />
              </th>
              <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Kausi
              </th>
              <th className="text-left text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Pankkitili
              </th>
              <th className="text-right text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Alkusaldo
              </th>
              <th className="text-right text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Loppusaldo
              </th>
              <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Rivit
              </th>
              <th className="text-center text-[10px] font-semibold text-text-muted uppercase tracking-[0.15em] px-3 py-2">
                Tila
              </th>
            </tr>
          </thead>
          <tbody className="table-divide">
            {statements.map((statement) => {
              const statementPeriodLabel = periodLabel(
                statement.period_start,
                statement.period_end,
              );

              return (
                <tr
                  key={statement.id}
                  className="hover:bg-surface-3/40 transition-colors"
                >
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(statement.id)}
                      onChange={() => toggleSelection(statement.id)}
                      aria-label={`Valitse tiliote ${statementPeriodLabel}`}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Link
                      href={`/bank-statements/${statement.id}`}
                      className="text-accent hover:text-accent-light text-xs font-medium"
                    >
                      {statementPeriodLabel}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-text-secondary">
                    <span className="font-mono text-accent/80 text-[11px]">
                      {statement.account_number}
                    </span>{' '}
                    {statement.account_name}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-right font-mono text-text-secondary tabular-nums">
                    {formatCurrency(statement.opening_balance)}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-right font-mono text-text-secondary tabular-nums">
                    {formatCurrency(statement.closing_balance)}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-center text-text-secondary">
                    {statement.entry_count}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {getStatus(statement)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {statements.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">
            Ei tilioteita. Lisää ensimmäinen tiliote.
          </div>
        )}
      </div>
    </div>
  );
}
