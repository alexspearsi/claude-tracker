import type { Metadata } from 'next';
import { DashboardView } from '@/views/dashboard/ui/dashboard-view';
import { parsePage } from '@/shared/lib/pagination';

export const metadata: Metadata = { title: 'Главная — Трекер расходов' };

interface DashboardPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { page } = await searchParams;
  return <DashboardView page={parsePage(page)} />;
}
