import Link from 'next/link';
import { ROUTES } from '@/shared/config/routes';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold">Трекер расходов</h1>
      <p className="text-sm opacity-70">
        Каркас проекта. Дальше — экраны трат, категорий и аналитики.
      </p>
      <div className="flex gap-3">
        <Link href={ROUTES.login} className="underline">
          Вход
        </Link>
        <Link href={ROUTES.register} className="underline">
          Регистрация
        </Link>
        <Link href={ROUTES.dashboard} className="underline">
          Кабинет
        </Link>
      </div>
    </main>
  );
}
