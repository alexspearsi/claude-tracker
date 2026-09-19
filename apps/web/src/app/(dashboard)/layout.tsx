import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { ROUTES } from '@/shared/config/routes';
import { AppHeader } from '@/widgets/app-header/ui/app-header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Дублирует проверку из proxy.ts: proxy — оптимистичный фильтр по куке, а рендер
  // страницы должен сам убедиться, что сессия есть.
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      {children}
    </div>
  );
}
