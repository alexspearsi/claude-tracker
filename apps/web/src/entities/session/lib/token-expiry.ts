// Запасные сроки на случай, если payload токена прочитать не удалось.
// Совпадают с JWT_ACCESS_TTL=15m и JWT_REFRESH_TTL=30d в apps/api/.env.
const FALLBACK_ACCESS_TTL_MS = 15 * 60 * 1000;
const FALLBACK_REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type TokenKind = 'access' | 'refresh';

const FALLBACK_TTL_MS: Record<TokenKind, number> = {
  access: FALLBACK_ACCESS_TTL_MS,
  refresh: FALLBACK_REFRESH_TTL_MS,
};

/**
 * Срок жизни куки берётся из поля `exp` самого JWT, а не из константы: иначе TTL пришлось бы
 * держать синхронным с JWT_ACCESS_TTL/JWT_REFRESH_TTL в api вручную. Подпись здесь не
 * проверяется — это и не нужно: токен всё равно проверяет api, а payload нужен только чтобы
 * браузер выбросил куку тогда же, когда протухнет токен.
 */
export function tokenExpiresAt(token: string, kind: TokenKind): Date {
  const fallback = new Date(Date.now() + FALLBACK_TTL_MS[kind]);
  const payload = token.split('.')[1];
  if (!payload) {
    return fallback;
  }

  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const { exp } = JSON.parse(json) as { exp?: unknown };
    if (typeof exp !== 'number') {
      return fallback;
    }
    return new Date(exp * 1000);
  } catch {
    return fallback;
  }
}
