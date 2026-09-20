import { ROUTES } from '@/shared/config/routes';

/** Пункты горизонтального меню в шапке дашборда. */
export const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: 'Главная' },
  { href: ROUTES.expenses, label: 'Транзакции' },
  { href: ROUTES.categories, label: 'Категории' },
  { href: ROUTES.about, label: 'О сервисе' },
] as const;
