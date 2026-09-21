import 'server-only';
import { apiFetch } from '@/shared/api/api-client';

/** Токен параметром — см. комментарий в entities/transaction/api/get-transactions.ts. */
export function deleteCategory(accessToken: string, id: string): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, {
    method: 'DELETE',
    accessToken,
  });
}
