import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { getCurrentUser } from '@/entities/user/api/get-current-user';
import { userDisplayName } from '@/entities/user/lib/display-name';
import { ROUTES } from '@/shared/config/routes';
import { loadMonthlySummary } from '@/widgets/monthly-summary/api/load-monthly-summary';
import { CategoryBreakdown, SummaryStats } from '@/widgets/monthly-summary/ui/monthly-summary';
import { QuickAddTransaction } from '@/widgets/quick-add-transaction/ui/quick-add-transaction';
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

  const [result, summaryResult, profile] = await Promise.all([
    loadRecentTransactions(session.accessToken, page),
    loadMonthlySummary(session.accessToken),
    // Профиль уже запросила шапка (AppHeader) — cache() дедуплицирует вызов в
    // пределах рендера, второй сетевой запрос не уходит. .catch: приветствие
    // необязательно, ошибка здесь не должна ронять страницу.
    getCurrentUser(session.accessToken).catch(() => null),
  ]);

  // redirect — вне try/catch: результат уже вычислен, catch тут ни при чём.
  // На /session-expired, а не /login: там куки физически чистятся — см. комментарий
  // в widgets/app-header/ui/app-header.tsx и app/session-expired/route.ts.
  if (result.status === 'unauthorized' || summaryResult.status === 'unauthorized') {
    redirect(ROUTES.sessionExpired);
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-tight">
          {profile ? `Привет, ${userDisplayName(profile)}!` : 'Главная'}
        </h1>
        <p className="text-base font-semibold text-foreground/65">Сводка за месяц</p>
      </div>

      {summaryResult.status === 'error' ? (
        <p className="text-sm text-destructive">Не удалось загрузить сводку: {summaryResult.message}</p>
      ) : (
        <SummaryStats summary={summaryResult.summary} />
      )}

      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start gap-5">
        {result.status === 'error' ? (
          <p className="text-sm text-destructive">Не удалось загрузить данные: {result.message}</p>
        ) : (
          <RecentTransactions
            rows={result.rows}
            total={result.total}
            page={page}
            basePath={ROUTES.dashboard}
            headerAction={<QuickAddTransaction categories={result.categories} />}
          />
        )}
        {summaryResult.status !== 'error' && <CategoryBreakdown summary={summaryResult.summary} />}
      </div>
    </>
  );
}
