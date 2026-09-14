import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { TransactionList } from '@/entities/transaction/model/types';

interface GetTransactionsParams {
  limit: number;
  offset: number;
}

/**
 * Токен приходит параметром, а не читается изнутри entity: entities/session — соседний
 * слайс, кросс-импорты внутри entities запрещены правилами FSD проекта.
 */
export function getTransactions(
  accessToken: string,
  { limit, offset }: GetTransactionsParams,
): Promise<TransactionList> {
  // Только известные ключи: у api forbidNonWhitelisted — лишний query даст 400.
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch<TransactionList>(`/transactions?${query}`, {
    accessToken,
    cache: 'no-store',
  });
}
