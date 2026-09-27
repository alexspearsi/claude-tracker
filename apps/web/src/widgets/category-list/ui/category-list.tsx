'use client';

import { useState } from 'react';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import type { Category } from '@expense/shared';
import { CategoryDeleteDialog } from '@/features/category-form/ui/category-delete-dialog';
import { CategoryForm } from '@/features/category-form/ui/category-form';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
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
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {categories.map((category) => (
              <article
                key={category.id}
                className="lg-glass flex flex-col gap-4 rounded-3xl p-5"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex size-11 items-center justify-center rounded-2xl"
                    style={{ background: `${category.color}22` }}
                  >
                    <span
                      className="inline-block size-3.5 rounded-full"
                      style={{ backgroundColor: category.color, boxShadow: `0 0 0 3px ${category.color}33` }}
                    />
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Редактировать ${category.name}`}
                      onClick={() => setFormTarget(category)}
                    >
                      <PencilIcon className="size-[17px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-[var(--expense)] hover:text-[var(--expense)]"
                      aria-label={`Удалить ${category.name}`}
                      onClick={() => setDeleteTarget(category)}
                    >
                      <Trash2Icon className="size-[17px]" />
                    </Button>
                  </div>
                </div>
                <span className="truncate text-lg font-extrabold tracking-tight">{category.name}</span>
              </article>
            ))}
          </div>
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
