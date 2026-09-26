'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/entities/session/api/session';
import { updateTransaction } from '@/entities/transaction/api/update-transaction';
import { apiErrorMessage, extractFieldErrors } from '@/shared/api/error-message';
import { TRANSACTION_AFFECTED_PATHS } from '@/features/transaction-form/model/affected-paths';
import { transactionFormSchema } from '@/features/transaction-form/model/transaction-form-schema';
import type { TransactionActionState } from '@/features/transaction-form/model/types';

export async function updateTransactionAction(
  id: string,
  input: unknown,
): Promise<TransactionActionState> {
  // Server Action доступен прямым POST, поэтому валидация клиента здесь не защита (T-02-01).
  // Настоящий шлюз — UpdateTransactionDto на class-validator за глобальным ValidationPipe.
  const parsed = transactionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  // В отличие от создания: пустое описание должно уйти как null, а не отсутствовать —
  // это единственный способ стереть описание через UpdateTransactionDto (T-02-09).
  const trimmedDescription = parsed.data.description?.trim();
  const payload = {
    amount: parsed.data.amount,
    type: parsed.data.type,
    categoryId: parsed.data.categoryId,
    date: parsed.data.date,
    description: trimmedDescription ? trimmedDescription : null,
  };

  try {
    await updateTransaction(session.accessToken, id, payload);
  } catch (error) {
    const fieldErrors = extractFieldErrors(error);
    if (fieldErrors) {
      return { error: 'Проверьте правильность заполнения полей', fieldErrors };
    }
    return { error: apiErrorMessage(error) };
  }

  for (const path of TRANSACTION_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
