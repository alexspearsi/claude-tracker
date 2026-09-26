import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { Transaction, UpdateTransactionInput } from '@/entities/transaction/model/types';

/**
 * Токен приходит параметром, а не читается изнутри entity — см. комментарий
 * в get-transactions.ts (кросс-импорт entities/session запрещён правилами FSD).
 */
export function updateTransaction(
  accessToken: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  return apiFetch<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(input),
  });
}
