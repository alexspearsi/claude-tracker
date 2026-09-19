'use server';

import { redirect } from 'next/navigation';
import { loginSchema, type AuthTokens, type LoginInput } from '@expense/shared';
import { setSession } from '@/entities/session/api/session';
import { apiFetch } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { ROUTES } from '@/shared/config/routes';
import type { AuthActionState } from '@/features/auth/model/types';

export async function loginAction(input: LoginInput): Promise<AuthActionState> {
  // Server Action доступен прямым POST, поэтому валидация клиента здесь не защита.
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  try {
    const tokens = await apiFetch<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    await setSession(tokens);
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  // Вне try/catch: redirect бросает NEXT_REDIRECT, внутри его перехватил бы catch.
  redirect(ROUTES.dashboard);
}
