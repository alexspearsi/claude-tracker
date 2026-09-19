import type { Transaction } from '@/entities/transaction/model/types';

/**
 * Строка таблицы: транзакция + склеенные имя/цвет категории. Виджет — единственное
 * место, которому разрешено знать про обе entity сразу (транзакции и категории).
 */
export interface TransactionRowModel extends Transaction {
  categoryName: string;
  categoryColor: string;
}
