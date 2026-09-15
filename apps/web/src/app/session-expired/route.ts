import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookies } from '@/entities/session/api/proxy-session';
import { ROUTES } from '@/shared/config/routes';

/**
 * Чистит куки сессии и уводит на /login. Отдельный Route Handler, а не redirect()
 * напрямую из компонента: `cookies().delete()` разрешён только в Server Action или
 * Route Handler (документация Next 16), в Server Component при рендере он бросает
 * ошибку. Без физической очистки кук `proxy.ts` увидел бы на /login ту же (мёртвую)
 * access-куку и как isGuestOnly сразу увёл бы обратно на /dashboard — бесконечный
 * цикл редиректов. Используется из AppHeader и DashboardView при 401 от api.
 */
export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(ROUTES.login, request.url));
  clearSessionCookies(response);
  return response;
}
