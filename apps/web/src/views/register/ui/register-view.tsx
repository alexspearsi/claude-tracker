import Link from 'next/link';
import { RegisterForm } from '@/features/auth/ui/register-form';
import { ROUTES } from '@/shared/config/routes';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Logo } from '@/shared/ui/logo';

export function RegisterView() {
  return (
    <div className="flex flex-col items-center gap-7">
      <Logo />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Регистрация</CardTitle>
          <CardDescription>Создайте аккаунт трекера расходов</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        <CardFooter className="justify-center text-sm font-semibold text-muted-foreground">
          <span>
            Уже есть аккаунт?{' '}
            <Link href={ROUTES.login} className="text-primary underline-offset-4 hover:underline">
              Войти
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
