import { LogOutIcon } from 'lucide-react';
import { logoutAction } from '@/features/auth/api/logout.action';
import { Button } from '@/shared/ui/button';

/** Серверный компонент: форма вызывает Server Action напрямую, клиентский JS не нужен. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        <LogOutIcon className="size-4" />
        Выйти
      </Button>
    </form>
  );
}
