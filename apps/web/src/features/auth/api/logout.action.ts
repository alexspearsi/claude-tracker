'use server';

import { redirect } from 'next/navigation';
import { clearSession, getSession, refreshSession } from '@/entities/session/api/session';
import type { Session } from '@/entities/session/model/types';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/config/routes';

/**
 * Отзывает refresh-токен в api. `false` — access протух (401) и имеет смысл повторить
 * с обновлённой парой; при любой другой ошибке повторять бесполезно.
 */
async function revokeTokens(session: Session): Promise<boolean> {
  try {
    // api отзывает refresh из тела и требует при этом валидный access в заголовке.
    await apiFetch<void>('/auth/logout', {
      method: 'POST',
      accessToken: session.accessToken,
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    return true;
  } catch (error) {
    return !(error instanceof ApiError) || error.status !== 401;
  }
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();

  if (session && !(await revokeTokens(session))) {
    // Access истёк, но refresh ещё жив: обновляем пару, иначе старый refresh остался бы
    // действительным в базе все свои 30 дней, хотя пользователь вышел.
    const refreshed = await refreshSession();
    if (refreshed) {
      await revokeTokens(refreshed);
    }
  }

  await clearSession();
  redirect(ROUTES.login);
}
