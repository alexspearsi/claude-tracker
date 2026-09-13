'use server';

import { redirect } from 'next/navigation';
import { registerSchema, type AuthTokens, type RegisterInput } from '@expense/shared';
import { setSession } from '@/entities/session/api/session';
import { apiFetch } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { ROUTES } from '@/shared/config/routes';
import type { AuthActionState } from '@/features/auth/model/types';

export async function registerAction(input: RegisterInput): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  try {
    const tokens = await apiFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    await setSession(tokens);
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  redirect(ROUTES.expenses);
}
