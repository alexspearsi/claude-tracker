import 'server-only';
import type { Category } from '@expense/shared';
import { getCategories } from '@/entities/category/api/get-categories';
import { getTransactions } from '@/entities/transaction/api/get-transactions';
import { ApiError } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import type { ExpenseRowModel } from '@/widgets/expenses-list/model/types';

export type LoadTransactionsResult =
  | { status: 'ok'; rows: ExpenseRowModel[]; total: number; categories: Category[] }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

/**
 * Структурная копия loadRecentTransactions (widgets/recent-transactions) — см. её
 * комментарий про Promise.allSettled и склейку категорий через Map. Дополнительно
 * отдаёт сам массив categories наружу: он нужен форме добавления транзакции (задача 2).
 */
export async function loadTransactions(
  accessToken: string,
  { page }: { page: number },
): Promise<LoadTransactionsResult> {
  const [txResult, catResult] = await Promise.allSettled([
    getTransactions(accessToken, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getCategories(accessToken),
  ]);

  const isUnauthorized = [txResult, catResult].some(
    (result) => result.status === 'rejected' && result.reason instanceof ApiError && result.reason.status === 401,
  );
  if (isUnauthorized) {
    return { status: 'unauthorized' };
  }

  if (txResult.status === 'rejected') {
    return { status: 'error', message: `Транзакции: ${apiErrorMessage(txResult.reason)}` };
  }
  if (catResult.status === 'rejected') {
    return { status: 'error', message: `Категории: ${apiErrorMessage(catResult.reason)}` };
  }

  const categoryById = new Map(catResult.value.map((c) => [c.id, c]));
  const rows: ExpenseRowModel[] = txResult.value.items.map((tx) => {
    const category = categoryById.get(tx.categoryId);
    return {
      ...tx,
      categoryName: category?.name ?? 'Без категории',
      categoryColor: category?.color ?? '#94a3b8',
    };
  });

  return { status: 'ok', rows, total: txResult.value.total, categories: catResult.value };
}
