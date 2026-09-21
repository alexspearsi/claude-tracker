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
  // При 409 (категория используется) диалог остаётся открытым с сообщением внутри —
  // не тостом и не молчаливым закрытием (D-06).
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const handleConfirm = async (event: MouseEvent) => {
    // Radix закрывает AlertDialog сразу после клика — без preventDefault ветка блокировки
    // не сможет удержать диалог открытым до ответа сервера.
    event.preventDefault();
    setBlockedMessage(null);
    setIsPending(true);
    const result = await deleteCategoryAction(category.id);
    setIsPending(false);

    if (result && 'error' in result) {
      if (result.blocked) {
        setBlockedMessage('Нельзя удалить категорию — есть связанные транзакции');
        return;
      }
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
        {blockedMessage ? <p className="text-sm text-destructive">{blockedMessage}</p> : null}
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
