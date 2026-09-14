/** Единственный источник путей: на них опираются proxy, server actions и ссылки. */
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  expenses: '/expenses',
  categories: '/categories',
  terms: '/terms',
  privacy: '/privacy',
} as const;

/** Роуты, доступные только с сессией. */
export const PROTECTED_ROUTES = [ROUTES.dashboard, ROUTES.expenses, ROUTES.categories];

/** Роуты авторизации: залогиненного пользователя с них уводим на главный экран. */
export const GUEST_ROUTES = [ROUTES.login, ROUTES.register];
