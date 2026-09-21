'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/entities/session/api/session';
import { deleteCategory } from '@/entities/category/api/delete-category';
import { ApiError } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { CATEGORY_AFFECTED_PATHS } from '@/features/category-form/model/affected-paths';
import type { CategoryActionState } from '@/features/category-form/model/types';

export async function deleteCategoryAction(id: string): Promise<CategoryActionState> {
  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await deleteCategory(session.accessToken, id);
  } catch (error) {
    // На сервере в 409 сводятся два разных кода Prisma: P2002 (дубль имени — возможен только
    // при create/update) и P2003 (нарушение внешнего ключа). Для удаления практический источник
    // 409 ровно один — связанные транзакции, поэтому флаг blocked ставится только здесь.
    // Решение — по числовому error.status, а не по тексту сообщения (та же идиома, что в
    // features/auth/api/logout.action.ts).
    if (error instanceof ApiError && error.status === 409) {
      return { error: apiErrorMessage(error), blocked: true };
    }
    return { error: apiErrorMessage(error) };
  }

  for (const path of CATEGORY_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
