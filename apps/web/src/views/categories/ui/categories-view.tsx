import { redirect } from 'next/navigation';
import type { Category } from '@expense/shared';
import { getSession } from '@/entities/session/api/session';
import { getCategories } from '@/entities/category/api/get-categories';
import { ApiError } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { ROUTES } from '@/shared/config/routes';
import { CategoryList } from '@/widgets/category-list/ui/category-list';

export async function CategoriesView() {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  let categories: Category[] = [];
  let loadError: string | null = null;

  try {
    categories = await getCategories(session.accessToken);
  } catch (error) {
    // redirect — вне try/catch по смыслу не нужен здесь: он сам бросает NEXT_REDIRECT,
    // а этот catch его не перехватывает (redirect() кидает исключение до возврата сюда).
    if (error instanceof ApiError && error.status === 401) {
      redirect(ROUTES.sessionExpired);
    }
    loadError = apiErrorMessage(error);
  }

  return (
    <>
      <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-tight">Категории</h1>
      {loadError ? (
        <p className="text-sm text-destructive">Не удалось загрузить категории: {loadError}</p>
      ) : (
        <CategoryList categories={categories} />
      )}
    </>
  );
}
