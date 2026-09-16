import { CategoryDot } from '@/entities/category/ui/category-dot';
import { TransactionAmount } from '@/entities/transaction/ui/transaction-amount';
import { formatDate } from '@/shared/lib/format-date';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import type { TransactionRowModel } from '@/widgets/recent-transactions/model/types';

interface TransactionsTableProps {
  rows: TransactionRowModel[];
}

export function TransactionsTable({ rows }: TransactionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Дата</TableHead>
          <TableHead>Категория</TableHead>
          <TableHead>Описание</TableHead>
          <TableHead className="text-right">Сумма</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="text-muted-foreground">{formatDate(row.date)}</TableCell>
            <TableCell>
              <span className="flex items-center gap-2">
                <CategoryDot color={row.categoryColor} />
                {row.categoryName}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.description ?? '—'}</TableCell>
            <TableCell className="text-right">
              <TransactionAmount amount={row.amount} type={row.type} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
