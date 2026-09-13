import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { LogoutButton } from '@/features/auth/ui/logout-button';
import { ROUTES } from '@/shared/config/routes';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Дублирует проверку из proxy.ts: proxy — оптимистичный фильтр по куке, а рендер
  // страницы должен сам убедиться, что сессия есть.
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  // TODO: сайдбар с навигацией по разделам.
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-end border-b px-6 py-3">
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
