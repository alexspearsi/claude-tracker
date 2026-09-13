import type { Metadata } from 'next';
import { Toaster } from '@/shared/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Трекер расходов',
  description: 'Учёт личных трат по категориям',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
