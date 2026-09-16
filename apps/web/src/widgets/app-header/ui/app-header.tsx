import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { getCurrentUser } from '@/entities/user/api/get-current-user';
import { userDisplayName } from '@/entities/user/lib/display-name';
import { LogoutButton } from '@/features/auth/ui/logout-button';
import { ApiError } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/config/routes';
import { MainNav } from '@/widgets/app-header/ui/main-nav';

type DisplayNameResult = { status: 'ok'; name: string } | { status: 'unauthorized' };

/**
 * Обновить токен здесь нельзя (cookies().set недоступен в RSC) — обновление уже
 * сделал proxy.ts до рендера, поэтому 401 на этом этапе означает мёртвую сессию.
 * Прочая ошибка /users/me не должна ронять всю шапку — остаётся плейсхолдер.
 */
async function loadDisplayName(accessToken: string): Promise<DisplayNameResult> {
  try {
    const profile = await getCurrentUser(accessToken);
    return { status: 'ok', name: userDisplayName(profile) };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'unauthorized' };
    }
    return { status: 'ok', name: 'Профиль' };
  }
}

/** Шапка дашборда: логотип, горизонтальное меню, имя пользователя, выход. */
export async function AppHeader() {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  const result = await loadDisplayName(session.accessToken);
  // redirect — на верхнем уровне компонента, вне try/catch: он бросает NEXT_REDIRECT,
  // а catch в loadDisplayName его бы проглотил. На /session-expired, а не /login
  // напрямую: там куки физически чистятся (route.ts) — иначе мёртвая access-кука
  // осталась бы на месте, и proxy.ts тут же увёл бы с /login обратно на /dashboard.
  if (result.status === 'unauthorized') {
    redirect(ROUTES.sessionExpired);
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="font-semibold">Трекер расходов</span>
        <MainNav />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{result.name}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
