const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  accessToken?: string;
}

/** Тонкая обёртка над fetch: базовый URL, JSON, Bearer-токен, единый разбор ошибок. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
  });

  const body: unknown = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new ApiError(`Запрос ${path} завершился ошибкой ${response.status}`, response.status, body);
  }

  return body as T;
}
