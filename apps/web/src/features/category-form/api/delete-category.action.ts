'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/entities/session/api/session';
import { deleteCategory } from '@/entities/category/api/delete-category';
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
    return { error: apiErrorMessage(error) };
  }

  for (const path of CATEGORY_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
