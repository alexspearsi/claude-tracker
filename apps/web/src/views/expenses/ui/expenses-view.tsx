import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { ROUTES } from '@/shared/config/routes';
import { parsePage } from '@/shared/lib/pagination';
import { loadTransactions } from '@/widgets/expenses-list/api/load-transactions';
import { parseTransactionFilters } from '@/widgets/expenses-list/model/filters';
import { ExpensesList } from '@/widgets/expenses-list/ui/expenses-list';

interface ExpensesViewProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function ExpensesView({ searchParams }: ExpensesViewProps) {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  const page = parsePage(searchParams.page);
  const filters = parseTransactionFilters(searchParams);
  const result = await loadTransactions(session.accessToken, { page, filters });

  // redirect — вне try/catch по смыслу не нужен здесь: результат уже вычислен.
  if (result.status === 'unauthorized') {
    redirect(ROUTES.sessionExpired);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Транзакции</h1>
      {result.status === 'error' ? (
        <p className="text-sm text-destructive">Не удалось загрузить транзакции: {result.message}</p>
      ) : (
        <ExpensesList rows={result.rows} total={result.total} page={page} categories={result.categories} />
      )}
    </main>
  );
}
