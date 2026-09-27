import { PencilIcon, Trash2Icon } from 'lucide-react';
import { CategoryDot } from '@/entities/category/ui/category-dot';
import { TransactionAmount } from '@/entities/transaction/ui/transaction-amount';
import { formatDate } from '@/shared/lib/format-date';
import { Button } from '@/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import type { ExpenseRowModel } from '@/widgets/expenses-list/model/types';

interface ExpensesTableProps {
  rows: ExpenseRowModel[];
  onEdit: (row: ExpenseRowModel) => void;
  onDelete: (row: ExpenseRowModel) => void;
}

export function ExpensesTable({ rows, onEdit, onDelete }: ExpensesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Дата</TableHead>
          <TableHead>Категория</TableHead>
          <TableHead>Описание</TableHead>
          <TableHead className="text-right">Сумма</TableHead>
          <TableHead className="sr-only">Действия</TableHead>
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
            {/* Ширина ограничена явно — иначе truncate не активируется (см. фазу 1,
                где ячейка без max-w растягивала строку вместо усечения текста). */}
            <TableCell className="max-w-[16rem] truncate text-muted-foreground" title={row.description ?? undefined}>
              {row.description ?? '—'}
            </TableCell>
            <TableCell className="text-right">
              <TransactionAmount amount={row.amount} type={row.type} />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Редактировать"
                  onClick={() => onEdit(row)}
                >
                  <PencilIcon className="size-[17px]" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-[var(--expense)] hover:text-[var(--expense)]"
                  aria-label="Удалить"
                  onClick={() => onDelete(row)}
                >
                  <Trash2Icon className="size-[17px]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
