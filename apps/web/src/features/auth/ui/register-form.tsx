'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { registerAction } from '@/features/auth/api/register.action';
import {
  registerFormSchema,
  type RegisterFormValues,
} from '@/features/auth/model/register-form-schema';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { ROUTES } from '@/shared/config/routes';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

export function RegisterForm() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '', password: '', name: '', agreeToTerms: false },
  });

  const onSubmit = form.handleSubmit(async ({ email, password, name }) => {
    const trimmed = name.trim();
    const result = await registerAction({
      email,
      password,
      // Пустое имя api ждёт как отсутствующее поле, а не как пустую строку.
      ...(trimmed ? { name: trimmed } : {}),
    });
    if (result?.error) {
      toast.error(result.error);
    }
  });

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Имя (необязательно)</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Как к вам обращаться" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="agreeToTerms"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                </FormControl>
                <FormLabel className="!text-foreground block text-sm leading-normal font-normal">
                  Согласен с{' '}
                  <Link
                    href={ROUTES.terms}
                    target="_blank"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    пользовательским соглашением
                  </Link>{' '}
                  и{' '}
                  <Link
                    href={ROUTES.privacy}
                    target="_blank"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    политикой обработки данных
                  </Link>
                </FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
          Создать аккаунт
        </Button>
      </form>
    </Form>
  );
}
