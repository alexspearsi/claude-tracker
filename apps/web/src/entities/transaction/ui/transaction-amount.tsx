import { cn, formatMoney } from '@/shared/lib/utils';
import type { TransactionType } from '@/entities/transaction/model/types';

interface TransactionAmountProps {
  amount: string;
  type: TransactionType;
  className?: string;
}

/** Расход и доход визуально различаются знаком и цветом. */
export function TransactionAmount({ amount, type, className }: TransactionAmountProps) {
  const isExpense = type === 'EXPENSE';
  return (
    <span
      className={cn(
        'font-medium tabular-nums',
        isExpense ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
        className,
      )}
    >
      {isExpense ? '−' : '+'}
      {formatMoney(amount)}
    </span>
  );
}
