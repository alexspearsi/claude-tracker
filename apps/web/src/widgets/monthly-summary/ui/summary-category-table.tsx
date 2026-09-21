import { CategoryDot } from '@/entities/category/ui/category-dot';
import { TransactionAmount } from '@/entities/transaction/ui/transaction-amount';
import type { SummaryCategoryItem } from '@/entities/transaction/model/types';

interface SummaryCategoryTableProps {
  items: SummaryCategoryItem[];
}

/**
 * Строки уже отсортированы сервером по убыванию total — повторно не сортируем.
 * Ширина прогресс-бара — доля от максимальной суммы в списке (не от общей суммы
 * расходов): список включает и доходы, и расходы (SUM-02), и суммировать их вместе
 * для процента было бы бессмысленно.
 */
export function SummaryCategoryTable({ items }: SummaryCategoryTableProps) {
  const max = Math.max(...items.map((item) => Number(item.total)), 1);

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => {
        // categoryId одной категории может повториться — groupBy(['categoryId', 'type'])
        // на api даёт отдельную строку для дохода и расхода одной категории в одном месяце.
        const width = Math.max((Number(item.total) / max) * 100, 4);
        return (
          <div key={`${item.categoryId}-${item.type}`} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                <CategoryDot color={item.color} />
                {item.name}
              </span>
              <TransactionAmount amount={item.total} type={item.type} className="text-[15px]" />
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${width}%`, background: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
