import type { Metadata } from 'next';
import { LoginView } from '@/views/login/ui/login-view';

export const metadata: Metadata = {
  title: 'Вход — Трекер расходов',
};

export default function LoginPage() {
  return <LoginView />;
}
