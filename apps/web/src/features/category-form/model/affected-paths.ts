import { ROUTES } from '@/shared/config/routes';

/**
 * Имя и цвет категории рендерятся в строках транзакций на `/dashboard` и `/expenses`,
 * поэтому ревалидировать только `/categories` недостаточно — иначе на соседних экранах
 * останется старое имя.
 */
export const CATEGORY_AFFECTED_PATHS = [ROUTES.categories, ROUTES.dashboard, ROUTES.expenses];
