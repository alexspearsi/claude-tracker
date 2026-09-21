import Link from 'next/link';
import { LoginForm } from '@/features/auth/ui/login-form';
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

export function LoginView() {
  return (
    <div className="flex flex-col items-center gap-7">
      <Logo />
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Доходы и расходы по категориям — в одном месте.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="justify-center text-sm font-semibold text-muted-foreground">
          <span>
            Нет аккаунта?{' '}
            <Link href={ROUTES.register} className="text-primary underline-offset-4 hover:underline">
              Регистрация
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
