import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { TransactionList, TransactionType } from '@/entities/transaction/model/types';

interface GetTransactionsParams {
  limit: number;
  offset: number;
  /** Четыре фильтра необязательны — их имена ровно те, что ждёт TransactionQueryDto. */
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Токен приходит параметром, а не читается изнутри entity: entities/session — соседний
 * слайс, кросс-импорты внутри entities запрещены правилами FSD проекта.
 */
export function getTransactions(
  accessToken: string,
  { limit, offset, type, categoryId, dateFrom, dateTo }: GetTransactionsParams,
): Promise<TransactionList> {
  // Только известные ключи: у api forbidNonWhitelisted — лишний query даст 400.
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) query.set('type', type);
  if (categoryId) query.set('categoryId', categoryId);
  if (dateFrom) query.set('dateFrom', dateFrom);
  if (dateTo) query.set('dateTo', dateTo);
  return apiFetch<TransactionList>(`/transactions?${query}`, {
    accessToken,
    cache: 'no-store',
  });
}
