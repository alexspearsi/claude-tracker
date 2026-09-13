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

export function LoginView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Вход</CardTitle>
        <CardDescription>Войдите, чтобы вести учёт трат</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          Нет аккаунта?{' '}
          <Link href={ROUTES.register} className="text-primary underline-offset-4 hover:underline">
            Зарегистрироваться
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
