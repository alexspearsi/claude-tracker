'use server';

import { revalidatePath } from 'next/cache';
import { updateCategorySchema } from '@expense/shared';
import { getSession } from '@/entities/session/api/session';
import { updateCategory } from '@/entities/category/api/update-category';
import { apiErrorMessage, extractFieldErrors } from '@/shared/api/error-message';
import { CATEGORY_AFFECTED_PATHS } from '@/features/category-form/model/affected-paths';
import type { CategoryActionState } from '@/features/category-form/model/types';

export async function updateCategoryAction(id: string, input: unknown): Promise<CategoryActionState> {
  // Server Action доступен прямым POST, поэтому валидация клиента здесь не защита (T-01-08).
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await updateCategory(session.accessToken, id, parsed.data);
  } catch (error) {
    const fieldErrors = extractFieldErrors(error);
    if (fieldErrors) {
      return { error: 'Проверьте правильность заполнения полей', fieldErrors };
    }
    return { error: apiErrorMessage(error) };
  }

  for (const path of CATEGORY_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
