'use client';

import { useState } from 'react';
import type { Category } from '@expense/shared';
import { CategoryDot } from '@/entities/category/ui/category-dot';
import { CategoryDeleteDialog } from '@/features/category-form/ui/category-delete-dialog';
import { CategoryForm } from '@/features/category-form/ui/category-form';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import { EmptyState } from '@/widgets/category-list/ui/empty-state';

interface CategoryListProps {
  categories: Category[];
}

/** Клиентская граница среза категорий — держит состояние открытия диалогов. */
export function CategoryList({ categories }: CategoryListProps) {
  const [formTarget, setFormTarget] = useState<Category | 'create' | null>(null);
  // Отдельное от formTarget — форма и подтверждение удаления открываются независимо.
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Категории</CardTitle>
        <Button onClick={() => setFormTarget('create')}>Создать категорию</Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <EmptyState
            title="Пока нет категорий"
            description="Создайте первую категорию, чтобы группировать доходы и расходы"
            action={<Button onClick={() => setFormTarget('create')}>Создать категорию</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Категория</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="w-full max-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryDot color={category.color} />
                      <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormTarget(category)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(category)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {formTarget !== null && (
        <CategoryForm
          key={formTarget === 'create' ? 'create' : formTarget.id}
          category={formTarget === 'create' ? undefined : formTarget}
          open
          onOpenChange={(next) => {
            if (!next) {
              setFormTarget(null);
            }
          }}
        />
      )}

      {deleteTarget !== null && (
        <CategoryDeleteDialog
          key={deleteTarget.id}
          category={deleteTarget}
          open
          onOpenChange={(next) => {
            if (!next) {
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </Card>
  );
}
