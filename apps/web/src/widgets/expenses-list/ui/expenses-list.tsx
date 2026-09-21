import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PaginationNav } from '@/shared/ui/pagination-nav';
import { totalPages } from '@/shared/lib/pagination';
import { ROUTES } from '@/shared/config/routes';
import { EmptyState } from '@/widgets/expenses-list/ui/empty-state';
import { ExpensesTable } from '@/widgets/expenses-list/ui/expenses-table';
import type { ExpenseRowModel } from '@/widgets/expenses-list/model/types';

interface ExpensesListProps {
  rows: ExpenseRowModel[];
  total: number;
  page: number;
}

/** Карточка со списком транзакций и пагинацией — чистое представление, загрузку
 *  данных и обработку 401 делает вызывающий view. */
export function ExpensesList({ rows, total, page }: ExpensesListProps) {
  const pages = totalPages(total);
  const isOutOfRange = rows.length === 0 && total > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Транзакции</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? (
          isOutOfRange ? (
            <EmptyState
              title="Такой страницы нет"
              description={`Всего страниц: ${pages}`}
              backHref={ROUTES.expenses}
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
            <ExpensesTable rows={rows} />
            <PaginationNav basePath={ROUTES.expenses} page={page} pages={pages} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
