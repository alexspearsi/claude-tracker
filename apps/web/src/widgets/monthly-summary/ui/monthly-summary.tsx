import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { cn, formatMoney } from '@/shared/lib/utils';
import { SummaryCategoryTable } from '@/widgets/monthly-summary/ui/summary-category-table';
import type { TransactionSummary } from '@/entities/transaction/model/types';

interface SummaryStatProps {
  label: string;
  amount: string;
  colorClassName?: string;
}

/** Без префикса «+»/«−»: formatMoney уже отдаёт знак для отрицательного balance,
 *  income/expense всегда неотрицательны. */
function SummaryStat({ label, amount, colorClassName }: SummaryStatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-2xl font-semibold tabular-nums', colorClassName)}>
        {formatMoney(amount)}
      </span>
    </div>
  );
}

interface MonthlySummaryProps {
  summary: TransactionSummary;
}

/** Карточка «Сводка за месяц»: три показателя + таблица разбивки по категориям.
 *  Server Component без собственного состояния — данные приходит готовыми пропом. */
export function MonthlySummary({ summary }: MonthlySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Сводка за месяц</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4">
          <SummaryStat label="Баланс" amount={summary.balance} />
          <SummaryStat
            label="Доходы"
            amount={summary.income}
            colorClassName="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryStat label="Расходы" amount={summary.expense} colorClassName="text-destructive" />
        </div>

        <div className="flex flex-col gap-4 border-t pt-4">
          <h2 className="text-sm font-medium">По категориям</h2>
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных за текущий месяц</p>
          ) : (
            <SummaryCategoryTable items={summary.byCategory} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
