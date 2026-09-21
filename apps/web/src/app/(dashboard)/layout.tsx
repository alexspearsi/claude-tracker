import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { ROUTES } from '@/shared/config/routes';
import { BlobBackground } from '@/shared/ui/blob-background';
import { AppHeader } from '@/widgets/app-header/ui/app-header';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Дублирует проверку из proxy.ts: proxy — оптимистичный фильтр по куке, а рендер
  // страницы должен сам убедиться, что сессия есть.
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <BlobBackground />
      <AppHeader />
      <div className="flex-1 px-8 pt-[128px] pb-10">
        <div className="mx-auto flex max-w-[1216px] flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}
