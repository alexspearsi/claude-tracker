import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { CreateTransactionInput, Transaction } from '@/entities/transaction/model/types';

/**
 * Токен приходит параметром, а не читается изнутри entity — см. комментарий
 * в get-transactions.ts (кросс-импорт entities/session запрещён правилами FSD).
 */
export function createTransaction(
  accessToken: string,
  input: CreateTransactionInput,
): Promise<Transaction> {
  return apiFetch<Transaction>('/transactions', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  });
}
