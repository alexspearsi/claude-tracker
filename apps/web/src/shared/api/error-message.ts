import { ApiError } from '@/shared/api/api-client';

const FALLBACK = 'Сервис недоступен, попробуйте позже';

/**
 * Тело ошибки от Nest собирает HttpExceptionFilter:
 * `{ statusCode, path, timestamp, error }`, где `error` — ответ самого исключения
 * (`{ message, ... }`, у ZodValidationPipe рядом лежит `issues` от z.treeifyError).
 * Сообщения в api уже на русском, поэтому здесь их достаточно достать.
 */
interface NestErrorBody {
  error?: {
    message?: unknown;
    issues?: { errors?: unknown[]; properties?: Record<string, { errors?: unknown[] }> };
  };
}

function firstZodIssue(body: NestErrorBody): string | null {
  const properties = body.error?.issues?.properties;
  if (!properties) {
    return null;
  }
  for (const field of Object.values(properties)) {
    const [message] = field.errors ?? [];
    if (typeof message === 'string') {
      return message;
    }
  }
  return null;
}

/** Приводит любую ошибку запроса к строке, которую не стыдно показать в тосте. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    // Сюда попадают сетевые сбои fetch: api не поднят, DNS, обрыв соединения.
    return FALLBACK;
  }

  if (error.status >= 500) {
    return FALLBACK;
  }

  const body = error.body as NestErrorBody | null;
  const issue = firstZodIssue(body ?? {});
  if (issue) {
    return issue;
  }

  const message = body?.error?.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }

  return FALLBACK;
}

/**
 * Тело grouped-ошибки `ValidationPipe` (`errorFormat: 'grouped'`, см. `main.ts`):
 * `error.message` — не строка, а объект `{ поле: [сообщения] }`. Используется
 * DTO-роутами (категории, транзакции), в отличие от Zod-роутов auth.
 */
export function extractFieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return null;
  }
  const body = error.body as NestErrorBody | null;
  const message = body?.error?.message;
  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    return null;
  }
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(message as Record<string, unknown>)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      result[field] = messages[0];
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
