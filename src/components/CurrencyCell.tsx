import { formatCurrency } from '@/lib/accounting';

interface CurrencyCellProps {
  amount: number;
  className?: string;
}

export default function CurrencyCell({
  amount,
  className = '',
}: CurrencyCellProps) {
  const isNegative = amount < 0;
  return (
    <span
      className={`font-mono tabular-nums ${
        isNegative ? 'text-red-400' : 'text-gray-200'
      } ${className}`}
    >
      {formatCurrency(amount)}
    </span>
  );
}
