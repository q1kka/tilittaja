import { formatCurrency, getDetailRows } from '@/lib/accounting';
import type { Account, ReportRow } from '@/lib/types';

interface ReportStructureTableProps {
  rows: ReportRow[];
  accounts: Account[];
  balances: Map<number, number>;
}

export function ReportStructureTable({
  rows,
  accounts,
  balances,
}: ReportStructureTableProps) {
  return (
    <div className="bg-surface-2/50 border border-border-subtle rounded-xl overflow-hidden">
      <table className="w-full">
        <tbody>
          {rows.map((row, i) => {
            if (row.type === '-') {
              return (
                <tr key={i}>
                  <td colSpan={2} className="py-2">
                    <div className="border-t border-border-subtle"></div>
                  </td>
                </tr>
              );
            }

            const indent = row.level * 20;
            const isBold = row.style === 'B';
            const isItalic = row.style === 'I';
            const isTotal = row.type === 'S' || row.type === 'T';
            const isHeader = row.type === 'H' || row.type === 'G';

            if (row.type === 'D') {
              const details = getDetailRows(row, accounts, balances);
              return details.map((detail, j) => (
                <tr
                  key={`${i}-${j}`}
                  className="hover:bg-surface-3/40 transition-colors"
                >
                  <td
                    className="px-6 py-1.5 text-sm text-text-secondary"
                    style={{ paddingLeft: `${24 + indent}px` }}
                  >
                    <span className="font-mono text-text-muted mr-3">
                      {detail.accountNumber}
                    </span>
                    {detail.accountName}
                  </td>
                  <td className="px-6 py-1.5 text-sm text-right font-mono text-text-secondary">
                    {formatCurrency(detail.amount)}
                  </td>
                </tr>
              ));
            }

            return (
              <tr
                key={i}
                className={`${isTotal ? 'border-t border-border-subtle/50' : ''}`}
              >
                <td
                  className={`px-6 py-2 text-sm ${
                    isBold ? 'font-semibold' : ''
                  } ${isItalic ? 'italic' : ''} ${
                    isHeader ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                  style={{ paddingLeft: `${24 + indent}px` }}
                >
                  {row.label}
                </td>
                {!isHeader || isTotal ? (
                  <td
                    className={`px-6 py-2 text-sm text-right font-mono ${
                      isBold
                        ? 'font-semibold text-text-primary'
                        : 'text-text-primary'
                    }`}
                  >
                    {row.amount !== undefined ? formatCurrency(row.amount) : ''}
                  </td>
                ) : (
                  <td></td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
