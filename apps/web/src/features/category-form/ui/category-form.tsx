'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createCategorySchema, type Category, type CreateCategoryInput } from '@expense/shared';
import { createCategoryAction } from '@/features/category-form/api/create-category.action';
import { CATEGORY_COLORS } from '@/features/category-form/model/palette';
import type { CategoryFormValues } from '@/features/category-form/model/types';
import { ColorSwatchPicker } from '@/features/category-form/ui/color-swatch-picker';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';

interface CategoryFormProps {
  /** undefined → создание; заполненный → редактирование (D-02). В этом плане вызывающая
   *  сторона передаёт только undefined — ветка редактирования включается планом 01-02. */
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryForm({ category, open, onOpenChange }: CategoryFormProps) {
  const form = useForm<CategoryFormValues, unknown, CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category ?? { name: '', color: CATEGORY_COLORS[0] },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = await createCategoryAction(values);

    // CategoryActionState — не дискриминированный по общему полю union, поэтому
    // сужаем через 'in', а не через result?.error (последнее не типизируется).
    if (result && 'error' in result) {
      toast.error(result.error);
      return;
    }

    form.reset();
    onOpenChange(false);
  });

  const { isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новая категория</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input maxLength={50} autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Цвет</FormLabel>
                  <FormControl>
                    <ColorSwatchPicker
                      value={field.value ?? CATEGORY_COLORS[0]}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
              Создать
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
