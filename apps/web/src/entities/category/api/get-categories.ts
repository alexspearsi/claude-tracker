import 'server-only';
import type { Category } from '@expense/shared';
import { apiFetch } from '@/shared/api/api-client';

/** Токен параметром — см. комментарий в entities/transaction/api/get-transactions.ts. */
export function getCategories(accessToken: string): Promise<Category[]> {
  return apiFetch<Category[]>('/categories', { accessToken, cache: 'no-store' });
}
