import type { Transaction } from '@/entities/transaction/model/types';

/** Транзакция со склеенными именем и цветом категории — локальная копия роли
 *  TransactionRowModel из widgets/recent-transactions: склейка данных двух entity —
 *  зона ответственности виджета, кросс-импорт entities/transaction -> entities/category
 *  запрещён. */
export interface ExpenseRowModel extends Transaction {
  categoryName: string;
  categoryColor: string;
}
