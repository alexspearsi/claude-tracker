'use server';

import { revalidatePath } from 'next/cache';
import { createCategorySchema } from '@expense/shared';
import { getSession } from '@/entities/session/api/session';
import { createCategory } from '@/entities/category/api/create-category';
import { apiErrorMessage } from '@/shared/api/error-message';
import { CATEGORY_AFFECTED_PATHS } from '@/features/category-form/model/affected-paths';
import type { CategoryActionState } from '@/features/category-form/model/types';

export async function createCategoryAction(input: unknown): Promise<CategoryActionState> {
  // Server Action доступен прямым POST, поэтому валидация клиента здесь не защита (T-01-05).
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await createCategory(session.accessToken, parsed.data);
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  for (const path of CATEGORY_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
