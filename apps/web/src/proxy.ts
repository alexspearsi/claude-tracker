import { NextResponse, type NextRequest } from 'next/server';
import {
  clearSessionCookies,
  exchangeRefreshToken,
  setSessionCookies,
} from '@/entities/session/api/proxy-session';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/entities/session/model/cookies';
import { GUEST_ROUTES, PROTECTED_ROUTES, ROUTES } from '@/shared/config/routes';

function isProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isGuestOnly(pathname: string): boolean {
  return GUEST_ROUTES.includes(pathname as (typeof GUEST_ROUTES)[number]);
}

/** Куда пустить пользователя с сессией `hasSession`. */
function decide(request: NextRequest, hasSession: boolean): NextResponse {
  const { pathname } = request.nextUrl;

  if (isProtected(pathname) && !hasSession) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }
  if (isGuestOnly(pathname) && hasSession) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url));
  }
  return NextResponse.next();
}

/**
 * В Next 16 конвенция middleware переименована в proxy.
 *
 * Пока access-кука жива, проверка оптимистичная — только её наличие, без запроса к api
 * (proxy выполняется на каждый запрос). Настоящую проверку токена делает JwtAuthGuard.
 *
 * Access живёт 15 минут, refresh — 30 дней, поэтому исчезновение access-куки ещё не значит,
 * что пользователь разлогинен: здесь единственное место навигации, где можно и прочитать
 * refresh-куку, и записать новую пару в ответ. Без этого пользователя выбрасывало бы
 * в `/login` каждые 15 минут.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (hasAccess || !refreshToken) {
    return decide(request, hasAccess);
  }

  // Access протух, но refresh на месте — меняем пару.
  const tokens = await exchangeRefreshToken(refreshToken);
  if (!tokens) {
    // Refresh недействителен или api недоступен: чистим куки, чтобы не дёргать
    // /auth/refresh на каждом следующем запросе.
    const response = decide(request, false);
    clearSessionCookies(response);
    return response;
  }

  const response = decide(request, true);
  setSessionCookies(response, tokens);
  return response;
}

export const config = {
  matcher: [
    {
      // Статика, картинки и файлы с расширением мимо proxy — иначе он будет резать CSS и JS.
      source: '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
      // Префетчи Next ходят по тем же адресам в фоне. Обмен refresh-токена отзывает старый,
      // поэтому префетч параллельно с настоящей навигацией уронил бы сессию. Отличить их
      // внутри функции нельзя: Next вырезает `next-router-prefetch` и `rsc` из
      // request.headers, чтобы RSC-запрос не обработали иначе, чем HTML. Зато matcher
      // умеет отсеять их до вызова — сессию на префетче всё равно проверит
      // app/(dashboard)/layout.tsx при рендере.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
