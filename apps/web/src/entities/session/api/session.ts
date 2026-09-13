import 'server-only';

import { cookies } from 'next/headers';
import type { AuthTokens } from '@expense/shared';
import { tokenExpiresAt } from '@/entities/session/lib/token-expiry';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from '@/entities/session/model/cookies';
import type { Session } from '@/entities/session/model/types';
import { apiFetch } from '@/shared/api/api-client';

/**
 * Кладёт пару токенов в httpOnly-куки.
 * Писать куки можно только из Server Action или Route Handler: при рендере страницы
 * заголовки ответа уже отправлены, и `cookies().set` бросит ошибку. В proxy для этого
 * есть отдельный путь — `refreshSessionInProxy`.
 */
export async function setSession(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: tokenExpiresAt(tokens.accessToken, 'access'),
  });
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: tokenExpiresAt(tokens.refreshToken, 'refresh'),
  });
}

/** Читает сессию из кук. `null`, если хотя бы одного токена нет. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }
  return { accessToken, refreshToken };
}

/** Удаляет куки сессии. Только из Server Action или Route Handler. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

/**
 * Меняет refresh-токен на новую пару и перезаписывает куки.
 * api отзывает старый refresh при каждом обмене (ротация), поэтому вызывать эту функцию
 * параллельно нельзя: второй запрос получит 401 и выбросит пользователя из сессии.
 * Возвращает `null`, если refresh-токена нет или api его не принял — куки при этом чистятся.
 */
export async function refreshSession(): Promise<Session | null> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return null;
  }

  try {
    const tokens = await apiFetch<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    await setSession(tokens);
    return tokens;
  } catch {
    await clearSession();
    return null;
  }
}
