'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/entities/session/api/session';
import { deleteTransaction } from '@/entities/transaction/api/delete-transaction';
import { apiErrorMessage } from '@/shared/api/error-message';
import { TRANSACTION_AFFECTED_PATHS } from '@/features/transaction-form/model/affected-paths';
import type { TransactionActionState } from '@/features/transaction-form/model/types';

/**
 * В отличие от deleteCategoryAction здесь нет отдельной ветки на конфликт внешнего ключа:
 * на транзакцию не ссылается ничего (Pitfall 3, 02-RESEARCH.md) — такая ветка была бы
 * недостижимым кодом, и заводить под неё отдельное состояние тоже не нужно.
 */
export async function deleteTransactionAction(id: string): Promise<TransactionActionState> {
  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await deleteTransaction(session.accessToken, id);
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  for (const path of TRANSACTION_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
