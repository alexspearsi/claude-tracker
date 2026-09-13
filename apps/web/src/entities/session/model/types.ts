import type { AuthTokens } from '@expense/shared';

/** Сессия = пара токенов из httpOnly-кук. Клиентскому коду недоступна. */
export type Session = AuthTokens;
