'use client';

import { useState, type MouseEvent } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import type { Category } from '@expense/shared';
import { deleteCategoryAction } from '@/features/category-form/api/delete-category.action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

interface CategoryDeleteDialogProps {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryDeleteDialog({ category, open, onOpenChange }: CategoryDeleteDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async (event: MouseEvent) => {
    // Radix закрывает AlertDialog сразу после клика — без preventDefault блокировку удаления
    // (добавляется отдельной задачей) не удастся удержать открытой до ответа сервера.
    event.preventDefault();
    setIsPending(true);
    const result = await deleteCategoryAction(category.id);
    setIsPending(false);

    if (result && 'error' in result) {
      toast.error(result.error);
      onOpenChange(false);
      return;
    }

    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить категорию «{category.name}»?</AlertDialogTitle>
          <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
