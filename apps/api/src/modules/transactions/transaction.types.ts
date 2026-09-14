import type { TransactionType } from '../../generated/prisma/enums.js';

export interface TransactionDto {
  id: string;
  amount: string; // Decimal → строка, инвариант проекта
  type: TransactionType;
  description: string | null;
  date: string; // ISO
  categoryId: string;
  createdAt: string; // ISO
}

/** Список с пагинацией: total — количество по тем же фильтрам, без limit/offset. */
export interface TransactionListDto {
  items: TransactionDto[];
  total: number;
}

export interface SummaryCategoryItem {
  categoryId: string;
  name: string;
  color: string;
  type: TransactionType;
  total: string;
}

export interface TransactionSummary {
  month: number;
  year: number;
  from: string; // включительно
  to: string; // исключительно — первое число следующего месяца
  income: string;
  expense: string;
  balance: string; // income - expense, может быть отрицательным
  byCategory: SummaryCategoryItem[];
}
