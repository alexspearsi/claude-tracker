'use client';

import { useState } from 'react';
import type { Category } from '@expense/shared';
import { CategoryDot } from '@/entities/category/ui/category-dot';
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

interface CategoryListProps {
  categories: Category[];
}

/** Клиентская граница среза категорий — держит состояние открытия диалогов. */
export function CategoryList({ categories }: CategoryListProps) {
  // План 01-02 расширит тип до Category | 'create' | null.
  const [formTarget, setFormTarget] = useState<'create' | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Категории</CardTitle>
        <Button onClick={() => setFormTarget('create')}>Создать категорию</Button>
      </CardHeader>
      <CardContent>
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
                <TableCell>
                  <span className="flex items-center gap-2">
                    <CategoryDot color={category.color} />
                    <span className="truncate">{category.name}</span>
                  </span>
                </TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {formTarget !== null && (
        <CategoryForm
          key={formTarget}
          open
          onOpenChange={(next) => {
            if (!next) {
              setFormTarget(null);
            }
          }}
        />
      )}
    </Card>
  );
}
