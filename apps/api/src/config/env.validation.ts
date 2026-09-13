import { z } from 'zod';

/** Схема переменных окружения: приложение падает на старте, а не на первом запросе. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(4001),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string().default('30d'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Некорректный .env:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
