'use client';

import { useState } from 'react';
import type { Category } from '@expense/shared';
import { TransactionDeleteDialog } from '@/features/transaction-form/ui/transaction-delete-dialog';
import { TransactionForm } from '@/features/transaction-form/ui/transaction-form';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { PaginationNav } from '@/shared/ui/pagination-nav';
import { totalPages } from '@/shared/lib/pagination';
import { ROUTES } from '@/shared/config/routes';
import { EmptyState } from '@/widgets/expenses-list/ui/empty-state';
import { ExpensesTable } from '@/widgets/expenses-list/ui/expenses-table';
import { TransactionFiltersPanel } from '@/widgets/expenses-list/ui/transaction-filters';
import { filtersToParams, hasActiveFilters, type TransactionFilters } from '@/widgets/expenses-list/model/filters';
import type { ExpenseRowModel } from '@/widgets/expenses-list/model/types';

interface ExpensesListProps {
  rows: ExpenseRowModel[];
  total: number;
  page: number;
  filters: TransactionFilters;
  categories: Category[];
}

/** Карточка со списком транзакций, панелью фильтров, пагинацией и точками входа
 *  добавления/редактирования/удаления — вторая точка входа в общую TransactionForm
 *  (TXN-05, D-02, TXN-02), в диалог удаления (TXN-03) и в панель фильтров (TXN-06, D-04). */
export function ExpensesList({ rows, total, page, filters, categories }: ExpensesListProps) {
  // 'create' — новая транзакция, строка ExpenseRowModel — редактирование, null — форма закрыта.
  const [formTarget, setFormTarget] = useState<ExpenseRowModel | 'create' | null>(null);
  // Независимо от formTarget — форма и подтверждение удаления открываются раздельно.
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRowModel | null>(null);
  const pages = totalPages(total);
  const isOutOfRange = rows.length === 0 && total > 0;
  const isFiltered = hasActiveFilters(filters);
  const filterParams = filtersToParams(filters);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Транзакции</CardTitle>
        <Button onClick={() => setFormTarget('create')}>Добавить транзакцию</Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Панель рендерится всегда, в том числе при нулевой выдаче — иначе фильтр,
            из-за которого список опустел, нечем было бы снять (D-04). */}
        <TransactionFiltersPanel filters={filters} categories={categories} />

        {rows.length === 0 ? (
          isOutOfRange ? (
            <EmptyState
              title="Такой страницы нет"
              description={`Всего страниц: ${pages}`}
              backHref={ROUTES.expenses}
              backLabel="К первой странице"
            />
          ) : isFiltered ? (
            <EmptyState title="Ничего не найдено" description="Попробуйте изменить период, тип или категорию" />
          ) : (
            <EmptyState
              title="Пока нет транзакций"
              description="Добавьте первую транзакцию, чтобы увидеть её здесь"
              action={<Button onClick={() => setFormTarget('create')}>Добавить транзакцию</Button>}
            />
          )
        ) : (
          <>
            <ExpensesTable rows={rows} onEdit={setFormTarget} onDelete={setDeleteTarget} />
            <PaginationNav basePath={ROUTES.expenses} page={page} pages={pages} params={filterParams} />
          </>
        )}
      </CardContent>

      {formTarget !== null && (
        <TransactionForm
          key={formTarget === 'create' ? 'create' : formTarget.id}
          transaction={formTarget === 'create' ? undefined : formTarget}
          categories={categories}
          open
          onOpenChange={(next) => {
            if (!next) {
              setFormTarget(null);
            }
          }}
        />
      )}

      {deleteTarget !== null && (
        <TransactionDeleteDialog
          key={deleteTarget.id}
          transaction={deleteTarget}
          open
          onOpenChange={(next) => {
            if (!next) {
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </Card>
  );
}
