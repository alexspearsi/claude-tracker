import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/entities/session/api/session';
import { getCurrentUser } from '@/entities/user/api/get-current-user';
import { userDisplayName } from '@/entities/user/lib/display-name';
import { LogoutButton } from '@/features/auth/ui/logout-button';
import { ApiError } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/config/routes';
import { Logo } from '@/shared/ui/logo';
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

  const initial = result.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <header className="lg-glass-pill fixed top-6 right-8 left-8 z-40 flex h-[72px] items-center justify-between gap-4 rounded-full px-5 py-0 pl-5">
      <div className="flex items-center gap-7">
        <Link href={ROUTES.dashboard}>
          <Logo size="sm" />
        </Link>
        <MainNav />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 rounded-full border border-white/60 bg-white/35 py-1 pr-3.5 pl-1 dark:border-white/15 dark:bg-white/10">
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#60a5fa] text-[13px] font-extrabold text-white">
            {initial}
          </div>
          <span className="text-sm font-semibold">{result.name}</span>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
