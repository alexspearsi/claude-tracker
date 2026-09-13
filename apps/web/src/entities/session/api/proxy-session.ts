import type { NextResponse } from 'next/server';
import type { AuthTokens } from '@expense/shared';
import { tokenExpiresAt } from '@/entities/session/lib/token-expiry';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from '@/entities/session/model/cookies';
import { apiFetch } from '@/shared/api/api-client';

/**
 * Обмен refresh-токена на новую пару внутри proxy.
 * Отдельно от `refreshSession`: там куки пишутся через `cookies()` из next/headers,
 * а здесь их можно поставить только на конкретный NextResponse.
 */
export async function exchangeRefreshToken(refreshToken: string): Promise<AuthTokens | null> {
  try {
    return await apiFetch<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return null;
  }
}

/** Записывает новую пару токенов в куки ответа proxy. */
export function setSessionCookies(response: NextResponse, tokens: AuthTokens): void {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: tokenExpiresAt(tokens.accessToken, 'access'),
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...SESSION_COOKIE_OPTIONS,
    expires: tokenExpiresAt(tokens.refreshToken, 'refresh'),
  });
}

/** Удаляет куки сессии в ответе proxy — после неудачного обмена refresh-токена. */
export function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}
