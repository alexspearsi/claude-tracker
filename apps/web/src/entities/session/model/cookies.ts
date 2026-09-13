/**
 * Имена и параметры кук сессии. Вынесены из `api/session.ts`, потому что их использует
 * и `proxy.ts`, которому нельзя импортировать модуль под `server-only`.
 */
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  // На localhost сайт открыт по http, и с secure браузер куку просто не сохранит.
  secure: process.env.NODE_ENV === 'production',
} as const;
