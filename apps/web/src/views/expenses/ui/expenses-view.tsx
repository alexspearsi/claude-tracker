import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { ROUTES } from '@/shared/config/routes';
import { loadTransactions } from '@/widgets/expenses-list/api/load-transactions';
import { ExpensesList } from '@/widgets/expenses-list/ui/expenses-list';

interface ExpensesViewProps {
  page: number;
}

export async function ExpensesView({ page }: ExpensesViewProps) {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  const result = await loadTransactions(session.accessToken, { page });

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
