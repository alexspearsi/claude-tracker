// Зеркало apps/api/src/modules/transactions/transaction.types.ts — менять оба места.
// Дублируется локально, а не в @expense/shared: дашборд только читает данные, форм
// с zodResolver для транзакций пока нет, а Zod-схема стала бы третьим источником
// правды рядом с DTO на class-validator и типами api (см. CLAUDE.md).
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  amount: string; // Decimal → строка, инвариант проекта
  type: TransactionType;
  description: string | null;
  date: string; // ISO
  categoryId: string;
  createdAt: string; // ISO
}

export interface TransactionList {
  items: Transaction[];
  total: number;
}

/** Тело POST /transactions — зеркало CreateTransactionDto. */
export interface CreateTransactionInput {
  amount: string;
  type: TransactionType;
  categoryId: string;
  date: string; // полный ISO-таймстамп, полдень UTC — см. transaction-form.tsx
  description?: string | null;
}

/** Тело PATCH /transactions/:id — все поля необязательны. */
export type UpdateTransactionInput = Partial<CreateTransactionInput>;
