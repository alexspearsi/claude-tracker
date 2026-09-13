import { z } from 'zod';

// Сообщения на русском: схемы общие для фронта (zodResolver) и бэка (ZodValidationPipe),
// поэтому текст ошибки пишется один раз здесь и виден в обоих местах.
export const registerSchema = z.object({
  email: z.email('Некорректный email'),
  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .max(72, 'Не длиннее 72 символов'),
  name: z.string().min(1, 'Введите имя').max(80, 'Не длиннее 80 символов').optional(),
});

export const loginSchema = z.object({
  email: z.email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const userProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
