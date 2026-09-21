import 'server-only';
import type { Category, CreateCategoryInput } from '@expense/shared';
import { apiFetch } from '@/shared/api/api-client';

/** Токен параметром — см. комментарий в entities/transaction/api/get-transactions.ts. */
export function createCategory(accessToken: string, input: CreateCategoryInput): Promise<Category> {
  return apiFetch<Category>('/categories', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  });
}
