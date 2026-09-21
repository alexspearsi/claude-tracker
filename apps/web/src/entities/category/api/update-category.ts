import 'server-only';
import type { Category, UpdateCategoryInput } from '@expense/shared';
import { apiFetch } from '@/shared/api/api-client';

/** Токен параметром — см. комментарий в entities/transaction/api/get-transactions.ts. */
export function updateCategory(
  accessToken: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(input),
  });
}
