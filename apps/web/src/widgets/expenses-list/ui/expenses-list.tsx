'use client';

import { useState } from 'react';
import type { Category } from '@expense/shared';
import { TransactionForm } from '@/features/transaction-form/ui/transaction-form';
import { Button } from '@/shared/ui/button';
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
  categories: Category[];
}

/** Карточка со списком транзакций, пагинацией и точкой входа добавления —
 *  вторая точка входа в общую TransactionForm (TXN-05, D-02). */
export function ExpensesList({ rows, total, page, categories }: ExpensesListProps) {
  const [isFormOpen, setFormOpen] = useState(false);
  const pages = totalPages(total);
  const isOutOfRange = rows.length === 0 && total > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Транзакции</CardTitle>
        <Button onClick={() => setFormOpen(true)}>Добавить транзакцию</Button>
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
              action={<Button onClick={() => setFormOpen(true)}>Добавить транзакцию</Button>}
            />
          )
        ) : (
          <>
            <ExpensesTable rows={rows} />
            <PaginationNav basePath={ROUTES.expenses} page={page} pages={pages} />
          </>
        )}
      </CardContent>

      {isFormOpen && (
        <TransactionForm
          categories={categories}
          open
          onOpenChange={(next) => {
            if (!next) {
              setFormOpen(false);
            }
          }}
        />
      )}
    </Card>
  );
}
