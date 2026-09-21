import type { Metadata } from 'next';
import { ExpensesView } from '@/views/expenses/ui/expenses-view';

export const metadata: Metadata = { title: 'Транзакции — Трекер расходов' };

interface ExpensesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Разбор page/фильтров остаётся во вью — страница слоя app держится в пять строк тела,
// как требует конвенция FSD этого проекта.
export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  return <ExpensesView searchParams={await searchParams} />;
}
