import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { cn, formatMoney } from '@/shared/lib/utils';
import { SummaryCategoryTable } from '@/widgets/monthly-summary/ui/summary-category-table';
import type { TransactionSummary } from '@/entities/transaction/model/types';

interface SummaryStatProps {
  label: string;
  amount: string;
  colorClassName?: string;
  iconBg: string;
  icon: React.ReactNode;
}

/** Без префикса «+»/«−»: formatMoney уже отдаёт знак для отрицательного balance,
 *  income/expense всегда неотрицательны. */
function SummaryStat({ label, amount, colorClassName, iconBg, icon }: SummaryStatProps) {
  return (
    <Card className="flex-1 gap-3.5 py-[22px]">
      <CardContent className="flex flex-col gap-3.5 px-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">{label}</span>
          <div
            className="flex size-9 items-center justify-center rounded-xl"
            style={{ background: iconBg }}
          >
            {icon}
          </div>
        </div>
        <span className={cn('text-[34px] leading-none font-extrabold tracking-tight tabular-nums', colorClassName)}>
          {formatMoney(amount)}
        </span>
      </CardContent>
    </Card>
  );
}

interface MonthlySummaryProps {
  summary: TransactionSummary;
}

/** Три карточки статистики + карточка разбивки по категориям — двум отдельным
 *  вызывающим местам (SummaryStats в первой строке дашборда, CategoryBreakdown
 *  в сетке рядом со списком транзакций), а не одна общая Card: 1:1 с макетом. */
export function SummaryStats({ summary }: MonthlySummaryProps) {
  return (
    <div className="flex gap-5">
      <SummaryStat
        label="Баланс"
        amount={summary.balance}
        iconBg="rgba(120,40,200,.12)"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lg-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v18" />
            <path d="M5 7h14" />
            <path d="m5 7-3 7a3 3 0 0 0 6 0Z" />
            <path d="m19 7-3 7a3 3 0 0 0 6 0Z" />
          </svg>
        }
      />
      <SummaryStat
        label="Доходы"
        amount={summary.income}
        colorClassName="text-[var(--income)]"
        iconBg="rgba(18,161,80,.12)"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--income)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </svg>
        }
      />
      <SummaryStat
        label="Расходы"
        amount={summary.expense}
        colorClassName="text-[var(--expense)]"
        iconBg="rgba(194,14,77,.12)"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--expense)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 7l10 10" />
            <path d="M17 8v9H8" />
          </svg>
        }
      />
    </div>
  );
}

/** Карточка «По категориям»: список с прогресс-барами, сортировка серверная. */
export function CategoryBreakdown({ summary }: MonthlySummaryProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>По категориям</CardTitle>
      </CardHeader>
      <CardContent>
        {summary.byCategory.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет данных за текущий месяц</p>
        ) : (
          <SummaryCategoryTable items={summary.byCategory} />
        )}
      </CardContent>
    </Card>
  );
}
