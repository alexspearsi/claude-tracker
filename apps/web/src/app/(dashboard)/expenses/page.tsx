import type { Metadata } from 'next';
import { ExpensesView } from '@/views/expenses/ui/expenses-view';
import { parsePage } from '@/shared/lib/pagination';

export const metadata: Metadata = { title: 'Транзакции — Трекер расходов' };

interface ExpensesPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const { page } = await searchParams;
  return <ExpensesView page={parsePage(page)} />;
}
