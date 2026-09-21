import 'server-only';
import { getSummary } from '@/entities/transaction/api/get-summary';
import { ApiError } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import type { TransactionSummary } from '@/entities/transaction/model/types';

export type LoadMonthlySummaryResult =
  | { status: 'ok'; summary: TransactionSummary }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

/**
 * В отличие от loadRecentTransactions (два параллельных запроса, Promise.allSettled),
 * здесь ровно один запрос — простой try/catch достаточен.
 */
export async function loadMonthlySummary(accessToken: string): Promise<LoadMonthlySummaryResult> {
  const now = new Date();
  // UTC, не локальное время: api считает границы месяца через Date.UTC
  // (transactions.service.ts), локальное время процесса может разойтись на стыке месяца.
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  try {
    const summary = await getSummary(accessToken, { month, year });
    return { status: 'ok', summary };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'unauthorized' };
    }
    return { status: 'error', message: `Сводка: ${apiErrorMessage(error)}` };
  }
}
