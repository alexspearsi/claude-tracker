import 'server-only';
import { cache } from 'react';
import type { UserProfile } from '@expense/shared';
import { apiFetch } from '@/shared/api/api-client';

/**
 * cache() дедуплицирует вызов в пределах одного рендера: layout и страница спрашивают
 * профиль независимо, а запрос к /users/me уходит один. Ключ кэша — accessToken:
 * в рамках одного запроса proxy.ts уже обновил куку до рендера, поэтому все места
 * получают один и тот же токен и дедупликация срабатывает.
 */
export const getCurrentUser = cache(
  (accessToken: string): Promise<UserProfile> =>
    apiFetch<UserProfile>('/users/me', { accessToken, cache: 'no-store' }),
);
