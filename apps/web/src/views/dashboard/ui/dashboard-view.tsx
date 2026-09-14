import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { getCurrentUser } from '@/entities/user/api/get-current-user';
import { userDisplayName } from '@/entities/user/lib/display-name';
import { ROUTES } from '@/shared/config/routes';
import { loadRecentTransactions } from '@/widgets/recent-transactions/api/load-recent-transactions';
import { RecentTransactions } from '@/widgets/recent-transactions/ui/recent-transactions';

interface DashboardViewProps {
  page: number;
}

export async function DashboardView({ page }: DashboardViewProps) {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  const [result, profile] = await Promise.all([
    loadRecentTransactions(session.accessToken, page),
    // Профиль уже запросила шапка (AppHeader) — cache() дедуплицирует вызов в
    // пределах рендера, второй сетевой запрос не уходит. .catch: приветствие
    // необязательно, ошибка здесь не должна ронять страницу.
    getCurrentUser(session.accessToken).catch(() => null),
  ]);

  // redirect — вне try/catch: результат уже вычислен, catch тут ни при чём.
  if (result.status === 'unauthorized') {
    redirect(ROUTES.login);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">
        {profile ? `Привет, ${userDisplayName(profile)}!` : 'Главная'}
      </h1>

      {result.status === 'error' ? (
        <p className="text-sm text-destructive">Не удалось загрузить транзакции: {result.message}</p>
      ) : (
        <RecentTransactions
          rows={result.rows}
          total={result.total}
          page={page}
          basePath={ROUTES.dashboard}
        />
      )}
    </main>
  );
}
