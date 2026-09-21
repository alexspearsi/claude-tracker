import { CategoryDot } from '@/entities/category/ui/category-dot';
import { TransactionAmount } from '@/entities/transaction/ui/transaction-amount';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import type { SummaryCategoryItem } from '@/entities/transaction/model/types';

interface SummaryCategoryTableProps {
  items: SummaryCategoryItem[];
}

/** Строки уже отсортированы сервером по убыванию total — повторно не сортируем. */
export function SummaryCategoryTable({ items }: SummaryCategoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Категория</TableHead>
          <TableHead className="text-right">Сумма</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          // categoryId одной категории может повториться — groupBy(['categoryId', 'type'])
          // на api даёт отдельную строку для дохода и расхода одной категории в одном месяце.
          <TableRow key={`${item.categoryId}-${item.type}`}>
            <TableCell>
              <span className="flex items-center gap-2">
                <CategoryDot color={item.color} />
                {item.name}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <TransactionAmount amount={item.total} type={item.type} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
