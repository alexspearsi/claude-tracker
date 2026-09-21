import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { totalPages } from '@/shared/lib/pagination';
import { EmptyState } from '@/widgets/recent-transactions/ui/empty-state';
import { PaginationNav } from '@/widgets/recent-transactions/ui/pagination-nav';
import { TransactionsTable } from '@/widgets/recent-transactions/ui/transactions-table';
import type { TransactionRowModel } from '@/widgets/recent-transactions/model/types';

interface RecentTransactionsProps {
  rows: TransactionRowModel[];
  total: number;
  page: number;
  basePath: string;
  /** Кнопка быстрого добавления — виджет остаётся презентационным и сам
   *  QuickAddTransaction не импортирует, её передаёт вызывающий view. */
  headerAction?: ReactNode;
}

/** Карточка со списком последних транзакций и пагинацией — чистое представление,
 *  загрузку данных и обработку 401 делает вызывающий view. */
export function RecentTransactions({
  rows,
  total,
  page,
  basePath,
  headerAction,
}: RecentTransactionsProps) {
  const pages = totalPages(total);
  // offset ушёл за пределы списка (например, удалили транзакции между переходами по страницам).
  const isOutOfRange = rows.length === 0 && total > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Последние транзакции</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? (
          isOutOfRange ? (
            <EmptyState
              title="Такой страницы нет"
              description={`Всего страниц: ${pages}`}
              backHref={basePath}
              backLabel="К первой странице"
            />
          ) : (
            <EmptyState
              title="Пока нет транзакций"
              description="Добавьте первую транзакцию, чтобы увидеть её здесь"
            />
          )
        ) : (
          <>
            <TransactionsTable rows={rows} />
            <PaginationNav basePath={basePath} page={page} pages={pages} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
