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
