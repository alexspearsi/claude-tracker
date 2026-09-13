import type { Metadata } from 'next';
import { RegisterView } from '@/views/register/ui/register-view';

export const metadata: Metadata = {
  title: 'Регистрация — Трекер расходов',
};

export default function RegisterPage() {
  return <RegisterView />;
}
