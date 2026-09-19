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
 *
 * Promise.allSettled, а не Promise.all: с Promise.all любая из двух ошибок (в том
 * числе не связанная с транзакциями — например, 500 от /categories) ловилась бы
 * одним общим catch и подписывалась как «не удалось загрузить транзакции», хотя
 * список транзакций мог загрузиться нормально. allSettled позволяет разобрать,
 * какой именно запрос упал, и сформулировать точное сообщение.
 */
export async function loadRecentTransactions(
  accessToken: string,
  page: number,
): Promise<LoadRecentTransactionsResult> {
  const [txResult, catResult] = await Promise.allSettled([
    getTransactions(accessToken, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getCategories(accessToken),
  ]);

  // 401 от любого из двух запросов означает мёртвую сессию — источник не важен.
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
  const rows: TransactionRowModel[] = txResult.value.items.map((tx) => {
    const category = categoryById.get(tx.categoryId);
    return {
      ...tx,
      categoryName: category?.name ?? 'Без категории',
      categoryColor: category?.color ?? '#94a3b8',
    };
  });

  return { status: 'ok', rows, total: txResult.value.total };
}
