import 'server-only';
import { getCategories } from '@/entities/category/api/get-categories';
import { getTransactions } from '@/entities/transaction/api/get-transactions';
import { ApiError } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import type { TransactionRowModel } from '@/widgets/recent-transactions/model/types';

export type LoadRecentTransactionsResult =
  | { status: 'ok'; rows: TransactionRowModel[]; total: number }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

/**
 * Категории тянутся отдельным запросом и склеиваются через Map: TransactionDto не
 * отдаёт вложенную category (маппер toTransaction в api общий на все ручки, менять
 * контракт ради дашборда не стоит), а категорий у пользователя единицы — запрос идёт
 * параллельно и почти ничего не стоит по времени.
 */
export async function loadRecentTransactions(
  accessToken: string,
  page: number,
): Promise<LoadRecentTransactionsResult> {
  try {
    const [list, categories] = await Promise.all([
      getTransactions(accessToken, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      getCategories(accessToken),
    ]);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const rows: TransactionRowModel[] = list.items.map((tx) => {
      const category = categoryById.get(tx.categoryId);
      return {
        ...tx,
        categoryName: category?.name ?? 'Без категории',
        categoryColor: category?.color ?? '#94a3b8',
      };
    });

    return { status: 'ok', rows, total: list.total };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'unauthorized' };
    }
    return { status: 'error', message: apiErrorMessage(error) };
  }
}
