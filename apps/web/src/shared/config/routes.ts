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
  /** Route Handler: чистит куки сессии и уводит на login. Не страница — сюда не
   *  переходят по ссылке, только через redirect() при мёртвой сессии (см.
   *  app/session-expired/route.ts). Не входит ни в PROTECTED_ROUTES, ни в GUEST_ROUTES. */
  sessionExpired: '/session-expired',
} as const;

/** Роуты, доступные только с сессией. */
export const PROTECTED_ROUTES = [ROUTES.dashboard, ROUTES.expenses, ROUTES.categories];

/** Роуты авторизации: залогиненного пользователя с них уводим на главный экран. */
export const GUEST_ROUTES = [ROUTES.login, ROUTES.register];
