import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { TransactionSummary } from '@/entities/transaction/model/types';

interface GetSummaryParams {
  month: number;
  year: number;
}

/**
 * Токен приходит параметром, а не читается изнутри entity: entities/session — соседний
 * слайс, кросс-импорты внутри entities запрещены правилами FSD проекта.
 *
 * В отличие от getTransactions, month/year передаются безусловно — SummaryQueryDto на api
 * не помечен @IsOptional, undefined не пройдёт @IsInt.
 */
export function getSummary(
  accessToken: string,
  { month, year }: GetSummaryParams,
): Promise<TransactionSummary> {
  const query = new URLSearchParams({ month: String(month), year: String(year) });
  return apiFetch<TransactionSummary>(`/transactions/summary?${query}`, {
    accessToken,
    cache: 'no-store',
  });
}
